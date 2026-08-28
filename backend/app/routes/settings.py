from __future__ import annotations

from pathlib import Path
import secrets

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field
import instaloader

from ..adapters.registry import registry
from ..config import ROOT, get_settings
from ..db import AppSettings, get_session_factory

router = APIRouter(prefix="/api/settings", tags=["settings"])
_STORAGE = ROOT / "config" / "uploads"
_ALLOWED = {"cookies": {".txt", ".cookies"}}
_MAX_NAME = 100


class InstagramLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=1, max_length=255)
    password: str = Field(default="", max_length=512)
    verification_code: str | None = Field(default=None, max_length=32)


class SettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instagram_username: str = Field(default="", max_length=255)
    job_cooldown_seconds: int = Field(default=2, ge=0, le=3600)
    default_engine: str = Field(default="auto", pattern="^(auto|yt-dlp|gallery-dl|instaloader)$")


def _get() -> AppSettings:
    session = get_session_factory()()
    try:
        item = session.get(AppSettings, 1)
        if item is None:
            item = AppSettings(id=1, instagram_username="")
            session.add(item)
            session.commit()
        return item
    finally:
        session.close()


def _response(item: AppSettings) -> dict[str, object]:
    return {
        "instagram_username": item.instagram_username,
        "cookies_file": bool(item.cookies_file),
        "instagram_session_file": bool(item.instagram_session_file),
        "job_cooldown_seconds": item.job_cooldown_seconds,
        "default_engine": item.default_engine,
    }


@router.get("")
def get_settings_api():
    return _response(_get())


@router.put("")
def update_settings(payload: SettingsUpdate):
    session = get_session_factory()()
    try:
        item = session.get(AppSettings, 1) or AppSettings(id=1)
        item.instagram_username = payload.instagram_username.strip()
        item.job_cooldown_seconds = payload.job_cooldown_seconds
        item.default_engine = payload.default_engine
        session.add(item)
        session.commit()
        return _response(item)
    finally:
        session.close()


@router.post("/instagram/login")
def instagram_login(payload: InstagramLogin):
    adapter = registry.get("instagram")
    if adapter is None or not hasattr(adapter, "login"):
        raise HTTPException(status_code=503, detail="Instagram adapter unavailable")
    try:
        if payload.verification_code:
            adapter.two_factor_login(payload.verification_code)
        else:
            adapter.login(payload.username.strip(), payload.password)
    except instaloader.TwoFactorAuthRequiredException:
        raise HTTPException(status_code=428, detail="Instagram verification code required") from None
    except (instaloader.BadCredentialsException, instaloader.LoginException):
        raise HTTPException(status_code=401, detail="Instagram login failed") from None
    _STORAGE.mkdir(parents=True, exist_ok=True)
    session_path = _STORAGE / f"instagram-session-{secrets.token_hex(16)}.session"
    adapter.save_session(str(session_path))
    session = get_session_factory()()
    try:
        item = session.get(AppSettings, 1) or AppSettings(id=1)
        item.instagram_username = payload.username.strip()
        item.instagram_session_file = str(session_path)
        session.add(item)
        session.commit()
        return _response(item)
    finally:
        session.close()


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
        item = session.get(AppSettings, 1) or AppSettings(id=1)
        setattr(item, f"{kind}_file", str(path))
        session.add(item)
        session.commit()
        return _response(item)
    finally:
        session.close()
