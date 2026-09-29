from __future__ import annotations

import logging
import os
import shutil
import tempfile
import time
import uuid
from collections.abc import Callable
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import select, update

from .adapters.registry import detect_platform
from .config import ROOT, get_settings
from .db import Job, JobStatus, MediaFile, MediaItem, get_session_factory, now_wib
from .download_errors import DownloadErrorCategory, classify_download_error, is_retryable
from .downloader import (
    compute_hashes,
    existing_by_sha256,
    existing_by_url,
    organize,
    write_metadata,
)
from .url_validation import validate_url
from .video import classify_media, normalize, thumbnail

logger = logging.getLogger(__name__)

PROGRESS_THROTTLE_SECONDS = 0.5
DEFAULT_LEASE_SECONDS = 300
DEFAULT_MAX_ATTEMPTS = 3


def log_download(code: str, message: str, **event: object) -> None:
    logger.info(message, extra={"event": {"code": code, "severity": "info", **event}})


def _parse_posted_at(value: str | None) -> datetime | None:
    if not value:
        return None
    for parser in (datetime.fromisoformat, lambda text: datetime.strptime(text, "%Y%m%d")):
        try:
            return parser(value)
        except ValueError:
            continue
    return None


class DownloadJob:
    """Owns one job's lifecycle: claim -> download -> dedup -> organize -> persist.

    Dependencies are injected so the module is testable through its single
    ``process`` interface:

    - ``session_factory``: SQLAlchemy session factory (prod or in-memory).
    - ``media_root``: where organised media is written.
    - ``adapter_of``: maps a URL to its adapter (defaults to the registry).
    - ``clock``: monotonic clock used for progress throttling.

    ``process(job_id)`` returns the resulting status string, or ``None`` when the
    claim was declined (job not queued / already leased).
    """

    def __init__(
        self,
        *,
        session_factory: Callable | None = None,
        media_root: str | None = None,
        adapter_of: Callable[[str], object] | None = None,
        clock: Callable[[], float] = time.monotonic,
        lease_seconds: int = DEFAULT_LEASE_SECONDS,
        max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    ) -> None:
        self._session_factory = session_factory or get_session_factory()
        self._media_root = media_root
        self._adapter_of = adapter_of or detect_platform
        self._clock = clock
        self._lease_seconds = lease_seconds
        self._max_attempts = max_attempts

    # -- public interface -------------------------------------------------

    def process(self, job_id: int) -> str | None:
        if not self._claim(job_id):
            return None

        with self._session_factory() as session:
            job = session.get(Job, job_id)
            if job is None:
                return None

            try:
                final = self._run(session, job)
            except Exception as exc:  # noqa: BLE001
                final = self._handle_failure(session, job, exc)
            return final

    def _claim(self, job_id: int) -> bool:
        token = uuid.uuid4().hex
        now = now_wib()
        with self._session_factory() as session:
            result = session.execute(
                update(Job)
                .where(Job.id == job_id, Job.status == JobStatus.QUEUED.value)
                .values(
                    status=JobStatus.RUNNING.value,
                    started_at=now,
                    lease_until=now + timedelta(seconds=self._lease_seconds),
                    lease_token=token,
                    attempts=Job.attempts + 1,
                )
            )
            if result.rowcount != 1:
                session.rollback()
                return False
            session.commit()
        return True

    # -- core lifecycle ---------------------------------------------------

    def _run(self, session, job: Job) -> str:
        media_root = self._resolve_media_root()

        try:
            job.url = validate_url(job.url)
        except ValueError as exc:
            job.status = JobStatus.FAILED.value
            job.error = str(exc)
            job.finished_at = now_wib()
            session.commit()
            log_download("download_failed", "Download gagal: URL tidak valid", job_id=job.id, status="failed", error_code="invalid_url", retryable=False)
            return job.status

        adapter = self._adapter_of(job.url)
        if not adapter:
            job.status = JobStatus.FAILED.value
            job.error = f"unsupported URL: {job.url}"
            job.finished_at = now_wib()
            session.commit()
            return job.status

        # 1. URL-based dedup.
        if existing_by_url(job.url, self._session_factory):
            return self._mark_duplicate(session, job)

        log_download("download_started", f"Download media dari {adapter.platform} dimulai", job_id=job.id, status="running", platform=adapter.platform)
        job.progress_stage = "downloading"
        session.commit()

        os.makedirs(media_root, exist_ok=True)
        temp_dir = tempfile.mkdtemp(prefix=".mv_dl_", dir=media_root)
        final_files: list[str] = []
        downloaded: list[str] = []
        metadata_path: str | None = None

        try:
            downloaded = self._download(adapter, job, temp_dir)
            if not downloaded:
                job.status = JobStatus.FAILED.value
                job.error = "no_files_downloaded"
                job.finished_at = now_wib()
                session.commit()
                log_download("download_failed", f"Download media dari {adapter.platform} gagal: tidak ada file", job_id=job.id, status="failed", error_code="no_files_downloaded", platform=adapter.platform)
                return job.status

            job.progress_stage = "processing"
            job.progress_percent = None
            session.commit()

            hashes = compute_hashes(downloaded)
            first_hash = next(iter(hashes.values()), None)

            # 2. Hash-based dedup.
            if first_hash and existing_by_sha256(first_hash, self._session_factory):
                return self._mark_duplicate(session, job)

            res = adapter.resolve(job.url)
            final_files = organize(media_root, adapter.platform, res.username, res.posted_at, downloaded)
            dest_dir = os.path.dirname(final_files[0]) if final_files else temp_dir
            metadata_path = write_metadata(
                dest_dir,
                {
                    "platform": adapter.platform,
                    "source_url": job.url,
                    "username": res.username,
                    "caption": res.caption,
                    "posted_at": res.posted_at,
                    "hashtags": res.hashtags,
                    "files": [os.path.basename(f) for f in final_files],
                },
            )

            self._persist(session, job, adapter, res, downloaded, final_files, hashes, first_hash)
            job.status = JobStatus.DONE.value
            job.progress_percent = 100
            job.progress_stage = "done"
            job.finished_at = now_wib()
            job.lease_until = None
            job.lease_token = None
            session.commit()
            log_download("download_succeeded", f"Download media dari {adapter.platform} berhasil", job_id=job.id, status="done", platform=adapter.platform, files=len(final_files))
            return job.status

        except Exception as exc:
            self._rollback_files(downloaded, final_files, metadata_path)
            raise
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _download(self, adapter, job: Job, temp_dir: str) -> list[str]:
        on_progress = self._progress_writer(job.id)
        try:
            downloaded = adapter.download(job.url, temp_dir, on_progress=on_progress)
        except TypeError:
            # Adapter does not accept on_progress.
            downloaded = adapter.download(job.url, temp_dir)
        return [
            normalize(path) if Path(path).suffix.lower() in {".mp4", ".ts", ".m2ts"} else path
            for path in downloaded
        ]

    def _persist(self, session, job: Job, adapter, res, downloaded: list[str], final_files: list[str], hashes: dict[str, str], first_hash: str | None) -> None:
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
            media_file = MediaFile(media_item_id=item.id, path=path, kind=classify_media(path), sha256=hashes.get(f))
            if media_file.kind in {"image", "video"}:
                try:
                    thumb, metadata = thumbnail(path)
                    media_file.thumbnail_path = thumb
                    media_file.width = metadata["width"]
                    media_file.height = metadata["height"]
                    media_file.duration = metadata["duration"]
                    media_file.video_codec = metadata["video_codec"]
                    media_file.audio_codec = metadata["audio_codec"]
                except RuntimeError:
                    pass
            session.add(media_file)

    # -- failure / retry --------------------------------------------------

    def _handle_failure(self, session, job: Job, exc: Exception) -> str:
        self._set_failed(session, job, exc)
        category = classify_download_error(exc)
        retryable = is_retryable(category) and job.attempts < self._max_attempts
        log_download(
            "download_failed",
            f"Download gagal: {category.value}",
            job_id=job.id,
            status="failed",
            platform=job.platform,
            error_code=category.value,
            retryable=retryable,
        )
        if retryable:
            job.status = JobStatus.QUEUED.value
            job.finished_at = None
            job.lease_until = None
            job.lease_token = None
            session.commit()
            return job.status
        job.status = JobStatus.FAILED.value
        session.commit()
        return job.status

    def _set_failed(self, session, job: Job, exc: BaseException) -> None:
        job.status = JobStatus.FAILED.value
        job.error = str(exc)
        job.lease_until = None
        job.lease_token = None

    # -- helpers ----------------------------------------------------------

    def _mark_duplicate(self, session, job: Job) -> str:
        job.status = JobStatus.DUP.value
        job.progress_stage = "duplicate"
        job.finished_at = now_wib()
        job.lease_until = None
        job.lease_token = None
        session.commit()
        return job.status

    def _resolve_media_root(self) -> str:
        if self._media_root is not None:
            return str(Path(self._media_root).resolve())
        settings = get_settings()
        return str((ROOT / settings.media_root).resolve())

    def _progress_writer(self, job_id: int) -> Callable:
        last = {"at": 0.0}

        def update_progress(bytes_downloaded: int, total_bytes: int | None, speed: float | None, eta_seconds: int | None, stage: str = "downloading") -> None:
            now = self._clock()
            if now - last["at"] < PROGRESS_THROTTLE_SECONDS and total_bytes and bytes_downloaded < total_bytes:
                return
            last["at"] = now
            with self._session_factory() as progress_session:
                progress_job = progress_session.get(Job, job_id)
                if progress_job is None:
                    return
                progress_job.bytes_downloaded = bytes_downloaded
                progress_job.total_bytes = total_bytes
                progress_job.transfer_speed = speed
                progress_job.eta_seconds = eta_seconds
                progress_job.progress_stage = stage
                progress_job.progress_percent = min(99, int(bytes_downloaded * 100 / total_bytes)) if total_bytes else None
                progress_session.commit()

        return update_progress

    @staticmethod
    def _rollback_files(downloaded: list[str], final_files: list[str], metadata_path: str | None) -> None:
        for source, target in zip(downloaded, final_files):
            if os.path.exists(target) and not os.path.exists(source):
                os.makedirs(os.path.dirname(source), exist_ok=True)
                shutil.move(target, source)
        if metadata_path:
            try:
                os.remove(metadata_path)
            except FileNotFoundError:
                pass
