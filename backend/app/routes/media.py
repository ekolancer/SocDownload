from __future__ import annotations

import io
import os
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import delete, select

from ..config import ROOT, get_settings
from ..db import AlbumMediaItem, MediaFile, MediaItem, get_session_factory

router = APIRouter(prefix="/api/media", tags=["media"])


class BatchMediaPayload(BaseModel):
    media_ids: list[int]


class ToggleFavoritePayload(BaseModel):
    is_favorite: bool | None = None


@router.get("")
def list_media(
    platform: str | None = None,
    creator: str | None = None,
    is_favorite: bool | None = None,
    limit: int = 500,
):
    factory = get_session_factory()
    with factory() as session:
        stmt = select(MediaItem).order_by(MediaItem.created_at.desc()).limit(limit)
        if platform and platform != "all":
            stmt = stmt.where(MediaItem.platform == platform)
        if creator:
            stmt = stmt.where(MediaItem.username == creator)
        if is_favorite is not None:
            stmt = stmt.where(MediaItem.is_favorite == is_favorite)

        items = session.scalars(stmt).all()
        results = []
        for i in items:
            files = session.scalars(select(MediaFile).where(MediaFile.media_item_id == i.id)).all()
            file_list = []
            for f in files:
                file_list.append({
                    "id": f.id,
                    "kind": f.kind,
                    "url": f"/api/media/files/{f.id}",
                    "name": Path(f.path).name,
                    "path": f.path,
                })
            results.append({
                "id": i.id,
                "platform": i.platform,
                "source_url": i.source_url,
                "username": i.username,
                "caption": i.caption,
                "is_favorite": bool(i.is_favorite),
                "posted_at": i.posted_at.isoformat() if i.posted_at else None,
                "created_at": i.created_at.isoformat() if i.created_at else None,
                "files": file_list,
            })
        return results


@router.get("/files/{file_id}")
def serve_media_file(file_id: int):
    factory = get_session_factory()
    with factory() as session:
        mf = session.get(MediaFile, file_id)
        if not mf:
            raise HTTPException(status_code=404, detail="file not found")

        settings = get_settings()
        media_root = Path(settings.media_root).resolve()
        if not media_root.is_absolute():
            media_root = (ROOT / media_root).resolve()

        file_path = Path(mf.path).resolve()
        try:
            file_path.relative_to(media_root)
        except ValueError:
            raise HTTPException(status_code=403, detail="path traversal")

        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="file missing")

        media_type = "image"
        if mf.kind == "video":
            media_type = "video"
        return FileResponse(file_path, media_type=f"{media_type}/*", filename=file_path.name)


@router.patch("/{item_id}/favorite")
def toggle_favorite(item_id: int, payload: ToggleFavoritePayload | None = None):
    factory = get_session_factory()
    with factory() as session:
        item = session.get(MediaItem, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Media item not found")

        if payload and payload.is_favorite is not None:
            item.is_favorite = payload.is_favorite
        else:
            item.is_favorite = not bool(item.is_favorite)

        session.commit()
        return {"id": item.id, "is_favorite": item.is_favorite}


@router.delete("/{item_id}")
def delete_media_item(item_id: int):
    factory = get_session_factory()
    with factory() as session:
        item = session.get(MediaItem, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Media item not found")

        # 1. Fetch all associated media files
        files = session.scalars(select(MediaFile).where(MediaFile.media_item_id == item.id)).all()

        # 2. Delete physical files from disk (cascade disk delete)
        parent_dirs: set[Path] = set()
        for f in files:
            p = Path(f.path)
            if p.is_file():
                try:
                    parent_dirs.add(p.parent)
                    p.unlink(missing_ok=True)
                except Exception:
                    pass
            session.delete(f)

        # 3. Clean up directory metadata sidecar & empty folder
        for pdir in parent_dirs:
            try:
                meta_json = pdir / "metadata.json"
                if meta_json.is_file():
                    meta_json.unlink(missing_ok=True)
                if pdir.is_dir() and not any(pdir.iterdir()):
                    pdir.rmdir()
            except Exception:
                pass

        # 4. Clean junction entries in album_media_items
        session.execute(delete(AlbumMediaItem).where(AlbumMediaItem.media_item_id == item.id))

        # 5. Cascade delete MediaItem record from DB
        session.delete(item)
        session.commit()

        return {"deleted": True, "id": item_id}


@router.post("/batch-delete")
def batch_delete_media(payload: BatchMediaPayload):
    if not payload.media_ids:
        return {"deleted_count": 0}

    deleted_count = 0
    factory = get_session_factory()
    with factory() as session:
        items = session.scalars(
            select(MediaItem).where(MediaItem.id.in_(payload.media_ids))
        ).all()

        parent_dirs: set[Path] = set()
        for item in items:
            files = session.scalars(select(MediaFile).where(MediaFile.media_item_id == item.id)).all()
            for f in files:
                p = Path(f.path)
                if p.is_file():
                    try:
                        parent_dirs.add(p.parent)
                        p.unlink(missing_ok=True)
                    except Exception:
                        pass
                session.delete(f)

            session.execute(delete(AlbumMediaItem).where(AlbumMediaItem.media_item_id == item.id))
            session.delete(item)
            deleted_count += 1

        for pdir in parent_dirs:
            try:
                meta_json = pdir / "metadata.json"
                if meta_json.is_file():
                    meta_json.unlink(missing_ok=True)
                if pdir.is_dir() and not any(pdir.iterdir()):
                    pdir.rmdir()
            except Exception:
                pass

        session.commit()
        return {"deleted_count": deleted_count}


@router.post("/batch-zip")
def batch_zip_media(payload: BatchMediaPayload):
    if not payload.media_ids:
        raise HTTPException(status_code=400, detail="No media IDs specified")

    factory = get_session_factory()
    with factory() as session:
        files = session.scalars(
            select(MediaFile).where(MediaFile.media_item_id.in_(payload.media_ids))
        ).all()

        if not files:
            raise HTTPException(status_code=404, detail="No files found for specified items")

        # Create in-memory zip file
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            seen_names: dict[str, int] = {}
            for f in files:
                p = Path(f.path)
                if p.is_file():
                    arcname = p.name
                    if arcname in seen_names:
                        seen_names[arcname] += 1
                        arcname = f"{p.stem}_{seen_names[arcname]}{p.suffix}"
                    else:
                        seen_names[arcname] = 0
                    zf.write(p, arcname=arcname)

        zip_buffer.seek(0)
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=mediavault_export.zip"},
        )
