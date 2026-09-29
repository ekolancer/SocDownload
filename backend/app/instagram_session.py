from __future__ import annotations

import os
import secrets
from pathlib import Path


class InstagramSessionError(Exception):
    """Domain error carrying the HTTP-agnostic failure reason."""

    def __init__(self, code: str, *, status: int, detail: str, cleanup: bool = True) -> None:
        super().__init__(detail)
        self.code = code
        self.status = status
        self.detail = detail
        self.cleanup = cleanup


class InstagramSessionService:
    """Owns the Instagram session file lifecycle.

    Reads and writes ``AppSettings`` through the injected session factory and
    keeps the newly written file only when the adapter accepts it. The route
    layer maps ``InstagramSessionError`` to HTTP responses.
    """

    def __init__(self, *, session_factory, storage_dir: Path, settings_store, adapter_factory, registry) -> None:
        self._session_factory = session_factory
        self._storage_dir = Path(storage_dir)
        self._settings_store = settings_store
        self._adapter_factory = adapter_factory
        self._registry = registry

    def upload_session(self, *, username: str, content: bytes, max_bytes: int) -> dict:
        clean_username = username.strip()
        if not clean_username:
            raise InstagramSessionError("username_required", status=422, detail="Instagram username is required", cleanup=False)
        if not content or len(content) > max_bytes:
            raise InstagramSessionError("too_large", status=413, detail="Instagram session file is too large or empty", cleanup=False)

        self._storage_dir.mkdir(parents=True, exist_ok=True)
        path = self._storage_dir / f"instagram-session-{secrets.token_hex(16)}.session"
        old_path: Path | None = None
        adapter = self._adapter_factory()
        try:
            path.write_bytes(content)
            try:
                os.chmod(path, 0o600)
            except OSError:
                pass
            adapter.load_session(str(path), clean_username)
            with self._session_factory() as session:
                item = self._settings_store.get_or_create(session)
                old_path = Path(item.instagram_session_file) if item.instagram_session_file else None
                item.instagram_username = clean_username
                item.instagram_session_file = str(path)
                session.add(item)
                session.commit()
                response = self._settings_store.serialize(item)
            self._registry.register(adapter)
        except InstagramSessionError:
            path.unlink(missing_ok=True)
            raise
        except Exception as exc:
            path.unlink(missing_ok=True)
            raise InstagramSessionError(
                "session_load_failed", status=400, detail="Instagram session file could not be loaded"
            ) from exc

        if old_path and old_path != path:
            old_path.unlink(missing_ok=True)
        return {**response, "configured": True, "check_status": "not_checked"}

    def status(self) -> dict:
        data = self._settings_store.snapshot()
        configured = bool(data["instagram_session_file"] and Path(data["instagram_session_file"]).is_file())
        adapter = self._registry.get("instagram")
        if adapter is None:
            return {"connected": False, "configured": configured, "status": "unknown_error"}
        try:
            valid, reason = adapter.check_session_valid()
            if valid:
                return {"connected": True, "configured": configured, "status": "connected", "reason": None, "message": "Instagram session aktif.", "retryable": False}
            from .instagram_errors import instagram_status as build_status

            return {"connected": False, "configured": configured, **build_status(RuntimeError(reason or "unknown_error"))}
        except Exception as exc:
            from .instagram_errors import instagram_status as build_status

            return {"connected": False, "configured": configured, **build_status(exc)}

    def disconnect(self) -> dict:
        with self._session_factory() as session:
            item = session.get(self._settings_store.model, 1)
            if item:
                session_file = item.instagram_session_file
                item.instagram_session_file = None
                item.instagram_username = ""
                session.commit()
                if session_file:
                    Path(session_file).unlink(missing_ok=True)
            self._registry.register(type(self._registry.get("instagram"))())
        return {"connected": False, "status": "disconnected"}
