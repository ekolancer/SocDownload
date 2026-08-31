from __future__ import annotations

import json
import logging

from fastapi.testclient import TestClient

from backend.app.errors import AppError, error_envelope, map_exception
from backend.app.main import create_app
from backend.app.matrixconsole import EventStore, JsonFormatter, redact, store


def test_error_mapping_and_envelope():
    error = AppError("rate_limited", operator_message="remote quota reached")
    info = map_exception(error)
    assert info.status == 429
    assert info.retryable is True
    assert error_envelope(error, "request-1")["error"]["code"] == "rate_limited"


def test_redaction_and_json_formatter():
    value = redact({"authorization": "Bearer abc", "nested": {"password": "secret"}, "url": "https://example.test/a?token=abc&safe=yes", "message": "Bearer xyz"})
    assert value["authorization"] == "[REDACTED]"
    assert value["nested"]["password"] == "[REDACTED]"
    assert "abc" not in value["url"]
    assert value["message"] == "Bearer [REDACTED]"
    record = logging.LogRecord("test", logging.INFO, __file__, 1, 'quoted "value"', (), None)
    assert json.loads(JsonFormatter().format(record))["message"] == 'quoted "value"'


def test_ring_capacity_and_filters():
    events = EventStore(capacity=2)
    first = events.append({"source": "worker", "severity": "error", "code": "failed", "message": "one"})
    events.append({"source": "api", "severity": "info", "code": "ok", "message": "two"})
    events.append({"source": "worker", "severity": "error", "code": "failed", "message": "three"})
    assert events.get(first["id"]) is None
    assert len(events.list()) == 2
    assert [item["message"] for item in events.list(source="worker", severity="error", code="failed")] == ["three"]


def test_console_auth_and_api():
    store.append({"source": "test", "severity": "info", "code": "test_event", "message": "visible"})
    with TestClient(create_app()) as client:
        assert client.get("/api/console/events").status_code == 401
        response = client.get("/api/console/events?source=test&code=test_event", headers={"Authorization": "Bearer test-token"})
        assert response.status_code == 200
        assert all(item["source"] == "test" for item in response.json()["events"])
        assert client.get("/api/console/stats", headers={"Authorization": "Bearer test-token"}).status_code == 200
        assert client.get("/api/console/sources", headers={"Authorization": "Bearer test-token"}).status_code == 200
