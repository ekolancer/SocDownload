from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.config import Settings
from backend.app.db import Base, MediaFile, MediaItem
from backend.app.media_vault import MediaQuery, MediaVault
from backend.app.routes.media import router


def test_video_file_supports_inline_range(tmp_path):
    video = tmp_path / "sample.mp4"
    video.write_bytes(b"0123456789abcdef")
    app = FastAPI()
    app.include_router(router)

    class Session:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, model, file_id):
            return MediaFile(id=file_id, path=str(video), kind="video")

    with patch("backend.app.routes.media.get_session_factory", return_value=lambda: Session()), patch(
        "backend.app.routes.media._media_root", return_value=tmp_path.resolve()
    ):
        response = TestClient(app).get("/api/media/files/1", headers={"Range": "bytes=0-7"})
    assert response.status_code == 206
    assert response.headers["content-range"] == "bytes 0-7/16"
    assert response.headers["content-type"] == "video/mp4"
    assert response.headers["content-disposition"].startswith("inline")


def test_recent_media_skips_audio_and_missing_files_before_limit(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'vault.db').as_posix()}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    base = datetime(2026, 1, 1)
    with factory() as session:
        for item_id in range(1, 8):
            session.add(MediaItem(id=item_id, platform="x", source_url=f"https://example.test/{item_id}", created_at=base + timedelta(minutes=item_id)))
            path = tmp_path / f"{item_id}.mp4"
            if item_id != 6:
                path.write_bytes(b"test")
            session.add(MediaFile(id=item_id, media_item_id=item_id, path=str(path), kind="audio" if item_id == 7 else "video", thumbnail_path=str(tmp_path / "missing-thumb.webp") if item_id == 5 else None))
        session.commit()
    recent = MediaVault(session_factory=factory).list_items(MediaQuery(limit=5, available_visual=True))
    assert [item["id"] for item in recent] == [5, 4, 3, 2, 1]
    assert all(item["files"] for item in recent)
    assert recent[0]["files"][0]["thumbnail_url"] is None
    assert [item["id"] for item in MediaVault(session_factory=factory).list_items(MediaQuery(limit=2, offset=1, available_visual=True))] == [4, 3]
    assert len(MediaVault(session_factory=factory).list_items(MediaQuery(limit=4))) == 4
    engine.dispose()


def test_recent_media_http_route_returns_only_available_visual_files(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'http-vault.db').as_posix()}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as session:
        for item_id, kind in [(1, "image"), (2, "audio"), (3, "video")]:
            path = tmp_path / f"{item_id}.mp4"
            path.write_bytes(b"sample")
            session.add(MediaItem(id=item_id, platform="x", source_url=f"https://example.test/{item_id}"))
            session.add(MediaFile(id=item_id, media_item_id=item_id, path=str(path), kind=kind))
        session.commit()
    app = FastAPI()
    app.include_router(router)
    with patch("backend.app.routes.media._vault", MediaVault(session_factory=factory)), patch(
        "backend.app.routes.media.get_settings", return_value=Settings(_env_file=None)
    ):
        response = TestClient(app).get("/api/media?limit=1&available_visual=true")
    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [3]
    engine.dispose()
