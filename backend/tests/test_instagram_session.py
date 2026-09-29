from __future__ import annotations

from pathlib import Path
from unittest.mock import Mock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db import AppSettings, Base
from backend.app.instagram_session import InstagramSessionError, InstagramSessionService
from backend.app.settings_store import SettingsStore


def _factory(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'sess.db'}")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


@pytest.fixture()
def store(tmp_path):
    return SettingsStore(session_factory=_factory(tmp_path))


def test_settings_store_get_creates_singleton(tmp_path):
    store = SettingsStore(session_factory=_factory(tmp_path))
    item = store.get()
    assert item.id == 1
    assert store.get().id == 1


def test_settings_store_serialize_hides_missing_files(tmp_path):
    store = SettingsStore(session_factory=_factory(tmp_path))
    item = store.get()
    payload = store.serialize(item)
    assert payload["cookies_file"] is False
    assert payload["instagram_session_file"] is False
    assert payload["default_engine"] == "auto"


def test_settings_store_update_trims(tmp_path):
    store = SettingsStore(session_factory=_factory(tmp_path))
    result = store.update(instagram_username="  user  ", job_cooldown_seconds=5, default_engine="gallery-dl")
    assert result["instagram_username"] == "user"
    assert result["job_cooldown_seconds"] == 5


def _service(tmp_path, store, adapter, registry=None):
    return InstagramSessionService(
        session_factory=_factory(tmp_path),
        storage_dir=tmp_path,
        settings_store=store,
        adapter_factory=lambda: adapter,
        registry=registry or Mock(),
    )


def test_upload_session_stores_file_and_settings(tmp_path):
    store = SettingsStore(session_factory=_factory(tmp_path))
    adapter = Mock()
    registry = Mock()
    service = _service(tmp_path, store, adapter, registry)
    response = service.upload_session(username="  user  ", content=b"valid", max_bytes=1024)
    assert response["configured"] is True
    assert response["instagram_username"] == "user"
    adapter.load_session.assert_called_once()
    registry.register.assert_called_once_with(adapter)
    with _factory(tmp_path)() as session:
        stored = session.get(AppSettings, 1)
        assert Path(stored.instagram_session_file).read_bytes() == b"valid"


def test_upload_session_replaces_old_file(tmp_path):
    factory = _factory(tmp_path)
    store = SettingsStore(session_factory=factory)
    old = tmp_path / "old.session"
    old.write_bytes(b"old")
    with factory() as session:
        session.add(AppSettings(id=1, instagram_username="old", instagram_session_file=str(old)))
        session.commit()
    service = _service(tmp_path, store, Mock())
    service.upload_session(username="new", content=b"newer", max_bytes=1024)
    assert not old.exists()


def test_upload_session_load_failure_keeps_state(tmp_path):
    factory = _factory(tmp_path)
    store = SettingsStore(session_factory=factory)
    old = tmp_path / "old.session"
    old.write_bytes(b"old")
    with factory() as session:
        session.add(AppSettings(id=1, instagram_username="old", instagram_session_file=str(old)))
        session.commit()
    adapter = Mock()
    adapter.load_session.side_effect = ValueError("bad")
    registry = Mock()
    service = _service(tmp_path, store, adapter, registry)
    with pytest.raises(InstagramSessionError) as exc:
        service.upload_session(username="new", content=b"bad", max_bytes=1024)
    assert exc.value.status == 400
    assert old.read_bytes() == b"old"
    assert list(tmp_path.glob("instagram-session-*")) == []
    registry.register.assert_not_called()


def test_upload_session_rejects_empty_and_oversize(tmp_path):
    store = SettingsStore(session_factory=_factory(tmp_path))
    service = _service(tmp_path, store, Mock())
    with pytest.raises(InstagramSessionError) as empty:
        service.upload_session(username="user", content=b"", max_bytes=1024)
    assert empty.value.status == 413
    with pytest.raises(InstagramSessionError) as blank:
        service.upload_session(username="  ", content=b"x", max_bytes=1024)
    assert blank.value.status == 422
    with pytest.raises(InstagramSessionError) as big:
        service.upload_session(username="user", content=b"x" * 2048, max_bytes=1024)
    assert big.value.status == 413


def test_status_connected_and_missing_adapter(tmp_path):
    store = SettingsStore(session_factory=_factory(tmp_path))
    adapter = Mock()
    adapter.check_session_valid.return_value = (True, None)
    registry = Mock()
    registry.get.return_value = adapter
    service = _service(tmp_path, store, adapter, registry)
    assert service.status()["connected"] is True

    registry.get.return_value = None
    assert service.status()["status"] == "unknown_error"


def test_disconnect_clears_and_unregisters(tmp_path):
    factory = _factory(tmp_path)
    store = SettingsStore(session_factory=factory)
    session_file = tmp_path / "s.session"
    session_file.write_bytes(b"x")
    with factory() as session:
        session.add(AppSettings(id=1, instagram_username="u", instagram_session_file=str(session_file)))
        session.commit()
    registry = Mock()
    registry.get.return_value = Mock()
    service = _service(tmp_path, store, Mock(), registry)
    result = service.disconnect()
    assert result == {"connected": False, "status": "disconnected"}
    assert not session_file.exists()
    registry.register.assert_called_once()
