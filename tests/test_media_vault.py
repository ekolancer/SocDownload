from __future__ import annotations

import io
import json
import zipfile
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db import Base, MediaFile, MediaItem
from backend.app.media_exporter import MediaExporter
from backend.app.media_vault import MediaQuery, MediaVault, serialize_item


@pytest.fixture()
def session_factory(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'vault.db').as_posix()}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture()
def vault(session_factory):
    return MediaVault(session_factory=session_factory)


def _seed(factory, tmp_path):
    base = datetime(2026, 1, 1, 12, 0, 0)
    a = tmp_path / "media" / "instagram" / "creator" / "2026-01-01"
    a.mkdir(parents=True)
    (a / "a.jpg").write_bytes(b"image")
    (a / "a.thumb.webp").write_bytes(b"thumb")
    with factory() as session:
        session.add_all([
            MediaItem(id=1, job_id=None, platform="instagram", source_url="https://ig/a", username="creator", posted_at=base, created_at=base),
            MediaItem(id=2, job_id=None, platform="vidara", source_url="https://vd/b", username=None, created_at=base + timedelta(minutes=1)),
        ])
        session.add(MediaFile(id=1, media_item_id=1, path=str(a / "a.jpg"), kind="image", thumbnail_path=str(a / "a.thumb.webp"), width=100, height=50))
        session.commit()
    return a


def test_serialize_item_single_shape(session_factory, vault, tmp_path):
    _seed(session_factory, tmp_path)
    rows = vault.list_items(MediaQuery(limit=10))
    assert len(rows) == 2
    by_id = {r["id"]: r for r in rows}
    assert by_id[1]["username"] == "creator"
    assert by_id[1]["files"][0]["url"] == "/api/media/files/1"
    assert by_id[1]["files"][0]["thumbnail_url"] == "/media-thumbnail/1"
    assert by_id[2]["username"] == "unknown"


def test_creators_aggregates_groups(session_factory, vault, tmp_path):
    _seed(session_factory, tmp_path)
    creators = vault.creators()
    keys = {(c["username"], c["platform"]) for c in creators}
    assert ("creator", "instagram") in keys
    assert ("unknown", "vidara") in keys
    ig = next(c for c in creators if c["username"] == "creator")
    assert ig["image_count"] == 1
    assert ig["sample_thumbnails"][0]["url"] == "/media-thumbnail/1"


def test_delete_removes_rows_files_and_sidecar(session_factory, vault, tmp_path):
    directory = _seed(session_factory, tmp_path)
    (directory / "metadata.json").write_text("{}")
    deleted = vault.delete([1])
    assert deleted == 1
    assert not (directory / "a.jpg").exists()
    assert not (directory / "a.thumb.webp").exists()
    assert not (directory / "metadata.json").exists()
    assert not directory.exists()
    assert vault.count(MediaQuery()) == 1


def test_toggle_favorite_and_missing(session_factory, vault, tmp_path):
    _seed(session_factory, tmp_path)
    assert vault.toggle_favorite(1) == {"id": 1, "is_favorite": True}
    assert vault.toggle_favorite(1, False) == {"id": 1, "is_favorite": False}
    assert vault.toggle_favorite(999) is None


def test_export_csv_neutralizes_formula(session_factory):
    with session_factory() as session:
        session.add(MediaItem(id=1, job_id=None, platform="x", source_url="https://x/1", username="=evil", created_at=datetime(2026, 1, 1)))
        session.commit()
    data = MediaExporter(session_factory=session_factory).csv_bytes(MediaQuery(limit=10))
    text = data.decode("utf-8-sig")
    assert "'=evil" in text


def test_export_json_full_shape(session_factory, vault, tmp_path):
    _seed(session_factory, tmp_path)
    payload = json.loads(MediaExporter(vault=vault, session_factory=session_factory).json_bytes(MediaQuery(limit=10)).decode())
    entry = next(e for e in payload if e["id"] == 1)
    assert "video_codec" in entry["files"][0]
    assert entry["hashtags"] is not None


def test_export_zip_contains_metadata_and_files(session_factory, vault, tmp_path):
    _seed(session_factory, tmp_path)
    data = MediaExporter(vault=vault, session_factory=session_factory).zip_bytes(MediaQuery(limit=10), bytes_limit=10 * 1024 * 1024)
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = zf.namelist()
    assert "metadata.json" in names
    assert "metadata.csv" in names
    assert any(name.endswith("a.jpg") for name in names)


def test_export_zip_rejects_oversize(session_factory, vault, tmp_path):
    _seed(session_factory, tmp_path)
    with pytest.raises(ValueError, match="export_too_large"):
        MediaExporter(vault=vault, session_factory=session_factory).zip_bytes(MediaQuery(limit=10), bytes_limit=1)


def test_serialize_item_full_includes_codecs():
    item = MediaItem(id=1, platform="x", source_url="u", username=None, caption="c", hashtags="a,b", sha256="deadbeef")
    f = MediaFile(id=2, media_item_id=1, path="/m/v.mp4", kind="video", video_codec="h264", audio_codec="aac", sha256="cafe")
    payload = serialize_item(item, [f], full=True)
    assert payload["hashtags"] == ["a", "b"]
    assert payload["files"][0]["video_codec"] == "h264"
