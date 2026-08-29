from fastapi.testclient import TestClient
import pytest

from backend.app.main import create_app


def test_api_requires_bearer_token():
    with TestClient(create_app()) as client:
        assert client.get('/api/jobs').status_code == 401
        assert client.get('/api/jobs', headers={'Authorization': 'Bearer test-token'}).status_code != 401
        assert client.get('/api/health').status_code == 200
        assert client.options('/api/jobs').status_code != 401


def test_app_fails_closed_without_token(monkeypatch):
    from backend.app.config import get_settings
    get_settings.cache_clear()
    monkeypatch.setenv('API_TOKEN', '')
    monkeypatch.setenv('AUTH_PASSWORD_HASH', '')
    monkeypatch.setenv('AUTH_SESSION_SECRET', '')
    with pytest.raises(RuntimeError):
        create_app()
    monkeypatch.setenv('API_TOKEN', 'test-token')
    get_settings.cache_clear()
