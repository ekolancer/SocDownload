from __future__ import annotations

from pathlib import Path

from .db import AppSettings, get_session_factory


class SettingsStore:
    """Read, create and serialize the single-row ``AppSettings`` record."""

    model = AppSettings
    _SINGLETON_ID = 1

    def __init__(self, session_factory=None) -> None:
        self._session_factory = session_factory or get_session_factory()

    def _open(self):
        return self._session_factory()

    def get(self) -> AppSettings:
        session = self._open()
        try:
            item = session.get(AppSettings, self._SINGLETON_ID)
            if item is None:
                item = AppSettings(id=self._SINGLETON_ID, instagram_username="")
                session.add(item)
                session.commit()
            session.refresh(item)
            session.expunge(item)
            return item
        finally:
            session.close()

    def snapshot(self) -> dict:
        """Detached view of the settings row safe to read outside a session."""
        item = self.get()
        return {
            "instagram_username": item.instagram_username,
            "instagram_session_file": item.instagram_session_file,
            "cookies_file": item.cookies_file,
            "job_cooldown_seconds": item.job_cooldown_seconds,
            "default_engine": item.default_engine,
        }

    def get_or_create(self, session) -> AppSettings:
        item = session.get(AppSettings, self._SINGLETON_ID)
        return item or AppSettings(id=self._SINGLETON_ID)

    def serialize(self, item: AppSettings) -> dict:
        return {
            "instagram_username": item.instagram_username,
            "cookies_file": bool(item.cookies_file and Path(item.cookies_file).is_file()),
            "instagram_session_file": bool(item.instagram_session_file and Path(item.instagram_session_file).is_file()),
            "job_cooldown_seconds": item.job_cooldown_seconds,
            "default_engine": item.default_engine,
        }

    def update(self, *, instagram_username: str, job_cooldown_seconds: int, default_engine: str) -> dict:
        session = self._open()
        try:
            item = self.get_or_create(session)
            item.instagram_username = instagram_username.strip()
            item.job_cooldown_seconds = job_cooldown_seconds
            item.default_engine = default_engine
            session.add(item)
            session.commit()
            return self.serialize(item)
        finally:
            session.close()
