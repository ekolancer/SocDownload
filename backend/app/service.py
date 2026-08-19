from __future__ import annotations

import asyncio

from .db import Job, JobStatus, get_session_factory


_queue: asyncio.Queue[int] | None = None


def get_queue() -> asyncio.Queue[int]:
    global _queue
    if _queue is None:
        _queue = asyncio.Queue()
    return _queue


def enqueue(url: str) -> int:
    from .adapters.registry import registry

    platform = registry.detect(url) or "unknown"
    factory = get_session_factory()
    with factory() as session:
        job = Job(platform=platform, url=url, status=JobStatus.QUEUED.value)
        session.add(job)
        session.commit()
        job_id = job.id
    return job_id


async def process_job(job_id: int) -> None:
    factory = get_session_factory()
    with factory() as session:
        job = session.get(Job, job_id)
        if job is None:
            return
        job.status = JobStatus.DONE.value
        job.finished_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
        session.commit()


def enqueue_and_run(url: str, timeout: float = 30.0) -> int:
    job_id = enqueue(url)
    _run_sync(job_id, timeout)
    return job_id


def _run_sync(job_id: int, timeout: float) -> None:
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(_drain_one(job_id, timeout))
    finally:
        loop.close()


async def _drain_one(job_id: int, timeout: float) -> None:
    await process_job(job_id)
