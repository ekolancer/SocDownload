from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy import select

from ..config import ROOT, get_settings
from ..db import MediaFile, MediaItem, get_session_factory

router = APIRouter(prefix="/api", tags=["media"])


@router.get("/media")
def list_media(platform: str | None = None, limit: int = 100):
    factory = get_session_factory()
    with factory() as session:
        stmt = select(MediaItem).order_by(MediaItem.created_at.desc()).limit(limit)
        if platform:
            stmt = stmt.where(MediaItem.platform == platform)
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
                })
            results.append({
                "id": i.id,
                "platform": i.platform,
                "source_url": i.source_url,
                "username": i.username,
                "caption": i.caption,
                "posted_at": i.posted_at.isoformat() if i.posted_at else None,
                "created_at": i.created_at.isoformat() if i.created_at else None,
                "files": file_list,
            })
        return results


@router.get("/media/files/{file_id}")
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
