from __future__ import annotations

from datetime import datetime

from sqlalchemy import delete, func, select

from .db import Album, AlbumMediaItem, MediaFile, MediaItem, get_session_factory, now_wib
from .media_vault import serialize_item


class AlbumError(Exception):
    """Base class for album domain errors."""


class AlbumNotFound(AlbumError):
    def __init__(self, album_id: int) -> None:
        super().__init__(f"Album {album_id} not found")
        self.album_id = album_id


class AlbumNameEmpty(AlbumError):
    def __init__(self) -> None:
        super().__init__("Album name cannot be empty")


def _cover_file_url(session, cover_item_id: int | None) -> str | None:
    if not cover_item_id:
        return None
    media_file = session.scalar(select(MediaFile).where(MediaFile.media_item_id == cover_item_id).limit(1))
    return f"/api/media/files/{media_file.id}" if media_file else None


def _album_summary(session, album: Album, *, items_count: int | None = None, cover_file_url: str | None = None) -> dict:
    if items_count is None:
        items_count = session.scalar(
            select(func.count()).select_from(AlbumMediaItem).where(AlbumMediaItem.album_id == album.id)
        ) or 0

    if cover_file_url is None:
        cover_item_id = album.cover_media_id
        if not cover_item_id:
            cover_item_id = session.scalar(
                select(AlbumMediaItem.media_item_id)
                .where(AlbumMediaItem.album_id == album.id)
                .order_by(AlbumMediaItem.added_at.desc())
                .limit(1)
            )
        cover_file_url = _cover_file_url(session, cover_item_id)

    return {
        "id": album.id,
        "name": album.name,
        "description": album.description,
        "cover_media_id": album.cover_media_id,
        "cover_file_url": cover_file_url,
        "items_count": items_count,
        "created_at": album.created_at.isoformat() if album.created_at else None,
        "updated_at": album.updated_at.isoformat() if album.updated_at else None,
    }


