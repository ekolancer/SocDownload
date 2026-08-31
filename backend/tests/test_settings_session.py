from pathlib import Path
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db import AppSettings, Base
from backend.app.main import app


def _factory(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'settings.db'}")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def test_instagram_session_upload_replaces_registry_and_old_file(tmp_path):
    factory = _factory(tmp_path)
    old = tmp_path / "old.session"
    old.write_bytes(b"old")
    with factory() as session:
        session.add(AppSettings(id=1, instagram_username="old", instagram_session_file=str(old)))
        session.commit()
    adapter = Mock()
    adapter.platform = "instagram"
    with patch("backend.app.routes.settings.get_session_factory", return_value=factory), patch("backend.app.routes.settings._STORAGE", tmp_path), patch("backend.app.routes.settings.InstagramAdapter", return_value=adapter), patch("backend.app.routes.settings.registry.register") as register:
        response = TestClient(app, headers={"Authorization": "Bearer test-token"}).post("/api/settings/instagram/session", data={"username": "new_user"}, files={"file": ("session", b"valid")})
    assert response.status_code == 200
    assert response.json()["configured"] is True
    assert response.json()["check_status"] == "not_checked"
    adapter.load_session.assert_called_once()
    register.assert_called_once_with(adapter)
    assert not old.exists()
    with factory() as session:
        stored = session.get(AppSettings, 1)
        assert stored.instagram_username == "new_user"
        assert Path(stored.instagram_session_file).read_bytes() == b"valid"


def test_instagram_session_upload_load_failure_keeps_existing(tmp_path):
    factory = _factory(tmp_path)
    old = tmp_path / "old.session"
    old.write_bytes(b"old")
    with factory() as session:
        session.add(AppSettings(id=1, instagram_username="old", instagram_session_file=str(old)))
        session.commit()
    adapter = Mock()
    adapter.load_session.side_effect = ValueError("invalid")
    with patch("backend.app.routes.settings.get_session_factory", return_value=factory), patch("backend.app.routes.settings._STORAGE", tmp_path), patch("backend.app.routes.settings.InstagramAdapter", return_value=adapter), patch("backend.app.routes.settings.registry.register") as register:
        response = TestClient(app, headers={"Authorization": "Bearer test-token"}).post("/api/settings/instagram/session", data={"username": "new_user"}, files={"file": ("session", b"invalid")})
    assert response.status_code == 400
    register.assert_not_called()
    assert old.read_bytes() == b"old"
    assert list(tmp_path.glob("instagram-session-*")) == []
    with factory() as session:
        stored = session.get(AppSettings, 1)
        assert stored.instagram_username == "old"
        assert stored.instagram_session_file == str(old)


def test_instagram_status_returns_detail_for_rate_limit(tmp_path):
    factory = _factory(tmp_path)
    with factory() as session:
        session.add(AppSettings(id=1, instagram_username="user", instagram_session_file=str(tmp_path / "session")))
        session.commit()
    adapter = Mock()
    adapter.check_session_valid.return_value = (False, "rate_limited")
    with patch("backend.app.routes.settings.get_session_factory", return_value=factory), patch("backend.app.routes.settings.registry.get", return_value=adapter):
        response = TestClient(app, headers={"Authorization": "Bearer test-token"}).get("/api/settings/instagram/status")
    assert response.status_code == 200
    assert response.json()["status"] == "rate_limited"
    assert response.json()["reason"] == "adapter_status_rate_limited"
    assert response.json()["retryable"] is True


def test_instagram_session_upload_does_not_check_live_profile(tmp_path):
    factory = _factory(tmp_path)
    adapter = Mock()
    adapter.platform = "instagram"
    with patch("backend.app.routes.settings.get_session_factory", return_value=factory), patch("backend.app.routes.settings._STORAGE", tmp_path), patch("backend.app.routes.settings.InstagramAdapter", return_value=adapter), patch("backend.app.routes.settings.registry.register"):
        response = TestClient(app, headers={"Authorization": "Bearer test-token"}).post("/api/settings/instagram/session", data={"username": "user"}, files={"file": ("session", b"valid")})
    assert response.status_code == 200
    adapter.check_session_valid.assert_not_called()
