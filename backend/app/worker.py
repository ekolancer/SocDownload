from __future__ import annotations

import asyncio
import logging

from .db import JobStatus, utcnow
from .db import Job


logger = logging.getLogger(__name__)


class Worker:
    def __init__(self, queue: asyncio.Queue[int], n_workers: int = 2) -> None:
        self.queue = queue
        self.n_workers = n_workers

    async def run(self) -> None:
        tasks = [asyncio.create_task(self._worker(i)) for i in range(self.n_workers)]
        await asyncio.gather(*tasks)

    async def _worker(self, idx: int) -> None:
        while True:
            job_id = await self.queue.get()
            try:
                await self._process(job_id)
            except Exception as exc:  # noqa: BLE001
                logger.exception("worker %s failed job %s: %s", idx, job_id, exc)
                await self._set_status(job_id, JobStatus.FAILED, str(exc))
            finally:
                self.queue.task_done()

    async def _process(self, job_id: int) -> None:
        from .service import process_job

        await self._set_status(job_id, JobStatus.RUNNING)
        await process_job(job_id)

    async def _set_status(self, job_id: int, status: JobStatus, error: str | None = None) -> None:
        from .db import get_session_factory

        factory = get_session_factory()
        with factory() as session:
            job = session.get(Job, job_id)
            if job is not None:
                job.status = status.value
                if error:
                    job.error = error
                if status == JobStatus.RUNNING:
                    job.started_at = utcnow()
                if status in (JobStatus.DONE, JobStatus.FAILED, JobStatus.DUP):
                    job.finished_at = utcnow()
                session.commit()
