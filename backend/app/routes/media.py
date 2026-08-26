from __future__ import annotations

import io
import os
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import delete, func, select

from ..config import ROOT, get_settings
from ..db import (
    AlbumMediaItem,
    MediaFile,
    MediaItem,
    get_session_factory,
    now_wib,
)

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


@router.get("/storage")
def get_storage_stats():
    """Return total media files count, total bytes used on disk, and formatted human size."""
    settings = get_settings()
    media_root = Path(settings.media_root).resolve()
    if not media_root.is_absolute():
        media_root = (ROOT / media_root).resolve()

    total_bytes = 0
    total_files = 0

    if media_root.is_dir():
        for p in media_root.rglob("*"):
            if p.is_file() and not p.name.startswith("."):
                try:
                    total_bytes += p.stat().st_size
                    total_files += 1
                except Exception:
                    pass

    # Human-readable string
    if total_bytes < 1024 * 1024:
        human_size = f"{total_bytes / 1024:.1f} KB"
    elif total_bytes < 1024 * 1024 * 1024:
        human_size = f"{total_bytes / (1024 * 1024):.1f} MB"
    else:
        human_size = f"{total_bytes / (1024 * 1024 * 1024):.2f} GB"

    return {
        "total_bytes": total_bytes,
        "total_files": total_files,
        "human_size": human_size,
    }


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


@router.get("/creators")
def list_creators():
    """Aggregate media items by (username, platform) with counts and statistics."""
    factory = get_session_factory()
    with factory() as session:
        items = session.scalars(
            select(MediaItem).order_by(MediaItem.created_at.desc())
        ).all()

        creators_map: dict[tuple[str, str], dict] = {}

        for item in items:
            username = item.username or "unknown"
            platform = item.platform or "unknown"
            key = (username, platform)

            if key not in creators_map:
                creators_map[key] = {
                    "username": username,
                    "platform": platform,
                    "media_count": 0,
                    "video_count": 0,
                    "image_count": 0,
                    "first_posted_at": None,
                    "last_posted_at": None,
                    "sample_thumbnails": [],
                }

            creator = creators_map[key]
            creator["media_count"] += 1

            # Check posted dates
            if item.posted_at:
                iso_posted = item.posted_at.isoformat()
                if not creator["first_posted_at"] or iso_posted < creator["first_posted_at"]:
                    creator["first_posted_at"] = iso_posted
                if not creator["last_posted_at"] or iso_posted > creator["last_posted_at"]:
                    creator["last_posted_at"] = iso_posted

            # Fetch media files for this item
            files = session.scalars(
                select(MediaFile).where(MediaFile.media_item_id == item.id)
            ).all()

            for f in files:
                if f.kind == "video":
                    creator["video_count"] += 1
                else:
                    creator["image_count"] += 1

                if len(creator["sample_thumbnails"]) < 4:
                    creator["sample_thumbnails"].append(f.id)

        # Sort creators by media_count descending
        results = sorted(creators_map.values(), key=lambda c: c["media_count"], reverse=True)
        return results


def _get_filtered_media_items(
    session,
    ids: str | None = None,
    album_id: int | None = None,
    username: str | None = None,
    platform: str | None = None,
    limit: int = 500,
) -> list[MediaItem]:
    query = select(MediaItem)

    if ids:
        try:
            id_list = [int(i.strip()) for i in ids.split(",") if i.strip()]
            if id_list:
                query = query.where(MediaItem.id.in_(id_list))
        except ValueError:
            pass

    if album_id:
        query = query.join(AlbumMediaItem, AlbumMediaItem.media_item_id == MediaItem.id).where(
            AlbumMediaItem.album_id == album_id
        )

    if username and username != "all":
        query = query.where(MediaItem.username == username)

    if platform and platform != "all":
        query = query.where(MediaItem.platform == platform)

    return session.scalars(query.order_by(MediaItem.created_at.desc()).limit(limit)).all()


