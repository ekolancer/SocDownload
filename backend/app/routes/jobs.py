from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select, update

from ..db import Job, JobStatus, MediaItem, get_session_factory

router = APIRouter(prefix="/api", tags=["jobs"])


class JobCreate(BaseModel):
    url: str


@router.post("/jobs")
def create_job(body: JobCreate):
    from ..service import enqueue

    job_id = enqueue(body.url)
    return {"id": job_id, "status": "queued"}


@router.get("/jobs")
def list_jobs(limit: int = 50):
    factory = get_session_factory()
    with factory() as session:
        jobs = session.scalars(select(Job).order_by(Job.created_at.desc()).limit(limit)).all()
        return [
            {
                "id": j.id,
                "platform": j.platform,
                "url": j.url,
                "status": j.status,
                "error": j.error,
                "created_at": j.created_at,
            }
            for j in jobs
        ]


@router.delete("/jobs")
def clear_jobs():
    factory = get_session_factory()
    with factory() as session:
        # Detach foreign keys from MediaItem first to keep media files safe
        session.execute(update(MediaItem).values(job_id=None))
        # Clear finished, failed, duplicate, or queued jobs (leaving running jobs if any)
        session.execute(
            delete(Job).where(
                Job.status.in_(
                    [
                        JobStatus.DONE.value,
                        JobStatus.FAILED.value,
                        JobStatus.DUP.value,
                        JobStatus.QUEUED.value,
                    ]
                )
            )
        )
        session.commit()
    return {"status": "cleared"}


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
            "error": job.error,
            "created_at": job.created_at,
            "started_at": job.started_at,
            "finished_at": job.finished_at,
        }
