from __future__ import annotations

from contextlib import asynccontextmanager
import logging
import pickle

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from secrets import compare_digest
from typing import Any
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from .observability import configure_logging, request_metrics_middleware

from .adapters.facebook import FacebookAdapter
from .adapters.instagram import InstagramAdapter
from .adapters.pinterest import PinterestAdapter
from .adapters.reddit import RedditAdapter
from .adapters.registry import registry
from .adapters.threads import ThreadsAdapter
from .adapters.tiktok import TikTokAdapter
from .adapters.x import XAdapter
from .adapters.youtube import YouTubeAdapter
from .adapters.vidara import VidaraAdapter
from .config import get_settings
from .db import init_db, Job, JobStatus, MediaItem, get_session_factory, utcnow
from .errors import AppError, error_envelope, map_exception
from sqlalchemy import update
from .routes import adapters, albums, auth, autosync, console, health, importer, jobs, media, settings as settings_route
from . import observability
from .scheduler import check_adapters_health, start_scheduler
from .service import get_queue, recover_jobs
from .worker import Worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    recover_jobs()
    instagram = InstagramAdapter()
    settings = get_settings()
    from .db import AppSettings
    with get_session_factory()() as session:
        stored_settings = session.get(AppSettings, 1)
    session_file = stored_settings.instagram_session_file if stored_settings else None
    username = stored_settings.instagram_username if stored_settings else ""
    if session_file and username:
        import os
        if os.path.isfile(session_file):
            try:
                instagram.load_session(session_file, username)
            except (OSError, ValueError, EOFError, UnicodeError, pickle.UnpicklingError) as exc:
                logging.getLogger(__name__).warning("Instagram session could not be loaded: %s", type(exc).__name__)
    registry.register(instagram)
    registry.register(XAdapter())
    registry.register(ThreadsAdapter())
    registry.register(YouTubeAdapter())
    registry.register(RedditAdapter())
    registry.register(PinterestAdapter())
    # registry.register(FacebookAdapter())  # Temporarily disabled
    registry.register(TikTokAdapter())
    registry.register(VidaraAdapter())
    check_adapters_health()
    start_scheduler()
    worker = Worker(get_queue(), n_workers=2, cooldown_seconds=settings.job_cooldown_seconds)
    app.state.worker = worker
    task = __import__("asyncio").create_task(worker.run())
    try:
        yield
    finally:
        task.cancel()


def create_app() -> FastAPI:
    settings = get_settings()
    if (not settings.api_token or settings.api_token in {"change-me", "change-me-generate-via-keygen", "your-api-token"}) and not (settings.auth_password_hash and settings.auth_session_secret):
        raise RuntimeError("API_TOKEN or password authentication must be configured")

    app = FastAPI(title="MediaVault", lifespan=lifespan)
    configure_logging()

    @app.exception_handler(AppError)
    @app.exception_handler(HTTPException)
    @app.exception_handler(RequestValidationError)
    async def handled_exception(request: Request, exc: Exception):
        if isinstance(exc, RequestValidationError):
            exc = AppError("invalid_request", operator_message="Request validation failed", context={"errors": exc.errors()})
        info = map_exception(exc)
        logging.getLogger("api").log(logging.WARNING if info.status < 500 else logging.ERROR, info.operator_message, extra={"event": {"code": info.code, "severity": info.severity, "path": request.url.path, "retryable": info.retryable}})
        return JSONResponse(error_envelope(exc, request.headers.get("x-request-id", "-")), status_code=info.status)

    @app.exception_handler(Exception)
    async def unhandled_exception(request: Request, exc: Exception):
        logging.getLogger(__name__).exception("unhandled request exception", extra={"event": {"code": "internal_error", "severity": "critical", "path": request.url.path}})
        return JSONResponse(error_envelope(exc, request.headers.get("x-request-id", "-")), status_code=500)

    app.add_middleware(BaseHTTPMiddleware, dispatch=request_metrics_middleware(app))

    @app.middleware("http")
    async def api_auth(request: Request, call_next: Any):
        if request.url.path == "/api/health" and request.method == "GET" or request.url.path.startswith("/api/auth") or request.method == "OPTIONS" or not request.url.path.startswith("/api"):
            return await call_next(request)
        authorization = request.headers.get("authorization", "")
        token = authorization[7:] if authorization.lower().startswith("bearer ") else ""
        session_valid = auth.valid_session(request)
        if not session_valid and not compare_digest(token, settings.api_token):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(observability.router)
    app.include_router(console.router)
    app.include_router(importer.router)
    app.include_router(jobs.router)
    app.include_router(media.router)
    app.include_router(albums.router)
    app.include_router(adapters.router)
    app.include_router(autosync.router)
    app.include_router(settings_route.router)
    return app



app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
