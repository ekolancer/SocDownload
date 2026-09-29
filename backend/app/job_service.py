from __future__ import annotations

from datetime import datetime

from sqlalchemy import case, delete, func, select, update

from .db import Job, JobStatus, MediaItem, WIB, get_session_factory

_PUBLIC_ERRORS = {"no_files_downloaded"}

# Fields exposed for a job, shared by list and single-item reads.
_JOB_FIELDS = (
    "id",
    "platform",
    "url",
    "status",
    "progress_percent",
    "bytes_downloaded",
    "total_bytes",
    "progress_stage",
    "transfer_speed",
    "eta_seconds",
)

_STATUS_PRIORITY = case(
    (Job.status == JobStatus.RUNNING.value, 1),
    (Job.status == JobStatus.FAILED.value, 2),
    (Job.status == JobStatus.DONE.value, 3),
    (Job.status == JobStatus.DUP.value, 4),
    (Job.status == JobStatus.QUEUED.value, 5),
    else_=6,
)

_STATUS_GROUPS = {
    "active": [JobStatus.RUNNING.value, JobStatus.QUEUED.value],
    "done": [JobStatus.DONE.value, JobStatus.DUP.value],
}

_FINISHED = [JobStatus.DONE.value, JobStatus.FAILED.value, JobStatus.DUP.value]


def public_job_error(job: Job) -> str | None:
    if not job.error:
        return None
    if job.status == JobStatus.FAILED.value:
        return "Job failed"
    return job.error if job.error in _PUBLIC_ERRORS else None


def format_dt(value: datetime | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if getattr(value, "tzinfo", None) is None:
        value = value.replace(tzinfo=WIB)
    return value.isoformat()


def serialize_job(job: Job, *, format_dates: bool = True) -> dict:
    """One shape for a job row, used by both list and detail endpoints."""
    payload = {field: getattr(job, field) for field in _JOB_FIELDS}
    payload["error"] = public_job_error(job)
    if format_dates:
        payload["created_at"] = format_dt(job.created_at)
        payload["started_at"] = format_dt(job.started_at)
        payload["finished_at"] = format_dt(job.finished_at)
    else:
        payload["created_at"] = job.created_at
        payload["started_at"] = job.started_at
        payload["finished_at"] = job.finished_at
    return payload


class JobService:
    """Read and prune download jobs behind one interface.

    Takes a session factory so tests can run it against an in-memory DB; a
    queue-purging callable is injected so the service stays free of the
    in-process queue.
    """

    def __init__(self, session_factory=None, purge_queue=None) -> None:
        self._session_factory = session_factory or get_session_factory()
        self._purge_queue = purge_queue

    def _purge(self) -> int:
        return self._purge_queue() if self._purge_queue else 0

    def list_jobs(self, *, limit: int, offset: int, status: str | None) -> list[dict]:
        with self._session_factory() as session:
            query = select(Job)
            if status and status != "all":
                if status in _STATUS_GROUPS:
                    query = query.where(Job.status.in_(_STATUS_GROUPS[status]))
                else:
                    query = query.where(Job.status == status)
            query = (
                query.order_by(_STATUS_PRIORITY, Job.finished_at.desc().nullslast(), Job.id.asc())
                .offset(offset)
                .limit(limit)
            )
            return [serialize_job(job) for job in session.scalars(query).all()]

    def get_job(self, job_id: int) -> dict | None:
        with self._session_factory() as session:
            job = session.get(Job, job_id)
            return serialize_job(job, format_dates=False) if job else None

    def stats(self, *, cooldown: dict) -> dict:
        with self._session_factory() as session:
            counts = {
                status: count
                for status, count in session.execute(select(Job.status, func.count(Job.id)).group_by(Job.status)).all()
            }
            queued = counts.get(JobStatus.QUEUED.value, 0)
            running = counts.get(JobStatus.RUNNING.value, 0)
            done = counts.get(JobStatus.DONE.value, 0)
            failed = counts.get(JobStatus.FAILED.value, 0)
            dup = counts.get(JobStatus.DUP.value, 0)
            total = queued + running + done + failed + dup
            completed_total = done + failed + dup

            running_jobs = session.scalars(
                select(Job)
                .where(Job.status == JobStatus.RUNNING.value)
                .order_by(Job.started_at.desc().nullslast())
                .limit(5)
            ).all()

        return {
            "total": total,
            "queued": queued,
            "running": running,
            "done": done,
            "failed": failed,
            "dup": dup,
            "active_total": queued + running,
            "completed_total": completed_total,
            "progress_percent": int(completed_total / total * 100) if total > 0 else 100,
            "cooldown": cooldown,
            "running_jobs": [
                {"id": j.id, "platform": j.platform, "url": j.url, "started_at": j.started_at}
                for j in running_jobs
            ],
        }

    def cancel_all(self) -> int:
        purged = self._purge()
        with self._session_factory() as session:
            session.execute(update(MediaItem).values(job_id=None))
            session.execute(delete(Job).where(Job.status.in_(_STATUS_GROUPS["active"])))
            session.commit()
        return purged

    def clear_jobs(self, scope: str = "all") -> None:
        self._purge()
        with self._session_factory() as session:
            session.execute(update(MediaItem).values(job_id=None))
            if scope == "finished":
                session.execute(delete(Job).where(Job.status.in_(_FINISHED)))
            else:
                session.execute(delete(Job))
            session.commit()

    def delete_job(self, job_id: int) -> bool:
        with self._session_factory() as session:
            job = session.get(Job, job_id)
            if not job:
                return False
            session.execute(update(MediaItem).where(MediaItem.job_id == job_id).values(job_id=None))
            session.delete(job)
            session.commit()
            return True
