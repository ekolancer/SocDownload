from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .adapters.instagram import InstagramAdapter
from .adapters.registry import registry
from .adapters.threads import ThreadsAdapter
from .adapters.x import XAdapter
from .config import get_settings
from .db import init_db
from .routes import adapters, health, importer, jobs, media
from .service import get_queue
from .worker import Worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    registry.register(InstagramAdapter())
    registry.register(XAdapter())
    registry.register(ThreadsAdapter())
    worker = Worker(get_queue(), n_workers=2)
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
    app.include_router(adapters.router)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
