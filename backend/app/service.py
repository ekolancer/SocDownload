from __future__ import annotations

import asyncio
import uuid
from datetime import timedelta

from sqlalchemy import select, update

from .adapters.registry import detect_platform
from .db import Job, JobStatus, get_session_factory, now_wib
from .url_validation import validate_url

_queue: asyncio.Queue[int] | None = None

DEFAULT_LEASE_SECONDS = 300


def recover_jobs() -> None:
    factory = get_session_factory()
    with factory() as session:
        session.query(Job).filter(Job.status == JobStatus.RUNNING.value).update(
            {Job.status: JobStatus.QUEUED.value, Job.started_at: None, Job.lease_until: None, Job.lease_token: None, Job.error: "Recovered after restart"},
            synchronize_session=False,
        )
        job_ids = session.scalars(select(Job.id).where(Job.status == JobStatus.QUEUED.value)).all()
        session.commit()
    queue = get_queue()
    for job_id in job_ids:
        queue.put_nowait(job_id)


def claim_job(job_id: int, lease_seconds: int = DEFAULT_LEASE_SECONDS) -> str | None:
    """Claim a queued job by setting it RUNNING with a lease.

    Retained for callers that only need the claim step; ``DownloadJob`` claims
    internally during ``process``.
    """
    token = uuid.uuid4().hex
    now = now_wib()
    factory = get_session_factory()
    with factory() as session:
        result = session.execute(
            update(Job)
            .where(Job.id == job_id, Job.status == JobStatus.QUEUED.value)
            .values(
                status=JobStatus.RUNNING.value,
                started_at=now,
                lease_until=now + timedelta(seconds=lease_seconds),
                lease_token=token,
                attempts=Job.attempts + 1,
            )
        )
        if result.rowcount != 1:
            session.rollback()
            return None
        session.commit()
    return token


def get_queue() -> asyncio.Queue[int]:
    global _queue
    if _queue is None:
        _queue = asyncio.Queue()
    return _queue


def purge_queue() -> int:
    """Drain all pending job IDs from the in-memory queue."""
    q = get_queue()
    count = 0
    while not q.empty():
        try:
            q.get_nowait()
            q.task_done()
            count += 1
        except Exception:
            break
    return count


def enqueue(url: str) -> int:
    url = validate_url(url)
    adapter = detect_platform(url)
    platform = adapter.platform if adapter else "unknown"

    factory = get_session_factory()
    with factory() as session:
        active = session.scalars(
            select(Job).where(Job.url == url, Job.status.in_([JobStatus.QUEUED.value, JobStatus.RUNNING.value]))
        ).first()
        if active:
            return active.id
        job = Job(platform=platform, url=url, status=JobStatus.QUEUED.value)
        session.add(job)
        session.commit()
        job_id = job.id

    q = get_queue()
    try:
        q.put_nowait(job_id)
    except Exception:
        pass

    return job_id


def bulk_enqueue(urls: list[str], limit: int = 500) -> dict:
    """Bulk enqueue multiple URLs with smart deduplication and batch size limit.

    Skips URLs that have already been queued/processed in Job table or exist in MediaItem table.
    Caps newly enqueued URLs to `limit`, returning any remainder in `skipped_limit` so users can
    simply re-import the same file later.
    """
    if not urls:
        return {
            "enqueued": [],
            "skipped_dup": [],
            "skipped_limit": [],
            "skipped_invalid": [],
            "job_ids": [],
        }

    from .db import MediaItem

    valid_urls: list[str] = []
    skipped_invalid: list[str] = []
    for url in urls:
        try:
            valid_urls.append(validate_url(url))
        except ValueError:
            skipped_invalid.append(url)
    urls = valid_urls
    factory = get_session_factory()
    with factory() as session:
        existing_job_urls = set(
            session.scalars(
                select(Job.url).where(
                    Job.url.in_(urls),
                    Job.status.in_([JobStatus.QUEUED.value, JobStatus.RUNNING.value, JobStatus.DONE.value, JobStatus.DUP.value]),
                )
            ).all()
        )
        existing_media_urls = set(
            session.scalars(select(MediaItem.source_url).where(MediaItem.source_url.in_(urls))).all()
        )

    all_existing = existing_job_urls | existing_media_urls

    new_urls: list[str] = []
    skipped_dup: list[str] = []
    seen_urls: set[str] = set()
    for url in urls:
        if url in all_existing or url in seen_urls:
            skipped_dup.append(url)
        else:
            seen_urls.add(url)
            new_urls.append(url)

    to_enqueue = new_urls[:limit]
    skipped_limit = new_urls[limit:]

    if not to_enqueue:
        return {
            "enqueued": [],
            "skipped_dup": skipped_dup,
            "skipped_limit": skipped_limit,
            "skipped_invalid": skipped_invalid,
            "job_ids": [],
        }

    jobs_to_create = []
    for url in to_enqueue:
        adapter = detect_platform(url)
        platform = adapter.platform if adapter else "unknown"
        jobs_to_create.append(Job(platform=platform, url=url, status=JobStatus.QUEUED.value))

    with factory() as session:
        session.add_all(jobs_to_create)
        session.commit()
        job_ids = [j.id for j in jobs_to_create]

    q = get_queue()
    for job_id in job_ids:
        try:
            q.put_nowait(job_id)
        except Exception:
            pass

    return {
        "enqueued": to_enqueue,
        "skipped_dup": skipped_dup,
        "skipped_limit": skipped_limit,
        "skipped_invalid": skipped_invalid,
        "job_ids": job_ids,
    }
