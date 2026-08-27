from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from starlette.testclient import TestClient

from backend.app.autosync import (
    get_or_create_autosync_config,
    run_autosync,
    update_autosync_config,
)
from backend.app.db import AutoSyncConfig, get_session_factory, init_db
from backend.app.main import app



class AutoSyncTestCase(unittest.TestCase):
    def setUp(self):
        init_db()
        factory = get_session_factory()
        with factory() as session:
            session.query(AutoSyncConfig).delete()
            session.commit()


    def test_autosync_config_defaults_and_update(self):
        # 1. Test defaults
        config = get_or_create_autosync_config("instagram")
        self.assertEqual(config.platform, "instagram")
        self.assertFalse(config.enabled)
        self.assertTrue(config.sync_saved)
        self.assertFalse(config.sync_liked)
        self.assertEqual(config.interval_minutes, 15)

        # 2. Test update
        factory = get_session_factory()
        with factory() as session:
            stored = session.query(AutoSyncConfig).filter_by(platform="instagram").one()
            stored.sync_liked = True
            session.commit()

        updated = update_autosync_config(
            platform="instagram",
            enabled=True,
            sync_saved=True,
            interval_minutes=30,
        )
        self.assertTrue(updated.enabled)
        self.assertFalse(updated.sync_liked)
        self.assertEqual(updated.interval_minutes, 30)

    def test_autosync_disabled_skip(self):
        update_autosync_config("instagram", enabled=False)
        res = run_autosync("instagram", force=False)
        self.assertEqual(res["status"], "disabled")
        self.assertEqual(res["enqueued_count"], 0)

    def test_autosync_session_expired_detection(self):
        update_autosync_config("instagram", enabled=True)

        mock_adapter = MagicMock()
        mock_adapter.platform = "instagram"
        mock_adapter.check_session_valid.return_value = (False, "session_expired")

        with patch("backend.app.autosync.registry.get", return_value=mock_adapter):
            res = run_autosync("instagram", force=True)
            self.assertEqual(res["status"], "session_expired")
            self.assertIn("Session expired, please re-login and update cookie.", res["error"])

        cfg = get_or_create_autosync_config("instagram")
        self.assertEqual(cfg.last_sync_status, "session_expired")
        self.assertEqual(cfg.last_error, "Session expired, please re-login and update cookie.")

    def test_autosync_success_and_deduplication(self):
        update_autosync_config("instagram", enabled=True, sync_saved=True)

        mock_adapter = MagicMock()
        mock_adapter.platform = "instagram"
        mock_adapter.check_session_valid.return_value = (True, None)
        mock_adapter.list_saved.return_value = [
            "https://www.instagram.com/p/TEST_SAVED_1/",
            "https://www.instagram.com/p/TEST_SAVED_2/",
        ]

        with patch("backend.app.autosync.registry.get", return_value=mock_adapter), \
             patch("backend.app.autosync.bulk_enqueue") as mock_bulk:
            mock_bulk.return_value = {
                "enqueued": ["https://www.instagram.com/p/TEST_SAVED_1/", "https://www.instagram.com/p/TEST_SAVED_2/"],
                "skipped_dup": ["https://www.instagram.com/p/TEST_LIKED_1/"],
                "skipped_limit": [],
                "job_ids": [101, 102],
            }

            res = run_autosync("instagram", force=True)
            self.assertEqual(res["status"], "ok")
            self.assertEqual(res["enqueued_count"], 2)
            self.assertEqual(res["skipped_dup_count"], 1)

        cfg = get_or_create_autosync_config("instagram")
        self.assertEqual(cfg.last_sync_status, "ok")
        self.assertIsNone(cfg.last_error)
        self.assertGreaterEqual(cfg.items_synced_total, 2)

    def test_autosync_api_routes(self):
        client = TestClient(app)

        # 1. GET /api/autosync/config
        res = client.get("/api/autosync/config?platform=instagram")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["platform"], "instagram")
        self.assertIn("interval_minutes", data)
        self.assertNotIn("sync_liked", data)

        # 2. PUT /api/autosync/config
        res = client.put("/api/autosync/config", json={
            "platform": "instagram",
            "enabled": True,
            "sync_saved": True,
            "interval_minutes": 10,
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["enabled"])
        self.assertEqual(data["interval_minutes"], 10)
        self.assertNotIn("sync_liked", data)
        saved = get_or_create_autosync_config("instagram")
        self.assertTrue(saved.enabled)
        self.assertFalse(saved.sync_liked)
        self.assertEqual(saved.interval_minutes, 10)

        rejected = client.put("/api/autosync/config", json={
            "platform": "instagram",
            "sync_liked": True,
        })
        self.assertEqual(rejected.status_code, 422)
        self.assertFalse(get_or_create_autosync_config("instagram").sync_liked)

        # 3. POST /api/autosync/trigger
        mock_adapter = MagicMock()
        mock_adapter.platform = "instagram"
        mock_adapter.check_session_valid.return_value = (True, None)
        mock_adapter.list_saved.return_value = []
        mock_adapter.list_liked.return_value = []

        with patch("backend.app.autosync.registry.get", return_value=mock_adapter):
            res = client.post("/api/autosync/trigger", json={"platform": "instagram"})
            self.assertEqual(res.status_code, 200)
            trigger_data = res.json()
            self.assertIn("sync_result", trigger_data)
            self.assertIn("config", trigger_data)


if __name__ == "__main__":
    unittest.main()
