from __future__ import annotations

import asyncio
import os
import shutil
from pathlib import Path
import tempfile
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select, update

from .adapters.registry import detect_platform, registry
from .config import ROOT, get_settings
from .db import Job, JobStatus, MediaFile, MediaItem, get_session_factory, now_wib
from .url_validation import validate_url
from .video import normalize, probe, thumbnail

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


def claim_job(job_id: int, lease_seconds: int = 300) -> str | None:
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
        # Check existing URLs in jobs table (any status)
        existing_job_urls = set(
            session.scalars(
                select(Job.url).where(
                    Job.url.in_(urls),
                    Job.status.in_([JobStatus.QUEUED.value, JobStatus.RUNNING.value, JobStatus.DONE.value, JobStatus.DUP.value]),
                )
            ).all()
        )
        # Check existing URLs in media items table
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


def _sync_process_job(job_id: int) -> None:
    """Synchronous core job processing running inside a worker thread."""
    factory = get_session_factory()
    with factory() as session:
        job = session.get(Job, job_id)
        if not job:
            return

        try:
            job.url = validate_url(job.url)
        except ValueError as exc:
            job.status = JobStatus.FAILED.value
            job.error = str(exc)
            job.finished_at = now_wib()
            session.commit()
            return

        adapter = detect_platform(job.url)
        if not adapter:
            job.status = JobStatus.FAILED.value
            job.error = f"unsupported URL: {job.url}"
            job.finished_at = now_wib()
            session.commit()
            return

        # 1. URL-based dedup
        existing = existing_by_url(job.url)
        if existing:
            job.status = JobStatus.DUP.value
            job.finished_at = now_wib()
            job.lease_until = None
            job.lease_token = None
            session.commit()
            return

        # 2. Download to temp dir
        settings = get_settings()
        media_root = str((ROOT / settings.media_root).resolve())
        temp_dir = tempfile.mkdtemp(prefix="mv_dl_")
        final_files: list[str] = []
        downloaded: list[str] = []
        metadata_path: str | None = None

        try:
            downloaded = adapter.download(job.url, temp_dir)
            normalized = []
            for path in downloaded:
                if Path(path).suffix.lower() in {".mp4", ".ts", ".m2ts"}:
                    path = normalize(path)
                normalized.append(path)
            downloaded = normalized
            if not downloaded:
                job.status = JobStatus.FAILED.value
                job.error = "no_files_downloaded"
                job.finished_at = now_wib()
                session.commit()
                return

            hashes = compute_hashes(downloaded)
            first_hash = list(hashes.values())[0] if hashes else None

            # 3. Hash-based dedup
            if first_hash and existing_by_sha256(first_hash):
                job.status = JobStatus.DUP.value
                job.finished_at = now_wib()
                job.lease_until = None
                job.lease_token = None
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
            metadata_path = write_metadata(dest_dir, meta_dict)

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
                if mf.kind == "video":
                    try:
                        thumb, metadata = thumbnail(path)
                        mf.thumbnail_path = thumb
                        mf.width = metadata["width"]
                        mf.height = metadata["height"]
                        mf.duration = metadata["duration"]
                        mf.video_codec = metadata["video_codec"]
                        mf.audio_codec = metadata["audio_codec"]
                    except RuntimeError:
                        pass
                session.add(mf)

            job.status = JobStatus.DONE.value
            job.finished_at = now_wib()
            job.lease_until = None
            job.lease_token = None
            session.commit()

        except Exception as exc:
            for source, target in zip(downloaded, final_files):
                if os.path.exists(target) and not os.path.exists(source):
                    os.makedirs(os.path.dirname(source), exist_ok=True)
                    shutil.move(target, source)
            if metadata_path:
                try:
                    os.remove(metadata_path)
                except FileNotFoundError:
                    pass
            job.status = JobStatus.FAILED.value
            job.error = str(exc)
            job.finished_at = now_wib()
            job.lease_until = None
            job.lease_token = None
            session.commit()
            raise

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)


async def process_job(job_id: int) -> None:
    """Offload blocking job processing to thread pool so FastAPI event loop never hangs."""
    await asyncio.to_thread(_sync_process_job, job_id)

