from __future__ import annotations

import unittest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db import Base, Job, JobStatus, utcnow
from backend.app.service import claim_job

from pydantic import ValidationError
from starlette.testclient import TestClient

from backend.app.config import Settings
from backend.app.main import app
from backend.app.routes.media import BatchMediaPayload, neutralize_csv_formula, sanitize_zip_component


class BackendBoundsTestCase(unittest.TestCase):
    def test_csv_formula_neutralization(self):
        for value in ["=1+1", "+cmd", "-2+3", "@SUM(A1:A2)", "  =1"]:
            self.assertTrue(neutralize_csv_formula(value).startswith("'"))
        self.assertEqual(neutralize_csv_formula("safe"), "safe")

    def test_zip_component_sanitizer(self):
        self.assertEqual(sanitize_zip_component("../../evil/name", "unknown"), "evil_name")
        self.assertEqual(sanitize_zip_component("..", "unknown"), "unknown")
        self.assertEqual(sanitize_zip_component("valid-name_1.jpg", "file"), "valid-name_1.jpg")

    def test_job_claim_is_single_use(self):
        engine = create_engine("sqlite://")
        Base.metadata.create_all(engine)
        factory = sessionmaker(bind=engine)
        with factory() as session:
            job = Job(platform="x", url="https://example.com", status=JobStatus.QUEUED.value)
            session.add(job)
            session.commit()
            job_id = job.id
        with patch("backend.app.service.get_session_factory", return_value=factory):
            token = claim_job(job_id)
            self.assertIsNotNone(token)
            self.assertIsNone(claim_job(job_id))
        with factory() as session:
            job = session.get(Job, job_id)
            self.assertEqual(job.status, JobStatus.RUNNING.value)
            self.assertEqual(job.lease_token, token)
            self.assertGreater(job.lease_until, utcnow().replace(tzinfo=None))

    def test_settings_bounds(self):
        with self.assertRaises(ValidationError):
            Settings(max_upload_bytes=0)
        with self.assertRaises(ValidationError):
            Settings(batch_ids_limit=0)

    def test_query_and_batch_validation(self):
        client = TestClient(app, headers={"Authorization": "Bearer test-token"})
        self.assertEqual(client.get("/api/jobs?limit=0").status_code, 422)
        self.assertEqual(client.get("/api/media?limit=0").status_code, 422)
        self.assertEqual(
            client.post("/api/media/batch-delete", json={"media_ids": list(range(5001))}).status_code,
            422,
        )

    def test_import_upload_limit(self):
        client = TestClient(app, headers={"Authorization": "Bearer test-token"})
        settings = Settings(max_upload_bytes=4)
        with patch("backend.app.routes.importer.get_settings", return_value=settings):
            response = client.post(
                "/api/import/json",
                files={"file": ("archive.txt", b"12345", "text/plain")},
            )
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json()["detail"], "Uploaded file is too large")


if __name__ == "__main__":
    unittest.main()