@router.get("/export/csv")
def export_metadata_csv(
    ids: str | None = None,
    album_id: int | None = None,
    username: str | None = None,
    platform: str | None = None,
    limit: int = 500,
):
    """Export metadata as a downloadable CSV file."""
    import csv

    factory = get_session_factory()
    with factory() as session:
        items = _get_filtered_media_items(session, ids, album_id, username, platform, limit=limit)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID",
            "Platform",
            "Username",
            "Source URL",
            "Caption",
            "Hashtags",
            "Posted At",
            "Archived At",
            "Files Count",
            "SHA256",
        ])

        for item in items:
            files_count = session.scalar(
                select(func.count(MediaFile.id)).where(MediaFile.media_item_id == item.id)
            ) or 0

            writer.writerow([
                item.id,
                item.platform,
                item.username or "",
                item.source_url,
                (item.caption or "").replace("\n", " "),
                item.hashtags or "",
                item.posted_at.isoformat() if item.posted_at else "",
                item.created_at.isoformat() if item.created_at else "",
                files_count,
                item.sha256 or "",
            ])

        output.seek(0)
        filename = f"mediavault_metadata_{now_wib().strftime('%Y%m%d_%H%M%S')}.csv"
        return StreamingResponse(

            io.BytesIO(output.getvalue().encode("utf-8-sig")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )


@router.get("/export/json")
def export_metadata_json(
    ids: str | None = None,
    album_id: int | None = None,
    username: str | None = None,
    platform: str | None = None,
    limit: int = 500,
):
    """Export full metadata as a downloadable JSON file."""
    import json

    factory = get_session_factory()
    with factory() as session:
        items = _get_filtered_media_items(session, ids, album_id, username, platform, limit=limit)

        data = []
        for item in items:
            files = session.scalars(
                select(MediaFile).where(MediaFile.media_item_id == item.id)
            ).all()

            data.append({
                "id": item.id,
                "platform": item.platform,
                "username": item.username,
                "source_url": item.source_url,
                "caption": item.caption,
                "hashtags": item.hashtags.split(",") if item.hashtags else [],
                "posted_at": item.posted_at.isoformat() if item.posted_at else None,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "sha256": item.sha256,
                "files": [
                    {
                        "id": f.id,
                        "kind": f.kind,
                        "name": Path(f.path).name,
                        "sha256": f.sha256,
                    }
                    for f in files
                ],
            })

        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        filename = f"mediavault_export_{now_wib().strftime('%Y%m%d_%H%M%S')}.json"
        return StreamingResponse(
            io.BytesIO(json_str.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )


@router.get("/export/zip")
def export_media_zip(
    ids: str | None = None,
    album_id: int | None = None,
    username: str | None = None,
    platform: str | None = None,
    limit: int = 500,
):
    """Export structured ZIP package containing organized media files and metadata."""
    import json
    import csv

    factory = get_session_factory()
    with factory() as session:
        items = _get_filtered_media_items(session, ids, album_id, username, platform, limit=limit)

        if not items:
            raise HTTPException(status_code=404, detail="No media items found for export")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            metadata_items = []
            csv_rows = [
                ["ID", "Platform", "Username", "Source URL", "Caption", "Hashtags", "Posted At", "Archived At", "Files"]
            ]

            for item in items:
                u_dir = item.username or "unknown"
                p_dir = item.platform or "general"
                folder_path = f"{p_dir}/{u_dir}"

                files = session.scalars(
                    select(MediaFile).where(MediaFile.media_item_id == item.id)
                ).all()

                item_files = []
                for f in files:
                    p = Path(f.path)
                    if p.is_file():
                        arcname = f"{folder_path}/{p.name}"
                        zf.write(p, arcname=arcname)
                        item_files.append(p.name)

                meta_entry = {
                    "id": item.id,
                    "platform": item.platform,
                    "username": item.username,
                    "source_url": item.source_url,
                    "caption": item.caption,
                    "posted_at": item.posted_at.isoformat() if item.posted_at else None,
                    "created_at": item.created_at.isoformat() if item.created_at else None,
                    "files": item_files,
                }
                metadata_items.append(meta_entry)

                csv_rows.append([
                    item.id,
                    item.platform,
                    item.username or "",
                    item.source_url,
                    (item.caption or "").replace("\n", " "),
                    item.hashtags or "",
                    item.posted_at.isoformat() if item.posted_at else "",
                    item.created_at.isoformat() if item.created_at else "",
                    ", ".join(item_files),
                ])

            # Write metadata.json at root of ZIP
            zf.writestr("metadata.json", json.dumps(metadata_items, ensure_ascii=False, indent=2))

            # Write metadata.csv at root of ZIP
            csv_buf = io.StringIO()
            writer = csv.writer(csv_buf)
            writer.writerows(csv_rows)
            zf.writestr("metadata.csv", csv_buf.getvalue().encode("utf-8-sig"))

        zip_buffer.seek(0)
        prefix = f"mediavault_{username}" if username else "mediavault_vault"
        filename = f"{prefix}_{now_wib().strftime('%Y%m%d_%H%M%S')}.zip"

        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )


@router.post("/batch-zip")
def batch_zip_media(payload: BatchMediaPayload):
    if not payload.media_ids:
        raise HTTPException(status_code=400, detail="No media IDs specified")

    ids_str = ",".join(str(i) for i in payload.media_ids)
    return export_media_zip(ids=ids_str)

