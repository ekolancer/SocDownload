from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app import db as db_module
from backend.app.db import Base, Job, JobStatus
from backend.app.download_errors import DownloadErrorCategory, is_retryable
from backend.app.jobs import DownloadJob


class FakeAdapter:
    """Minimal adapter satisfying the download seam for tests."""

    platform = "fake"

    def __init__(self, *, files=None, download_error=None, username="creator", caption="hello", posted_at="2026-01-01T00:00:00Z", hashtags=None):
        self._files = files or []
        self._download_error = download_error
        self._username = username
        self._caption = caption
        self._posted_at = posted_at
        self._hashtags = hashtags or []
        self.download_calls = 0

    def resolve(self, url):
        from backend.app.adapters.base import ResolvedMedia

        return ResolvedMedia(
            platform=self.platform,
            source_url=url,
            username=self._username,
            caption=self._caption,
            posted_at=self._posted_at,
            hashtags=self._hashtags,
        )

    def download(self, url, dest_dir):
        self.download_calls += 1
        if self._download_error is not None:
            raise self._download_error
        written = []
        for name, payload in self._files:
            path = Path(dest_dir) / name
            path.write_bytes(payload)
            written.append(str(path))
        return written


@pytest.fixture()
def factory(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'jobs.db').as_posix()}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)


def _seed_job(factory, url="https://x.com/user/status/1", platform="fake") -> int:
    with factory() as session:
        job = Job(platform=platform, url=url, status=JobStatus.QUEUED.value)
        session.add(job)
        session.commit()
        return job.id


def _get_job(factory, job_id):
    with factory() as session:
        return session.get(Job, job_id)


def _make_job(factory, tmp_path, adapter, **kwargs):
    return DownloadJob(
        session_factory=factory,
        media_root=str(tmp_path / "media"),
        adapter_of=lambda url: adapter,
        **kwargs,
    )


def test_successful_job_moves_queued_to_done(factory, tmp_path):
    adapter = FakeAdapter(files=[("1.jpg", b"image-bytes")])
    job_id = _seed_job(factory)
    job = _make_job(factory, tmp_path, adapter)

    status = job.process(job_id)

    assert status == JobStatus.DONE.value
    row = _get_job(factory, job_id)
    assert row.status == JobStatus.DONE.value
    assert row.progress_percent == 100
    assert row.finished_at is not None
    assert row.lease_token is None
    # File is organised under media_root and a sidecar was written.
    moved = list((tmp_path / "media").rglob("*.jpg"))
    assert len(moved) == 1
    assert moved[0].read_bytes() == b"image-bytes"
    assert (moved[0].parent / "metadata.json").is_file()


def test_duplicate_url_short_circuits_to_dup(factory, tmp_path):
    adapter = FakeAdapter(files=[("1.jpg", b"x")])
    first = _seed_job(factory, url="https://x.com/user/status/2")
    _make_job(factory, tmp_path, adapter).process(first)

    second = _seed_job(factory, url="https://x.com/user/status/2")
    status = _make_job(factory, tmp_path, adapter).process(second)

    assert status == JobStatus.DUP.value
    assert _get_job(factory, second).status == JobStatus.DUP.value
    assert adapter.download_calls == 1  # second run never downloaded


def test_no_files_downloaded_fails_job(factory, tmp_path):
    adapter = FakeAdapter(files=[])
    job_id = _seed_job(factory)

    status = _make_job(factory, tmp_path, adapter).process(job_id)

    assert status == JobStatus.FAILED.value
    assert _get_job(factory, job_id).error == "no_files_downloaded"


def test_network_failure_is_retryable_and_requeues(factory, tmp_path):
    adapter = FakeAdapter(download_error=RuntimeError("connection reset"))
    job_id = _seed_job(factory)
    job = _make_job(factory, tmp_path, adapter, max_attempts=3)

    status = job.process(job_id)

    row = _get_job(factory, job_id)
    assert status == JobStatus.QUEUED.value
    assert row.status == JobStatus.QUEUED.value
    assert row.attempts == 1
    assert is_retryable(DownloadErrorCategory.NETWORK_ERROR)


def test_non_retryable_failure_stays_failed(factory, tmp_path):
    adapter = FakeAdapter(download_error=RuntimeError("unsupported format"))
    job_id = _seed_job(factory)

    status = _make_job(factory, tmp_path, adapter, max_attempts=3).process(job_id)

    assert status == JobStatus.FAILED.value
    assert _get_job(factory, job_id).status == JobStatus.FAILED.value


def test_retry_exhausted_stays_failed(factory, tmp_path):
    adapter = FakeAdapter(download_error=RuntimeError("connection reset"))
    job_id = _seed_job(factory)
    # Seed attempts at the limit so the next failure cannot requeue.
    job = _make_job(factory, tmp_path, adapter, max_attempts=1)

    status = job.process(job_id)

    assert status == JobStatus.FAILED.value
    assert _get_job(factory, job_id).status == JobStatus.FAILED.value


def test_claim_is_single_use_via_process(factory, tmp_path, monkeypatch):
    """A job already RUNNING (leased) is not processed by a second worker."""
    adapter = FakeAdapter(files=[("1.jpg", b"x")])
    job_id = _seed_job(factory)
    with factory() as session:
        session.get(Job, job_id).status = JobStatus.RUNNING.value
        session.commit()

    status = _make_job(factory, tmp_path, adapter).process(job_id)

    assert status is None  # claim declined
    assert adapter.download_calls == 0
