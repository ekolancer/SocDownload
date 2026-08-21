from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
from datetime import datetime

from sqlalchemy import select

from .adapters.registry import detect_platform, registry
from .config import ROOT, get_settings
from .db import Job, JobStatus, MediaFile, MediaItem, get_session_factory
from .downloader import (
    compute_hashes,
    existing_by_sha256,
    existing_by_url,
    organize,
    write_metadata,
)

_queue: asyncio.Queue[int] | None = None


def _parse_posted_at(value: str | None) -> datetime | None:
    if not value:
        return None
    for parser in (datetime.fromisoformat, lambda text: datetime.strptime(text, "%Y%m%d")):
        try:
            return parser(value)
        except ValueError:
            continue
    return None


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
    adapter = detect_platform(url)
    platform = adapter.platform if adapter else "unknown"

    factory = get_session_factory()
    with factory() as session:
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
            "job_ids": [],
        }

    factory = get_session_factory()
    with factory() as session:
        # Check existing URLs in jobs table (any status)
        existing_job_urls = set(
            session.scalars(select(Job.url).where(Job.url.in_(urls))).all()
        )
        # Check existing URLs in media items table
        existing_media_urls = set(
            session.scalars(select(MediaItem.source_url).where(MediaItem.source_url.in_(urls))).all()
        )

    all_existing = existing_job_urls | existing_media_urls

    new_urls: list[str] = []
    skipped_dup: list[str] = []
    for url in urls:
        if url in all_existing:
            skipped_dup.append(url)
        else:
            new_urls.append(url)

    to_enqueue = new_urls[:limit]
    skipped_limit = new_urls[limit:]

    if not to_enqueue:
        return {
            "enqueued": [],
            "skipped_dup": skipped_dup,
            "skipped_limit": skipped_limit,
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
        "job_ids": job_ids,
    }


def _sync_process_job(job_id: int) -> None:
    """Synchronous core job processing running inside a worker thread."""
    factory = get_session_factory()
    with factory() as session:
        job = session.get(Job, job_id)
        if not job:
            return

        adapter = detect_platform(job.url)
        if not adapter:
            job.status = JobStatus.FAILED.value
            job.error = f"unsupported URL: {job.url}"
            job.finished_at = datetime.utcnow()
            session.commit()
            return

        # 1. URL-based dedup
        existing = existing_by_url(job.url)
        if existing:
            job.status = JobStatus.DUP.value
            job.finished_at = datetime.utcnow()
            session.commit()
            return

        # 2. Download to temp dir
        settings = get_settings()
        media_root = str((ROOT / settings.media_root).resolve())
        temp_dir = tempfile.mkdtemp(prefix="mv_dl_")

        try:
            downloaded = adapter.download(job.url, temp_dir)
            if not downloaded:
                job.status = JobStatus.FAILED.value
                job.error = "no_files_downloaded"
                job.finished_at = datetime.utcnow()
                session.commit()
                return

            hashes = compute_hashes(downloaded)
            first_hash = list(hashes.values())[0] if hashes else None

            # 3. Hash-based dedup
            if first_hash and existing_by_sha256(first_hash):
                job.status = JobStatus.DUP.value
                job.finished_at = datetime.utcnow()
                session.commit()
                return

            # 4. Resolve metadata
            res = adapter.resolve(job.url)

            # 5. Move files
            final_files = organize(
                media_root,
                adapter.platform,
                res.username,
                res.posted_at,
                downloaded,
            )

            # 6. Write sidecar metadata.json
            dest_dir = os.path.dirname(final_files[0]) if final_files else temp_dir
            meta_dict = {
                "platform": adapter.platform,
                "source_url": job.url,
                "username": res.username,
                "caption": res.caption,
                "posted_at": res.posted_at,
                "hashtags": res.hashtags,
                "files": [os.path.basename(f) for f in final_files],
            }
            write_metadata(dest_dir, meta_dict)

            # 7. Save DB records
            item = MediaItem(
                job_id=job.id,
                platform=adapter.platform,
                source_url=job.url,
                username=res.username,
                caption=res.caption,
                posted_at=_parse_posted_at(res.posted_at),
                hashtags=",".join(res.hashtags) if res.hashtags else None,
                sha256=first_hash,
            )
            session.add(item)
            session.flush()

            for f, path in zip(downloaded, final_files):
                mf = MediaFile(
                    media_item_id=item.id,
                    path=path,
                    kind="video" if path.endswith((".mp4", ".mkv", ".webm")) else "image",
                    sha256=hashes.get(f),
                )
                session.add(mf)

            job.status = JobStatus.DONE.value
            job.finished_at = datetime.utcnow()
            session.commit()

        except Exception as exc:
            job.status = JobStatus.FAILED.value
            job.error = str(exc)
            job.finished_at = datetime.utcnow()
            session.commit()
            raise
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)


async def process_job(job_id: int) -> None:
    """Offload blocking job processing to thread pool so FastAPI event loop never hangs."""
    await asyncio.to_thread(_sync_process_job, job_id)

