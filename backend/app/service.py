from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
from datetime import datetime

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


def get_queue() -> asyncio.Queue[int]:
    global _queue
    if _queue is None:
        _queue = asyncio.Queue()
    return _queue


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


async def process_job(job_id: int) -> None:
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
                posted_at=datetime.fromisoformat(res.posted_at) if res.posted_at else None,
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
