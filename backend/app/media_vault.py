from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import delete, func, or_, select

from .db import AlbumMediaItem, MediaFile, MediaItem, get_session_factory

AUDIO_EXTENSIONS = {".m4a", ".mp3", ".wav", ".aac", ".flac", ".ogg"}


def neutralize_csv_formula(value):
    if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def sanitize_zip_component(value: str | None, fallback: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9._-]+", "_", value or "").strip(" ._")
    if sanitized in {"", ".", ".."}:
        return fallback
    return sanitized[:100]


@dataclass
class MediaQuery:
    """One filter description shared by list, count, creators and export."""

    platform: str | None = None
    creator: str | None = None
    is_favorite: bool | None = None
    media_type: str | None = None
    q: str | None = None
    ids: list[int] | None = None
    album_id: int | None = None
    limit: int = 100
    offset: int = 0

    def clauses(self) -> list:
        clauses: list = []
        if self.ids:
            clauses.append(MediaItem.id.in_(self.ids))
        if self.platform and self.platform != "all":
            clauses.append(func.lower(MediaItem.platform) == self.platform.lower())
        if self.creator:
            if self.creator.lower() == "unknown":
                clauses.append(MediaItem.username.is_(None))
            else:
                clauses.append(func.lower(MediaItem.username) == self.creator.lower())
        if self.is_favorite is not None:
            clauses.append(MediaItem.is_favorite == self.is_favorite)
        if self.media_type and self.media_type != "all":
            clauses.append(
                MediaItem.id.in_(
                    select(MediaFile.media_item_id).where(func.lower(MediaFile.kind) == self.media_type.lower())
                )
            )
        if self.q and self.q.strip():
            like = f"%{self.q.strip().lower()}%"
            clauses.append(
                or_(
                    func.lower(MediaItem.caption).like(like),
                    func.lower(MediaItem.username).like(like),
                    func.lower(MediaItem.source_url).like(like),
                    func.lower(MediaItem.platform).like(like),
                )
            )
        return clauses


def serialize_file(media_file: MediaFile) -> dict:
    return {
        "id": media_file.id,
        "kind": media_file.kind,
        "url": f"/api/media/files/{media_file.id}",
        "thumbnail_url": f"/media-thumbnail/{media_file.id}" if media_file.thumbnail_path else None,
        "width": media_file.width,
        "height": media_file.height,
        "duration_seconds": media_file.duration,
        "name": Path(media_file.path).name,
    }


def serialize_item(item: MediaItem, files: list[MediaFile], *, full: bool = False, skip_audio: bool = False) -> dict:
    """Single serializer for a media item across list, album and export paths."""
    file_list = []
    for f in files:
        if skip_audio and (f.kind == "audio" or Path(f.path).suffix.lower() in AUDIO_EXTENSIONS):
            continue
        entry = serialize_file(f)
        if full:
            entry.update({"video_codec": f.video_codec, "audio_codec": f.audio_codec, "sha256": f.sha256})
        file_list.append(entry)
    payload = {
        "id": item.id,
        "platform": item.platform,
        "source_url": item.source_url,
        "username": item.username or "unknown",
        "caption": item.caption,
        "is_favorite": bool(item.is_favorite),
        "posted_at": item.posted_at.isoformat() if item.posted_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "files": file_list,
    }
    if full:
        payload["hashtags"] = item.hashtags.split(",") if item.hashtags else []
        payload["sha256"] = item.sha256
    return payload


