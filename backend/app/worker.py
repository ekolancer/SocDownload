from __future__ import annotations

import asyncio
import logging
import time

from .db import Job, JobStatus, now_wib



logger = logging.getLogger(__name__)


class Worker:
    def __init__(self, queue: asyncio.Queue[int], n_workers: int = 2, cooldown_seconds: int = 3) -> None:
        self.queue = queue
        self.n_workers = n_workers
        self.cooldown_seconds = cooldown_seconds
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
                # If jobs have already been processed, apply the delay before the next job
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
                logger.exception("worker %s failed job %s: %s", idx, job_id, exc, extra={"event": {"code": "worker_job_failed", "severity": "error", "retryable": False, "job_id": job_id, "worker_id": idx, "operator_message": str(exc), "remediation": "Inspect job input and adapter health."}})
                await self._set_status(job_id, JobStatus.FAILED, str(exc))
            finally:
                record_job("completed", time.perf_counter() - started)
                self.queue.task_done()

    async def _process(self, job_id: int) -> None:
        from .service import process_job
        from .db import get_session_factory

        from .service import claim_job


        token = await asyncio.to_thread(claim_job, job_id)
        if not token:
            return
        await process_job(job_id)

    async def _set_status(self, job_id: int, status: JobStatus, error: str | None = None) -> None:
        from .db import get_session_factory
        from .service import get_queue

        def _update():
            factory = get_session_factory()
            with factory() as session:
                job = session.get(Job, job_id)
                if job is not None:
                    job.status = status.value
                    if error:
                        job.error = error
                    if status == JobStatus.FAILED:
                        from .instagram_errors import InstagramErrorCategory, classify_instagram_error

                        category = classify_instagram_error(job.error or "")
                        retryable = category == InstagramErrorCategory.NETWORK_ERROR
                        if retryable and job.attempts < 3:
                            job.status = JobStatus.QUEUED.value
                            job.finished_at = None
                            job.lease_until = None
                            job.lease_token = None
                            session.commit()
                            delay = min(30, 2 ** max(0, job.attempts - 1))
                            asyncio.get_running_loop().call_later(delay, get_queue().put_nowait, job_id)
                            return
                    if status == JobStatus.RUNNING:
                        job.started_at = now_wib()
                    if status in (JobStatus.DONE, JobStatus.FAILED, JobStatus.DUP):
                        job.finished_at = now_wib()
                        job.lease_until = None
                        job.lease_token = None

                    session.commit()

        await asyncio.to_thread(_update)

