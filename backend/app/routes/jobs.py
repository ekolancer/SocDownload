from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import Job, get_session_factory

router = APIRouter(prefix="/api", tags=["jobs"])


class JobCreate(BaseModel):
    url: str


@router.post("/jobs")
def create_job(body: JobCreate):
    from ..service import enqueue

    job_id = enqueue(body.url)
    return {"id": job_id, "status": "queued"}


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
        }
