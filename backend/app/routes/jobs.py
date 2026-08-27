from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from ..config import get_settings
from sqlalchemy import delete, select, update, func, case

from ..db import Job, JobStatus, MediaItem, get_session_factory

router = APIRouter(prefix="/api", tags=["jobs"])


def _public_job_error(job: Job) -> str | None:
    if not job.error:
        return None
    if job.status == JobStatus.FAILED.value:
        return "Job failed"
    return job.error if job.error in {"no_files_downloaded"} else None


class JobCreate(BaseModel):
    url: str


@router.post("/jobs")
def create_job(body: JobCreate):
    from ..service import enqueue

    try:
        job_id = enqueue(body.url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"id": job_id, "status": "queued"}


@router.get("/jobs/stats")
def get_jobs_stats(request: Request):
    factory = get_session_factory()
    with factory() as session:
        # Group count by status
        raw_counts = session.execute(
            select(Job.status, func.count(Job.id)).group_by(Job.status)
        ).all()
        counts = {status: count for status, count in raw_counts}

        queued = counts.get(JobStatus.QUEUED.value, 0)
        running = counts.get(JobStatus.RUNNING.value, 0)
        done = counts.get(JobStatus.DONE.value, 0)
        failed = counts.get(JobStatus.FAILED.value, 0)
        dup = counts.get(JobStatus.DUP.value, 0)

        total = queued + running + done + failed + dup
        active_total = queued + running
        completed_total = done + failed + dup
        progress_percent = int((completed_total / total * 100)) if total > 0 else 100

        # Fetch currently running jobs
        running_jobs = session.scalars(
            select(Job)
            .where(Job.status == JobStatus.RUNNING.value)
            .order_by(Job.started_at.desc().nullslast())
            .limit(5)
        ).all()

        cooldown = {"active": False, "remaining": 0, "next_job_id": None, "cooldown_seconds": 3}
        if hasattr(request.app.state, "worker"):
            cooldown = request.app.state.worker.cooldown_info

        return {
            "total": total,
            "queued": queued,
            "running": running,
            "done": done,
            "failed": failed,
            "dup": dup,
            "active_total": active_total,
            "completed_total": completed_total,
            "progress_percent": progress_percent,
            "cooldown": cooldown,
            "running_jobs": [
                {
                    "id": j.id,
                    "platform": j.platform,
                    "url": j.url,
                    "started_at": j.started_at,
                }
                for j in running_jobs
            ],
        }


def _format_dt(dt):
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    if getattr(dt, "tzinfo", None) is None:
        from ..db import WIB
        dt = dt.replace(tzinfo=WIB)
    return dt.isoformat()


@router.get("/jobs")
def list_jobs(
    limit: int = Query(default=1000, ge=1),
    status: str | None = None,
):
    limit = min(limit, get_settings().list_limit)
    factory = get_session_factory()
    with factory() as session:
        status_priority = case(
            (Job.status == JobStatus.RUNNING.value, 1),
            (Job.status == JobStatus.FAILED.value, 2),
            (Job.status == JobStatus.DONE.value, 3),
            (Job.status == JobStatus.DUP.value, 4),
            (Job.status == JobStatus.QUEUED.value, 5),
            else_=6,
        )
        query = select(Job)
        if status and status != "all":
            if status == "active":
                query = query.where(Job.status.in_([JobStatus.RUNNING.value, JobStatus.QUEUED.value]))
            elif status == "done":
                query = query.where(Job.status.in_([JobStatus.DONE.value, JobStatus.DUP.value]))
            else:
                query = query.where(Job.status == status)

        query = query.order_by(status_priority, Job.finished_at.desc().nullslast(), Job.id.asc()).limit(limit)
        jobs = session.scalars(query).all()
        return [
            {
                "id": j.id,
                "platform": j.platform,
                "url": j.url,
                "status": j.status,
                "error": _public_job_error(j),
                "created_at": _format_dt(j.created_at),
                "started_at": _format_dt(j.started_at),
                "finished_at": _format_dt(j.finished_at),
            }
            for j in jobs
        ]



@router.post("/jobs/cancel-all")
def cancel_all_jobs():
    from ..service import purge_queue

    purged_count = purge_queue()
    factory = get_session_factory()
    with factory() as session:
        session.execute(update(MediaItem).values(job_id=None))
        session.execute(
            delete(Job).where(
                Job.status.in_([JobStatus.QUEUED.value, JobStatus.RUNNING.value])
            )
        )
        session.commit()
    return {"status": "cancelled", "purged": purged_count}


@router.delete("/jobs")
def clear_jobs(scope: str = "all"):
    from ..service import purge_queue

    purge_queue()
    factory = get_session_factory()
    with factory() as session:
        session.execute(update(MediaItem).values(job_id=None))
        if scope == "finished":
            session.execute(
                delete(Job).where(
                    Job.status.in_(
                        [
                            JobStatus.DONE.value,
                            JobStatus.FAILED.value,
                            JobStatus.DUP.value,
                        ]
                    )
                )
            )
        else:
            session.execute(delete(Job))
        session.commit()
    return {"status": "cleared", "scope": scope}



@router.get("/jobs/{job_id}")
def get_job(job_id: int):
    factory = get_session_factory()
    with factory() as session:
        job = session.get(Job, job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="job not found")
        return {
            "id": job.id,
            "platform": job.platform,
            "url": job.url,
            "status": job.status,
            "error": _public_job_error(job),
            "created_at": job.created_at,
            "started_at": job.started_at,
            "finished_at": job.finished_at,
        }


@router.delete("/jobs/{job_id}")
def delete_single_job(job_id: int):
    factory = get_session_factory()
    with factory() as session:
        job = session.get(Job, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="job not found")
        session.execute(update(MediaItem).where(MediaItem.job_id == job_id).values(job_id=None))
        session.delete(job)
        session.commit()
    return {"status": "deleted", "id": job_id}

