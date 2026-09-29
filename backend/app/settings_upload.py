from __future__ import annotations

import secrets
from pathlib import Path


class SettingsFileError(Exception):
    """Domain error for a rejected settings-file upload."""

    def __init__(self, status: int, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.detail = detail


class SettingsFileService:
    """Validate and persist user-uploaded settings files (cookies and the like).

    Keeps the uploaded file only after it passes the kind-specific checks, and
    writes the stored path back through the settings store.
    """

    def __init__(self, *, storage_dir: Path, settings_store, allowed: dict[str, set[str]], max_name_length: int = 100) -> None:
        self._storage_dir = Path(storage_dir)
        self._settings_store = settings_store
        self._allowed = allowed
        self._max_name_length = max_name_length

    def _validate(self, kind: str, filename: str | None, content: bytes, max_bytes: int) -> str:
        if kind not in self._allowed or not filename or len(filename) > self._max_name_length:
            raise SettingsFileError(400, "Invalid settings file")
        suffix = Path(filename).suffix.lower()
        if suffix not in self._allowed[kind]:
            raise SettingsFileError(400, "Unsupported settings file type")
        if not content or len(content) > max_bytes:
            raise SettingsFileError(413, "Settings file is too large or empty")
        if kind == "cookies" and not content.startswith(b"# Netscape HTTP Cookie File"):
            raise SettingsFileError(400, "Cookies file must use Netscape format")
        return suffix

    def upload(self, *, kind: str, filename: str | None, content: bytes, max_bytes: int) -> dict:
        suffix = self._validate(kind, filename, content, max_bytes)
        self._storage_dir.mkdir(parents=True, exist_ok=True)
        path = self._storage_dir / f"{kind}-{secrets.token_hex(16)}{suffix}"
        path.write_bytes(content)
        with self._settings_store.session_factory() as session:
            item = self._settings_store.get_or_create(session)
            setattr(item, f"{kind}_file", str(path))
            session.add(item)
            session.commit()
            return self._settings_store.serialize(item)