class AlbumService:
    """Create, edit and populate albums behind one interface.

    Takes a session factory so tests can drive it against an in-memory
    database. Raises AlbumError subclasses instead of HTTP errors.
    """

    def __init__(self, session_factory=None) -> None:
        self._session_factory = session_factory or get_session_factory()

    def list_albums(self) -> list[dict]:
        with self._session_factory() as session:
            albums = session.scalars(select(Album).order_by(Album.created_at.desc())).all()
            if not albums:
                return []

            album_ids = [a.id for a in albums]
            counts: dict[int, int] = {aid: 0 for aid in album_ids}
            for album_id, count in session.execute(
                select(AlbumMediaItem.album_id, func.count())
                .where(AlbumMediaItem.album_id.in_(album_ids))
                .group_by(AlbumMediaItem.album_id)
            ).all():
                counts[album_id] = count

            # Latest-added item per album, for the default cover.
            fallback_cover: dict[int, int] = {}
            ordered = session.execute(
                select(AlbumMediaItem.album_id, AlbumMediaItem.media_item_id)
                .where(AlbumMediaItem.album_id.in_(album_ids))
                .order_by(AlbumMediaItem.added_at.asc())
            ).all()
            for album_id, media_item_id in ordered:
                fallback_cover[album_id] = media_item_id

            # One query for the first file of every candidate cover.
            candidate_ids = {a.id: (a.cover_media_id or fallback_cover.get(a.id)) for a in albums}
            first_file_by_item: dict[int, int] = {}
            wanted = {cid for cid in candidate_ids.values() if cid}
            if wanted:
                for media_file in session.scalars(select(MediaFile).where(MediaFile.media_item_id.in_(wanted))).all():
                    first_file_by_item.setdefault(media_file.media_item_id, media_file.id)

            results = []
            for album in albums:
                candidate = album.cover_media_id or fallback_cover.get(album.id)
                cover_url = f"/api/media/files/{first_file_by_item[candidate]}" if candidate in first_file_by_item else None
                results.append(
                    _album_summary(session, album, items_count=counts.get(album.id, 0), cover_file_url=cover_url)
                )
            return results

    def create_album(self, *, name: str, description: str | None, cover_media_id: int | None) -> dict:
        clean_name = (name or "").strip()
        if not clean_name:
            raise AlbumNameEmpty()
        with self._session_factory() as session:
            album = Album(
                name=clean_name,
                description=description.strip() if description else None,
                cover_media_id=cover_media_id,
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

    def get_album(self, album_id: int) -> dict:
        with self._session_factory() as session:
            album = session.get(Album, album_id)
            if not album:
                raise AlbumNotFound(album_id)

            rows = session.execute(
                select(MediaItem, AlbumMediaItem.added_at)
                .join(AlbumMediaItem, AlbumMediaItem.media_item_id == MediaItem.id)
                .where(AlbumMediaItem.album_id == album.id)
                .order_by(AlbumMediaItem.added_at.desc())
            ).all()

            item_ids = [item.id for item, _ in rows]
            files_by_item: dict[int, list[MediaFile]] = {}
            if item_ids:
                for media_file in session.scalars(select(MediaFile).where(MediaFile.media_item_id.in_(item_ids))).all():
                    files_by_item.setdefault(media_file.media_item_id, []).append(media_file)

            items = []
            for item, added_at in rows:
                payload = serialize_item(item, files_by_item.get(item.id, []))
                payload["added_to_album_at"] = added_at.isoformat() if added_at else None
                items.append(payload)

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

    def update_album(self, album_id: int, *, name: str | None, description: str | None, cover_media_id: int | None) -> dict:
        with self._session_factory() as session:
            album = session.get(Album, album_id)
            if not album:
                raise AlbumNotFound(album_id)

            if name is not None:
                clean_name = name.strip()
                if not clean_name:
                    raise AlbumNameEmpty()
                album.name = clean_name
            if description is not None:
                album.description = description.strip() if description else None
            if cover_media_id is not None:
                album.cover_media_id = cover_media_id

            album.updated_at = now_wib()
            session.commit()
            return {"updated": True, "id": album.id, "name": album.name}

    def delete_album(self, album_id: int) -> dict:
        with self._session_factory() as session:
            album = session.get(Album, album_id)
            if not album:
                raise AlbumNotFound(album_id)
            session.execute(delete(AlbumMediaItem).where(AlbumMediaItem.album_id == album.id))
            session.delete(album)
            session.commit()
            return {"deleted": True, "id": album_id}

    def add_items(self, album_id: int, media_ids: list[int]) -> dict:
        if not media_ids:
            return {"added_count": 0, "album_id": album_id}
        with self._session_factory() as session:
            album = session.get(Album, album_id)
            if not album:
                raise AlbumNotFound(album_id)

            existing_ids = set(
                session.scalars(
                    select(AlbumMediaItem.media_item_id).where(
                        AlbumMediaItem.album_id == album_id,
                        AlbumMediaItem.media_item_id.in_(media_ids),
                    )
                ).all()
            )
            valid_ids = set(session.scalars(select(MediaItem.id).where(MediaItem.id.in_(media_ids))).all())

            added_count = 0
            for media_id in media_ids:
                if media_id in existing_ids or media_id not in valid_ids:
                    continue
                session.add(AlbumMediaItem(album_id=album_id, media_item_id=media_id))
                existing_ids.add(media_id)
                added_count += 1

            if added_count > 0:
                album.updated_at = now_wib()
                session.commit()
            return {"added_count": added_count, "album_id": album_id}

    def remove_items(self, album_id: int, media_ids: list[int]) -> dict:
        if not media_ids:
            return {"removed_count": 0, "album_id": album_id}
        with self._session_factory() as session:
            result = session.execute(
                delete(AlbumMediaItem).where(
                    AlbumMediaItem.album_id == album_id,
                    AlbumMediaItem.media_item_id.in_(media_ids),
                )
            )
            session.commit()
            return {"removed_count": result.rowcount, "album_id": album_id}
