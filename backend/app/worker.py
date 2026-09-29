from __future__ import annotations

import asyncio
import logging
import time

from .db import Job, JobStatus, now_wib
from .jobs import DownloadJob


logger = logging.getLogger(__name__)


class Worker:
    """Async loop that pulls job IDs from the queue and runs ``DownloadJob``.

    Lifecycle ownership (claim, download, dedup, persist, retry) lives in
    ``DownloadJob``; this module only schedules.
    """

    def __init__(self, queue: asyncio.Queue[int], n_workers: int = 2, cooldown_seconds: int = 3, download_job: DownloadJob | None = None) -> None:
        self.queue = queue
        self.n_workers = n_workers
        self.cooldown_seconds = cooldown_seconds
        self.download_job = download_job or DownloadJob()
        self._cooldown_state: dict = {"active": False, "remaining": 0, "next_job_id": None}
        self._has_processed_any: bool = False

    @property
    def cooldown_info(self) -> dict:
        return {
            "active": self._cooldown_state["active"],
            "remaining": self._cooldown_state["remaining"],
            "next_job_id": self._cooldown_state["next_job_id"],
            "cooldown_seconds": self.cooldown_seconds,
        }

    async def run(self) -> None:
        tasks = [asyncio.create_task(self._worker(i)) for i in range(self.n_workers)]
        await asyncio.gather(*tasks)

    async def _worker(self, idx: int) -> None:
        while True:
            job_id = await self.queue.get()
            started = time.perf_counter()
            try:
                from .observability import record_job

                # Apply the inter-job cooldown only after the first job.
                if self._has_processed_any and self.cooldown_seconds > 0:
                    self._cooldown_state["active"] = True
                    self._cooldown_state["next_job_id"] = job_id
                    for remaining in range(self.cooldown_seconds, 0, -1):
                        self._cooldown_state["remaining"] = remaining
                        await asyncio.sleep(1)
                    self._cooldown_state["active"] = False
                    self._cooldown_state["remaining"] = 0
                    self._cooldown_state["next_job_id"] = None

                self._has_processed_any = True
                await self._process(job_id)
            except Exception as exc:  # noqa: BLE001
                logger.exception(
                    "worker %s failed job %s: %s",
                    idx,
                    job_id,
                    exc,
                    extra={"event": {"code": "worker_job_failed", "severity": "error", "retryable": False, "job_id": job_id, "worker_id": idx, "operator_message": str(exc), "remediation": "Inspect job input and adapter health."}},
                )
                await self._set_failed(job_id, str(exc))
            finally:
                record_job("completed", time.perf_counter() - started)
                self.queue.task_done()

    async def _process(self, job_id: int) -> None:
        await asyncio.to_thread(self.download_job.process, job_id)

    async def _set_failed(self, job_id: int, error: str) -> None:
        """Last-resort guard: ``DownloadJob`` owns state; this only backstops."""

        def _update():
            from .db import get_session_factory

            with get_session_factory()() as session:
                job = session.get(Job, job_id)
                if job is None or job.status in (JobStatus.DONE.value, JobStatus.DUP.value):
                    return
                if job.status == JobStatus.QUEUED.value:
                    return
                job.status = JobStatus.FAILED.value
                job.error = error
                job.finished_at = now_wib()
                job.lease_until = None
                job.lease_token = None
                session.commit()

        await asyncio.to_thread(_update)
