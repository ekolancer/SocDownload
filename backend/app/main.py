from __future__ import annotations

from contextlib import asynccontextmanager
import logging
import pickle

from fastapi import FastAPI, Request
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
from .config import get_settings
from .db import init_db, Job, JobStatus, MediaItem, get_session_factory, utcnow
from sqlalchemy import update
from .routes import adapters, albums, autosync, health, importer, jobs, media
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
    if settings.instagram_session_file:
        import os

        if os.path.isfile(settings.instagram_session_file):
            try:
                instagram.load_session(settings.instagram_session_file, settings.instagram_username)
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
    if not settings.api_token or settings.api_token in {"change-me", "change-me-generate-via-keygen", "your-api-token"}:
        raise RuntimeError("API_TOKEN must be configured with a non-placeholder value")

    app = FastAPI(title="MediaVault", lifespan=lifespan)
    configure_logging()
    app.add_middleware(BaseHTTPMiddleware, dispatch=request_metrics_middleware(app))

    @app.middleware("http")
    async def api_auth(request: Request, call_next: Any):
        if request.url.path == "/api/health" and request.method == "GET" or request.method == "OPTIONS" or not request.url.path.startswith("/api"):
            return await call_next(request)
        authorization = request.headers.get("authorization", "")
        token = authorization[7:] if authorization.lower().startswith("bearer ") else ""
        if not compare_digest(token, settings.api_token):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(observability.router)
    app.include_router(importer.router)
    app.include_router(jobs.router)
    app.include_router(media.router)
    app.include_router(albums.router)
    app.include_router(adapters.router)
    app.include_router(autosync.router)
    return app



app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
