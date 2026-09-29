from __future__ import annotations

from pathlib import Path
import secrets

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field
import instaloader

from ..adapters.instagram import InstagramAdapter
from ..adapters.registry import registry
from ..config import ROOT, get_settings
from ..db import AppSettings, AutoSyncConfig, get_session_factory
from ..instagram_challenges import InstagramChallengeStore
from ..instagram_session import InstagramSessionError, InstagramSessionService
from ..settings_store import SettingsStore

router = APIRouter(prefix="/api/settings", tags=["settings"])
_STORAGE = ROOT / "config" / "uploads"
_ALLOWED = {"cookies": {".txt", ".cookies"}}
_MAX_NAME = 100

_challenge_store = InstagramChallengeStore(ttl_seconds=300, max_attempts=3)
# Backwards-compatible view used by callers/tests that reach for the dict.
_challenges: dict[str, dict] = _challenge_store._entries


def _settings_store_for() -> SettingsStore:
    # Resolved per call so tests can patch get_session_factory.
    return SettingsStore(session_factory=get_session_factory())


def _session_service() -> InstagramSessionService:
    # Resolved per call so tests can patch storage/adapter/registry/factory.
    return InstagramSessionService(
        session_factory=get_session_factory(),
        storage_dir=_STORAGE,
        settings_store=_settings_store_for(),
        adapter_factory=InstagramAdapter,
        registry=registry,
    )


class InstagramLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=1, max_length=255)
    password: str = Field(default="", max_length=512)
    verification_code: str | None = Field(default=None, max_length=32)
    challenge_id: str | None = Field(default=None, min_length=32, max_length=64)


class SettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instagram_username: str = Field(default="", max_length=255)
    job_cooldown_seconds: int = Field(default=2, ge=0, le=3600)
    default_engine: str = Field(default="auto", pattern="^(auto|gallery-dl|instaloader)$")


# Legacy shims: some callers/tests still import these names.
def _get() -> AppSettings:
    return _settings_store_for().get()


def _response(item: AppSettings) -> dict[str, object]:
    return _settings_store_for().serialize(item)


@router.get("")
def get_settings_api():
    return _settings_store_for().serialize(_settings_store_for().get())


@router.put("")
def update_settings(payload: SettingsUpdate):
    return _settings_store_for().update(
        instagram_username=payload.instagram_username,
        job_cooldown_seconds=payload.job_cooldown_seconds,
        default_engine=payload.default_engine,
    )


@router.post("/instagram/login")
def instagram_login(payload: InstagramLogin):
    adapter = registry.get("instagram")
    if adapter is None or not hasattr(adapter, "login"):
        raise HTTPException(status_code=503, detail="Instagram adapter unavailable")
    if payload.verification_code:
        if not _challenge_store.is_valid(payload.challenge_id, adapter):
            raise HTTPException(status_code=400, detail="Invalid or expired Instagram challenge")
        _challenge_store.record_attempt(payload.challenge_id)
    try:
        if payload.verification_code:
            adapter.two_factor_login(payload.verification_code)
        else:
            adapter.login(payload.username.strip(), payload.password)
    except instaloader.TwoFactorAuthRequiredException:
        challenge_id = _challenge_store.create(adapter=adapter, username=payload.username.strip())
        raise HTTPException(status_code=428, detail={"code": "challenge_required", "challenge_id": challenge_id}) from None
    except (instaloader.BadCredentialsException, instaloader.LoginException):
        raise HTTPException(status_code=401, detail="instagram_invalid_credentials") from None
    finally:
        payload.password = ""
    if payload.verification_code:
        _challenge_store.consume(payload.challenge_id)
    valid, reason = adapter.check_session_valid()
    if not valid:
        raise HTTPException(status_code=401, detail=f"instagram_{reason or 'unknown_error'}")
    _STORAGE.mkdir(parents=True, exist_ok=True)
    session_path = _STORAGE / f"instagram-session-{secrets.token_hex(16)}.session"
    adapter.save_session(str(session_path))
    session = get_session_factory()()
    try:
        item = _settings_store_for().get_or_create(session)
        challenge_username = _challenge_store.username_of(payload.challenge_id) if payload.verification_code else None
        item.instagram_username = challenge_username or payload.username.strip()
        item.instagram_session_file = str(session_path)
        sync_config = session.query(AutoSyncConfig).filter(AutoSyncConfig.platform == 'instagram').first()
        if sync_config:
            sync_config.last_sync_status = None
            sync_config.last_error = None
        session.add(item)
        session.commit()
        return _settings_store_for().serialize(item)
    finally:
        session.close()


@router.post("/instagram/session")
def instagram_session_upload(username: str = Form(..., min_length=1, max_length=255), file: UploadFile = File(...)):
    content = file.file.read(get_settings().max_upload_bytes + 1)
    try:
        return _session_service().upload_session(username=username, content=content, max_bytes=get_settings().max_upload_bytes)
    except InstagramSessionError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.detail) from None


@router.get("/instagram/status")
def instagram_status():
    return _session_service().status()


@router.post("/instagram/check")
def instagram_check():
    return _session_service().status()


@router.post("/instagram/disconnect")
def instagram_disconnect():
    return _session_service().disconnect()


@router.post("/upload/{kind}")
def upload_settings_file(kind: str, file: UploadFile = File(...)):
    if kind not in _ALLOWED or not file.filename or len(file.filename) > _MAX_NAME:
        raise HTTPException(status_code=400, detail="Invalid settings file")
    suffix = Path(file.filename).suffix.lower()
    if suffix not in _ALLOWED[kind]:
        raise HTTPException(status_code=400, detail="Unsupported settings file type")
    content = file.file.read(get_settings().max_upload_bytes + 1)
    if len(content) > get_settings().max_upload_bytes or not content:
        raise HTTPException(status_code=413, detail="Settings file is too large or empty")
    if kind == "cookies" and not content.startswith(b"# Netscape HTTP Cookie File"):
        raise HTTPException(status_code=400, detail="Cookies file must use Netscape format")
    _STORAGE.mkdir(parents=True, exist_ok=True)
    path = _STORAGE / f"{kind}-{secrets.token_hex(16)}{suffix}"
    path.write_bytes(content)
    session = get_session_factory()()
    try:
        item = _settings_store_for().get_or_create(session)
        setattr(item, f"{kind}_file", str(path))
        session.add(item)
        session.commit()
        return _settings_store_for().serialize(item)
    finally:
        session.close()
