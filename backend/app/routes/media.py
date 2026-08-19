from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from ..db import MediaItem, get_session_factory

router = APIRouter(prefix="/api", tags=["media"])


@router.get("/media")
def list_media(platform: str | None = None, limit: int = 100):
    factory = get_session_factory()
    with factory() as session:
        stmt = select(MediaItem).order_by(MediaItem.created_at.desc()).limit(limit)
        if platform:
            stmt = stmt.where(MediaItem.platform == platform)
        items = session.scalars(stmt).all()
        return [
            {
                "id": i.id,
                "platform": i.platform,
                "source_url": i.source_url,
                "username": i.username,
                "caption": i.caption,
                "posted_at": i.posted_at,
                "created_at": i.created_at,
            }
            for i in items
        ]
