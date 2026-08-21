from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
from .routes import adapters, albums, health, importer, jobs, media
from .scheduler import check_adapters_health, start_scheduler
from .service import get_queue
from .worker import Worker


def cleanup_orphan_jobs() -> None:
    """Wipe out all leftover queued and running jobs when server restarts so the queue is fresh."""
    from sqlalchemy import delete
    factory = get_session_factory()
    with factory() as session:
        session.execute(update(MediaItem).values(job_id=None))
        session.execute(
            delete(Job).where(
                Job.status.in_([JobStatus.RUNNING.value, JobStatus.QUEUED.value])
            )
        )
        session.commit()



@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    cleanup_orphan_jobs()
    instagram = InstagramAdapter()
    settings = get_settings()
    if settings.instagram_session_file:
        import os

        if os.path.isfile(settings.instagram_session_file):
            instagram.load_session(settings.instagram_session_file, settings.instagram_username)
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
    app = FastAPI(title="MediaVault", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(importer.router)
    app.include_router(jobs.router)
    app.include_router(media.router)
    app.include_router(albums.router)
    app.include_router(adapters.router)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
