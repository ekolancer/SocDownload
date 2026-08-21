from __future__ import annotations

from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, func, select

from ..db import Album, AlbumMediaItem, MediaFile, MediaItem, get_session_factory

router = APIRouter(prefix="/api/albums", tags=["albums"])


class CreateAlbumPayload(BaseModel):
    name: str
    description: str | None = None
    cover_media_id: int | None = None


class UpdateAlbumPayload(BaseModel):
    name: str | None = None
    description: str | None = None
    cover_media_id: int | None = None


class BatchAlbumItemsPayload(BaseModel):
    media_ids: list[int]


@router.get("")
def list_albums():
    factory = get_session_factory()
    with factory() as session:
        albums = session.scalars(select(Album).order_by(Album.created_at.desc())).all()
        results = []
        for a in albums:
            # Count items in album
            count_stmt = select(func.count()).select_from(AlbumMediaItem).where(AlbumMediaItem.album_id == a.id)
            items_count = session.scalar(count_stmt) or 0

            # Determine cover preview url
            cover_file_url = None
            cover_item_id = a.cover_media_id

            # If no explicit cover_media_id, grab the first media item in album
            if not cover_item_id:
                first_media_stmt = (
                    select(AlbumMediaItem.media_item_id)
                    .where(AlbumMediaItem.album_id == a.id)
                    .order_by(AlbumMediaItem.added_at.desc())
                    .limit(1)
                )
                cover_item_id = session.scalar(first_media_stmt)

            if cover_item_id:
                first_file_stmt = select(MediaFile).where(MediaFile.media_item_id == cover_item_id).limit(1)
                f = session.scalar(first_file_stmt)
                if f:
                    cover_file_url = f"/api/media/files/{f.id}"

            results.append({
                "id": a.id,
                "name": a.name,
                "description": a.description,
                "cover_media_id": a.cover_media_id,
                "cover_file_url": cover_file_url,
                "items_count": items_count,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "updated_at": a.updated_at.isoformat() if a.updated_at else None,
            })
        return results


@router.post("")
def create_album(payload: CreateAlbumPayload):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Album name cannot be empty")

    factory = get_session_factory()
    with factory() as session:
        album = Album(
            name=name,
            description=payload.description.strip() if payload.description else None,
            cover_media_id=payload.cover_media_id,
        )
        session.add(album)
        session.commit()
        session.refresh(album)

        return {
            "id": album.id,
            "name": album.name,
            "description": album.description,
            "cover_media_id": album.cover_media_id,
            "items_count": 0,
            "created_at": album.created_at.isoformat() if album.created_at else None,
        }


@router.get("/{album_id}")
def get_album_detail(album_id: int):
    factory = get_session_factory()
    with factory() as session:
        album = session.get(Album, album_id)
        if not album:
            raise HTTPException(status_code=404, detail="Album not found")

        # Fetch joined media items
        stmt = (
            select(MediaItem, AlbumMediaItem.added_at)
            .join(AlbumMediaItem, AlbumMediaItem.media_item_id == MediaItem.id)
            .where(AlbumMediaItem.album_id == album.id)
            .order_by(AlbumMediaItem.added_at.desc())
        )
        rows = session.execute(stmt).all()

        items = []
        for item, added_at in rows:
            files = session.scalars(select(MediaFile).where(MediaFile.media_item_id == item.id)).all()
            file_list = []
            for f in files:
                file_list.append({
                    "id": f.id,
                    "kind": f.kind,
                    "url": f"/api/media/files/{f.id}",
                    "name": Path(f.path).name,
                })
            items.append({
                "id": item.id,
                "platform": item.platform,
                "source_url": item.source_url,
                "username": item.username,
                "caption": item.caption,
                "is_favorite": item.is_favorite,
                "posted_at": item.posted_at.isoformat() if item.posted_at else None,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "added_to_album_at": added_at.isoformat() if added_at else None,
                "files": file_list,
            })

        return {
            "id": album.id,
            "name": album.name,
            "description": album.description,
            "cover_media_id": album.cover_media_id,
            "items_count": len(items),
            "created_at": album.created_at.isoformat() if album.created_at else None,
            "updated_at": album.updated_at.isoformat() if album.updated_at else None,
            "items": items,
        }


@router.put("/{album_id}")
def update_album(album_id: int, payload: UpdateAlbumPayload):
    factory = get_session_factory()
    with factory() as session:
        album = session.get(Album, album_id)
        if not album:
            raise HTTPException(status_code=404, detail="Album not found")

        if payload.name is not None:
            name = payload.name.strip()
            if not name:
                raise HTTPException(status_code=400, detail="Album name cannot be empty")
            album.name = name

        if payload.description is not None:
            album.description = payload.description.strip() if payload.description else None

        if payload.cover_media_id is not None:
            album.cover_media_id = payload.cover_media_id

        album.updated_at = datetime.utcnow()
        session.commit()

        return {"updated": True, "id": album.id, "name": album.name}


@router.delete("/{album_id}")
def delete_album(album_id: int):
    factory = get_session_factory()
    with factory() as session:
        album = session.get(Album, album_id)
        if not album:
            raise HTTPException(status_code=404, detail="Album not found")

        # Delete junction entries first
        session.execute(delete(AlbumMediaItem).where(AlbumMediaItem.album_id == album.id))
        session.delete(album)
        session.commit()

        return {"deleted": True, "id": album_id}


@router.post("/{album_id}/items")
def add_items_to_album(album_id: int, payload: BatchAlbumItemsPayload):
    if not payload.media_ids:
        return {"added_count": 0}

    factory = get_session_factory()
    with factory() as session:
        album = session.get(Album, album_id)
        if not album:
            raise HTTPException(status_code=404, detail="Album not found")

        added_count = 0
        for mid in payload.media_ids:
            # Check if media item exists
            m = session.get(MediaItem, mid)
            if not m:
                continue

            # Check if already added
            existing = session.scalar(
                select(AlbumMediaItem).where(
                    AlbumMediaItem.album_id == album_id,
                    AlbumMediaItem.media_item_id == mid,
                )
            )
            if not existing:
                ami = AlbumMediaItem(album_id=album_id, media_item_id=mid)
                session.add(ami)
                added_count += 1

        if added_count > 0:
            album.updated_at = datetime.utcnow()
            session.commit()

        return {"added_count": added_count, "album_id": album_id}


@router.delete("/{album_id}/items")
def remove_items_from_album(album_id: int, payload: BatchAlbumItemsPayload):
    if not payload.media_ids:
        return {"removed_count": 0}

    factory = get_session_factory()
    with factory() as session:
        stmt = delete(AlbumMediaItem).where(
            AlbumMediaItem.album_id == album_id,
            AlbumMediaItem.media_item_id.in_(payload.media_ids),
        )
        res = session.execute(stmt)
        session.commit()

        return {"removed_count": res.rowcount, "album_id": album_id}
