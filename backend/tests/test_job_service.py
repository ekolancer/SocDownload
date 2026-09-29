from __future__ import annotations

from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db import Base, Job, JobStatus, MediaItem
from backend.app.job_service import JobService, serialize_job


@pytest.fixture()
def session_factory(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'jobs.db').as_posix()}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture()
def service(session_factory):
    return JobService(session_factory=session_factory)


def _seed(factory):
    base = datetime(2026, 1, 1, 12, 0, 0)
    with factory() as session:
        session.add_all([
            Job(id=1, platform="instagram", url="https://ig/1", status=JobStatus.DONE.value, created_at=base),
            Job(id=2, platform="x", url="https://x/2", status=JobStatus.FAILED.value, error="boom", created_at=base),
            Job(id=3, platform="x", url="https://x/3", status=JobStatus.QUEUED.value, created_at=base),
            Job(id=4, platform="x", url="https://x/4", status=JobStatus.RUNNING.value, created_at=base),
            Job(id=5, platform="x", url="https://x/5", status=JobStatus.DUP.value, created_at=base),
        ])
        session.add(MediaItem(id=1, job_id=1, platform="instagram", source_url="https://ig/1", username=None))
        session.commit()


def test_serialize_job_hides_failed_reason():
    job = Job(id=1, platform="x", url="u", status=JobStatus.FAILED.value, error="secret detail")
    assert serialize_job(job)["error"] == "Job failed"


def test_serialize_job_keeps_no_files_marker_on_non_failed():
    job = Job(id=1, platform="x", url="u", status=JobStatus.DUP.value, error="no_files_downloaded")
    assert serialize_job(job)["error"] == "no_files_downloaded"
    job.status = JobStatus.FAILED.value
    assert serialize_job(job)["error"] == "Job failed"


def test_list_jobs_priority_order_and_shape(session_factory, service):
    _seed(session_factory)
    rows = service.list_jobs(limit=100, offset=0, status=None)
    by_status = [r["status"] for r in rows]
    assert by_status[0] == JobStatus.RUNNING.value
    assert by_status[1] == JobStatus.FAILED.value
    assert set(rows[0].keys()) == {
        "id", "platform", "url", "status", "error", "created_at", "started_at",
        "finished_at", "progress_percent", "bytes_downloaded", "total_bytes",
        "progress_stage", "transfer_speed", "eta_seconds",
    }


def test_list_jobs_status_filters(session_factory, service):
    _seed(session_factory)
    assert {r["id"] for r in service.list_jobs(limit=100, offset=0, status="active")} == {3, 4}
    assert {r["id"] for r in service.list_jobs(limit=100, offset=0, status="done")} == {1, 5}
    assert {r["id"] for r in service.list_jobs(limit=100, offset=0, status="failed")} == {2}


def test_get_job_and_missing(session_factory, service):
    _seed(session_factory)
    assert service.get_job(1)["id"] == 1
    assert service.get_job(999) is None


def test_stats_counts_and_progress(session_factory, service):
    _seed(session_factory)
    stats = service.stats(cooldown={"active": False, "remaining": 0, "next_job_id": None, "cooldown_seconds": 3})
    assert stats["total"] == 5
    assert stats["queued"] == 1 and stats["running"] == 1 and stats["done"] == 1
    assert stats["failed"] == 1 and stats["dup"] == 1
    assert stats["active_total"] == 2
    assert stats["completed_total"] == 3
    assert stats["running_jobs"][0]["id"] == 4


def test_stats_empty_is_complete(service):
    stats = service.stats(cooldown={"active": False, "remaining": 0, "next_job_id": None, "cooldown_seconds": 3})
    assert stats["total"] == 0
    assert stats["progress_percent"] == 100


def test_delete_job_detaches_media(session_factory, service):
    _seed(session_factory)
    assert service.delete_job(1) is True
    assert service.get_job(1) is None
    with session_factory() as session:
        assert session.get(MediaItem, 1).job_id is None
    assert service.delete_job(999) is False


def test_clear_jobs_finished_keeps_active(session_factory, service):
    _seed(session_factory)
    service.clear_jobs(scope="finished")
    remaining = {r["id"] for r in service.list_jobs(limit=100, offset=0, status=None)}
    assert remaining == {3, 4}


def test_clear_jobs_all_empties(session_factory, service):
    _seed(session_factory)
    service.clear_jobs(scope="all")
    assert service.list_jobs(limit=100, offset=0, status=None) == []


def test_cancel_all_removes_queued_and_running(session_factory, service):
    _seed(session_factory)
    service.cancel_all()
    remaining = {r["id"] for r in service.list_jobs(limit=100, offset=0, status=None)}
    assert remaining == {1, 2, 5}
