from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from ..config import get_settings
from ..job_service import JobService

router = APIRouter(prefix="/api", tags=["jobs"])

_DEFAULT_COOLDOWN = {"active": False, "remaining": 0, "next_job_id": None, "cooldown_seconds": 3}


class JobCreate(BaseModel):
    url: str


def _service() -> JobService:
    from ..service import purge_queue

    return JobService(purge_queue=purge_queue)


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
    cooldown = _DEFAULT_COOLDOWN
    if hasattr(request.app.state, "worker"):
        cooldown = request.app.state.worker.cooldown_info
    return _service().stats(cooldown=cooldown)


@router.get("/jobs")
def list_jobs(
    limit: int = Query(default=100, ge=1),
    offset: int = Query(default=0, ge=0),
    status: str | None = None,
):
    limit = min(limit, get_settings().list_limit)
    return _service().list_jobs(limit=limit, offset=offset, status=status)


@router.post("/jobs/cancel-all")
def cancel_all_jobs():
    purged_count = _service().cancel_all()
    return {"status": "cancelled", "purged": purged_count}


@router.delete("/jobs")
def clear_jobs(scope: str = "all"):
    _service().clear_jobs(scope=scope)
    return {"status": "cleared", "scope": scope}


@router.get("/jobs/{job_id}")
def get_job(job_id: int):
    job = _service().get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return job


@router.delete("/jobs/{job_id}")
def delete_single_job(job_id: int):
    if not _service().delete_job(job_id):
        raise HTTPException(status_code=404, detail="job not found")
    return {"status": "deleted", "id": job_id}