class MediaVault:
    """Query, serialize and delete media items behind one interface.

    Takes a session factory so a real SQLite and an in-memory database both
    satisfy the same seam.
    """

    def __init__(self, session_factory=None) -> None:
        self._session_factory = session_factory or get_session_factory

    # -- reads ------------------------------------------------------------

    def list_items(self, query: MediaQuery) -> list[dict]:
        with self._session_factory() as session:
            stmt = select(MediaItem)
            for clause in query.clauses():
                stmt = stmt.where(clause)
            stmt = stmt.order_by(MediaItem.created_at.desc(), MediaItem.id.desc()).offset(query.offset).limit(query.limit)
            items = session.scalars(stmt).all()
            files_by_item = self._files_by_item(session, [i.id for i in items])
            return [serialize_item(i, files_by_item.get(i.id, []), skip_audio=True) for i in items]

    def count(self, query: MediaQuery) -> int:
        with self._session_factory() as session:
            stmt = select(func.count()).select_from(MediaItem)
            for clause in query.clauses():
                stmt = stmt.where(clause)
            return session.scalar(stmt) or 0

    def creators(self) -> list[dict]:
        with self._session_factory() as session:
            items = session.scalars(select(MediaItem).order_by(MediaItem.created_at.desc())).all()
            files_by_item = self._files_by_item(session, [i.id for i in items])

            creators_map: dict[tuple[str, str], dict] = {}
            for item in items:
                username = item.username or "unknown"
                platform = item.platform or "unknown"
                creator = creators_map.setdefault(
                    (username, platform),
                    {
                        "username": username,
                        "platform": platform,
                        "media_count": 0,
                        "video_count": 0,
                        "image_count": 0,
                        "first_posted_at": None,
                        "last_posted_at": None,
                        "sample_thumbnails": [],
                    },
                )
                creator["media_count"] += 1
                if item.posted_at:
                    iso_posted = item.posted_at.isoformat()
                    if not creator["first_posted_at"] or iso_posted < creator["first_posted_at"]:
                        creator["first_posted_at"] = iso_posted
                    if not creator["last_posted_at"] or iso_posted > creator["last_posted_at"]:
                        creator["last_posted_at"] = iso_posted
                for f in files_by_item.get(item.id, []):
                    if f.kind == "video":
                        creator["video_count"] += 1
                    else:
                        creator["image_count"] += 1
                    if len(creator["sample_thumbnails"]) < 4:
                        if f.thumbnail_path:
                            creator["sample_thumbnails"].append({"url": f"/media-thumbnail/{f.id}", "width": f.width, "height": f.height})
                        elif f.kind != "video":
                            creator["sample_thumbnails"].append({"url": f"/api/media/files/{f.id}", "width": f.width, "height": f.height})
            return sorted(creators_map.values(), key=lambda c: c["media_count"], reverse=True)

    # -- writes -----------------------------------------------------------

    def toggle_favorite(self, item_id: int, is_favorite: bool | None = None) -> dict | None:
        with self._session_factory() as session:
            item = session.get(MediaItem, item_id)
            if item is None:
                return None
            item.is_favorite = is_favorite if is_favorite is not None else not bool(item.is_favorite)
            session.commit()
            return {"id": item.id, "is_favorite": item.is_favorite}

    def delete(self, item_ids: list[int]) -> int:
        """Delete media items: DB rows plus physical files and sidecars."""
        if not item_ids:
            return 0
        with self._session_factory() as session:
            items = session.scalars(select(MediaItem).where(MediaItem.id.in_(item_ids))).all()
            parent_dirs: set[Path] = set()
            deleted = 0
            for item in items:
                files = session.scalars(select(MediaFile).where(MediaFile.media_item_id == item.id)).all()
                for f in files:
                    path = Path(f.path)
                    if f.thumbnail_path:
                        Path(f.thumbnail_path).unlink(missing_ok=True)
                    if path.is_file():
                        try:
                            parent_dirs.add(path.parent)
                            path.unlink(missing_ok=True)
                        except Exception:
                            pass
                    session.delete(f)
                session.execute(delete(AlbumMediaItem).where(AlbumMediaItem.media_item_id == item.id))
                session.delete(item)
                deleted += 1
            self._cleanup_dirs(parent_dirs)
            session.commit()
            return deleted

    # -- helpers ----------------------------------------------------------

    def _files_by_item(self, session, item_ids: list[int]) -> dict[int, list[MediaFile]]:
        if not item_ids:
            return {}
        grouped: dict[int, list[MediaFile]] = {}
        for f in session.scalars(select(MediaFile).where(MediaFile.media_item_id.in_(item_ids))).all():
            grouped.setdefault(f.media_item_id, []).append(f)
        return grouped

    @staticmethod
    def _cleanup_dirs(parent_dirs: set[Path]) -> None:
        for pdir in parent_dirs:
            try:
                meta_json = pdir / "metadata.json"
                if meta_json.is_file():
                    meta_json.unlink(missing_ok=True)
                if pdir.is_dir() and not any(pdir.iterdir()):
                    pdir.rmdir()
            except Exception:
                pass
