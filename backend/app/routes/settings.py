from __future__ import annotations

import os
from pathlib import Path
import secrets
import time


_challenges: dict[str, dict[str, object]] = {}
_CHALLENGE_TTL = 300
_MAX_ATTEMPTS = 3

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict, Field
import instaloader

from ..adapters.instagram import InstagramAdapter
from ..adapters.registry import registry
from ..config import ROOT, get_settings
from ..db import AppSettings, AutoSyncConfig, get_session_factory
from ..instagram_errors import instagram_status as build_instagram_status

router = APIRouter(prefix="/api/settings", tags=["settings"])
_STORAGE = ROOT / "config" / "uploads"
_ALLOWED = {"cookies": {".txt", ".cookies"}}
_MAX_NAME = 100


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
        "cookies_file": bool(item.cookies_file and Path(item.cookies_file).is_file()),
        "instagram_session_file": bool(item.instagram_session_file and Path(item.instagram_session_file).is_file()),
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
    challenge = _challenges.get(payload.challenge_id or "")
    if payload.verification_code:
        if not challenge or float(challenge["expires"]) < time.time() or int(challenge["attempts"]) >= _MAX_ATTEMPTS:
            raise HTTPException(status_code=400, detail="Invalid or expired Instagram challenge")
        challenge["attempts"] = int(challenge["attempts"]) + 1
        if challenge["adapter"] is not adapter:
            raise HTTPException(status_code=400, detail="Invalid Instagram challenge")
    try:
        if payload.verification_code:
            adapter.two_factor_login(payload.verification_code)
        else:
            adapter.login(payload.username.strip(), payload.password)
    except instaloader.TwoFactorAuthRequiredException:
        challenge_id = secrets.token_urlsafe(32)
        _challenges[challenge_id] = {"expires": time.time() + _CHALLENGE_TTL, "attempts": 0, "adapter": adapter, "username": payload.username.strip()}
        raise HTTPException(status_code=428, detail={"code": "challenge_required", "challenge_id": challenge_id}) from None
    except (instaloader.BadCredentialsException, instaloader.LoginException):
        raise HTTPException(status_code=401, detail="instagram_invalid_credentials") from None
    finally:
        payload.password = ""
    if payload.verification_code:
        del _challenges[payload.challenge_id]
    valid, reason = adapter.check_session_valid()
    if not valid:
        raise HTTPException(status_code=401, detail=f"instagram_{reason or 'unknown_error'}")
    _STORAGE.mkdir(parents=True, exist_ok=True)
    session_path = _STORAGE / f"instagram-session-{secrets.token_hex(16)}.session"
    adapter.save_session(str(session_path))
    session = get_session_factory()()
    try:
        item = session.get(AppSettings, 1) or AppSettings(id=1)
        item.instagram_username = str(challenge["username"]) if payload.verification_code and challenge else payload.username.strip()
        item.instagram_session_file = str(session_path)
        sync_config = session.query(AutoSyncConfig).filter(AutoSyncConfig.platform == 'instagram').first()
        if sync_config:
            sync_config.last_sync_status = None
            sync_config.last_error = None
        session.add(item)
        session.commit()
        return _response(item)
    finally:
        session.close()


@router.post("/instagram/session")
def instagram_session_upload(username: str = Form(..., min_length=1, max_length=255), file: UploadFile = File(...)):
    username = username.strip()
    if not username:
        raise HTTPException(status_code=422, detail="Instagram username is required")
    content = file.file.read(get_settings().max_upload_bytes + 1)
    if not content or len(content) > get_settings().max_upload_bytes:
        raise HTTPException(status_code=413, detail="Instagram session file is too large or empty")
    _STORAGE.mkdir(parents=True, exist_ok=True)
    path = _STORAGE / f"instagram-session-{secrets.token_hex(16)}.session"
    old_path: Path | None = None
    adapter = InstagramAdapter()
    try:
        path.write_bytes(content)
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass
        adapter.load_session(str(path), username)
        session = get_session_factory()()
        try:
            item = session.get(AppSettings, 1) or AppSettings(id=1)
            old_path = Path(item.instagram_session_file) if item.instagram_session_file else None
            item.instagram_username = username
            item.instagram_session_file = str(path)
            session.add(item)
            session.commit()
            response = _response(item)
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
        registry.register(adapter)
    except Exception as exc:
        path.unlink(missing_ok=True)
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=400, detail="Instagram session file could not be loaded") from None
    if old_path and old_path != path:
        old_path.unlink(missing_ok=True)
    return {**response, "configured": True, "check_status": "not_checked"}


@router.get("/instagram/status")
def instagram_status():
    item = _get()
    configured = bool(item.instagram_session_file and Path(item.instagram_session_file).is_file())
    adapter = registry.get("instagram")
    if adapter is None:
        return {"connected": False, "configured": configured, "status": "unknown_error"}
    try:
        valid, reason = adapter.check_session_valid()
        if valid:
            return {"connected": True, "configured": configured, "status": "connected", "reason": None, "message": "Instagram session aktif.", "retryable": False}
        detail = build_instagram_status(RuntimeError(reason or "unknown_error"))
        return {"connected": False, "configured": configured, **detail} 
    except Exception as exc:
        return {"connected": False, "configured": configured, **build_instagram_status(exc)}


@router.post("/instagram/check")
def instagram_check():
    return instagram_status()


@router.post("/instagram/disconnect")
def instagram_disconnect():
    session = get_session_factory()()
    try:
        item = session.get(AppSettings, 1)
        if item:
            session_file = item.instagram_session_file
            item.instagram_session_file = None
            item.instagram_username = ""
            session.commit()
            if session_file:
                Path(session_file).unlink(missing_ok=True)
        registry.register(type(registry.get("instagram"))())
        return {"connected": False, "status": "disconnected"}
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
