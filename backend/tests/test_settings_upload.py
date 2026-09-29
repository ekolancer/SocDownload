from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db import AppSettings, Base
from backend.app.settings_store import SettingsStore
from backend.app.settings_upload import SettingsFileError, SettingsFileService

ALLOWED = {"cookies": {".txt", ".cookies"}}
NETSCAPE = b"# Netscape HTTP Cookie File\n.example.com\tTRUE\t/\tFALSE\t0\tk\tv\n"


def _factory(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'upload.db'}")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def _service(tmp_path):
    store = SettingsStore(session_factory=_factory(tmp_path))
    return SettingsFileService(storage_dir=tmp_path, settings_store=store, allowed=ALLOWED), store


def test_upload_cookies_validates_and_stores(tmp_path):
    service, _ = _service(tmp_path)
    result = service.upload(kind="cookies", filename="cookies.txt", content=NETSCAPE, max_bytes=1024)
    assert result["cookies_file"] is True
    with _factory(tmp_path)() as session:
        stored = session.get(AppSettings, 1)
        assert Path(stored.cookies_file).read_bytes() == NETSCAPE


def test_upload_rejects_unknown_kind_and_bad_extension(tmp_path):
    service, _ = _service(tmp_path)
    with pytest.raises(SettingsFileError) as kind_exc:
        service.upload(kind="evil", filename="x.txt", content=NETSCAPE, max_bytes=1024)
    assert kind_exc.value.status == 400
    with pytest.raises(SettingsFileError) as ext_exc:
        service.upload(kind="cookies", filename="x.json", content=NETSCAPE, max_bytes=1024)
    assert ext_exc.value.status == 400


def test_upload_rejects_empty_and_oversize(tmp_path):
    service, _ = _service(tmp_path)
    with pytest.raises(SettingsFileError) as empty:
        service.upload(kind="cookies", filename="c.txt", content=b"", max_bytes=1024)
    assert empty.value.status == 413
    with pytest.raises(SettingsFileError) as big:
        service.upload(kind="cookies", filename="c.txt", content=b"x" * 2048, max_bytes=1024)
    assert big.value.status == 413


def test_upload_rejects_non_netscape_cookies(tmp_path):
    service, _ = _service(tmp_path)
    with pytest.raises(SettingsFileError) as exc:
        service.upload(kind="cookies", filename="c.txt", content=b"not a cookie jar", max_bytes=1024)
    assert exc.value.status == 400
    assert list(tmp_path.glob("cookies-*")) == []


def test_upload_rejects_long_filename(tmp_path):
    service, _ = _service(tmp_path)
    with pytest.raises(SettingsFileError) as exc:
        service.upload(kind="cookies", filename="a" * 200 + ".txt", content=NETSCAPE, max_bytes=1024)
    assert exc.value.status == 400
