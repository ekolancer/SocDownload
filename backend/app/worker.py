from __future__ import annotations

import asyncio
import logging

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
            try:
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
                logger.exception("worker %s failed job %s: %s", idx, job_id, exc)
                await self._set_status(job_id, JobStatus.FAILED, str(exc))
            finally:
                self.queue.task_done()

    async def _process(self, job_id: int) -> None:
        from .service import process_job
        from .db import get_session_factory

        def _should_process() -> bool:
            factory = get_session_factory()
            with factory() as session:
                job = session.get(Job, job_id)
                return bool(job and job.status in (JobStatus.QUEUED.value, JobStatus.RUNNING.value))

        should = await asyncio.to_thread(_should_process)
        if not should:
            return

        await self._set_status(job_id, JobStatus.RUNNING)
        await process_job(job_id)

    async def _set_status(self, job_id: int, status: JobStatus, error: str | None = None) -> None:
        from .db import get_session_factory

        def _update():
            factory = get_session_factory()
            with factory() as session:
                job = session.get(Job, job_id)
                if job is not None:
                    job.status = status.value
                    if error:
                        job.error = error
                    if status == JobStatus.RUNNING:
                        job.started_at = now_wib()
                    if status in (JobStatus.DONE, JobStatus.FAILED, JobStatus.DUP):
                        job.finished_at = now_wib()

                    session.commit()

        await asyncio.to_thread(_update)

