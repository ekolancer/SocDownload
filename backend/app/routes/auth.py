from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
from http.cookies import SimpleCookie

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse

from ..config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
COOKIE_NAME = "mediavault_session"


class LoginPayload(BaseModel):
    password: str = Field(min_length=1, max_length=512)


def _password_ok(password: str, encoded: str) -> bool:
    try:
        algorithm, rounds, salt, expected = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(rounds))
        return hmac.compare_digest(base64.urlsafe_b64encode(actual).decode(), expected)
    except (ValueError, TypeError):
        return False


def _session_value(secret: str) -> str:
    payload = f"{int(time.time())}.{int(time.time())}.{secrets.token_urlsafe(32)}"
    signature = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def valid_session(request: Request) -> bool:
    value = request.cookies.get(COOKIE_NAME, "")
    payload, separator, signature = value.rpartition(".")
    if not separator or not payload or not hmac.compare_digest(signature, hmac.new(get_settings().auth_session_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()):
        return False
    try:
        issued_at, last_seen, _ = payload.split('.', 2)
        issued_at = int(issued_at)
        last_seen = int(last_seen)
    except ValueError:
        return False
    settings = get_settings()
    now = time.time()
    return now - issued_at <= settings.auth_session_ttl_seconds and now - last_seen <= settings.auth_idle_timeout_seconds


@router.post("/login")
async def login(payload: LoginPayload, request: Request):
    password = payload.password
    settings = get_settings()
    if not settings.auth_password_hash or not settings.auth_session_secret or not _password_ok(password, settings.auth_password_hash):
        return JSONResponse({"detail": "Invalid credentials"}, status_code=401)
    result = JSONResponse({"authenticated": True})
    result.set_cookie(COOKIE_NAME, _session_value(settings.auth_session_secret), httponly=True, samesite="lax", secure=request.url.scheme == "https", max_age=settings.auth_session_ttl_seconds, path="/")
    return result


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"authenticated": False}


@router.get("/me")
def me(request: Request):
    if not valid_session(request):
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return {"authenticated": True}
