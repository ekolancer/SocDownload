from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app import db as db_module
from backend.app.db import Base, MediaFile, MediaItem
from backend.app.routes import media as media_routes


@pytest.fixture()
def session_factory(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{(tmp_path / 'test.db').as_posix()}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    monkeypatch.setattr(db_module, "_session_factory", factory)
    monkeypatch.setattr(db_module, "get_session_factory", lambda: factory)
    monkeypatch.setattr(media_routes, "get_session_factory", lambda: factory)
    return factory


def _seed(factory):
    base = datetime(2026, 1, 1, 12, 0, 0)
    with factory() as session:
        items = [
            # Two rhmfskw items, oldest first so desc order puts 3,4 on top.
            MediaItem(id=1, job_id=None, platform="instagram", source_url="https://ig/a", username="rhmfskw", created_at=base),
            MediaItem(id=2, job_id=None, platform="instagram", source_url="https://ig/b", username="RHmFSKW", created_at=base + timedelta(minutes=1)),
            MediaItem(id=3, job_id=None, platform="vidara", source_url="https://vd/c", username=None, created_at=base + timedelta(minutes=2)),
            MediaItem(id=4, job_id=None, platform="vidara", source_url="https://vd/d", username=None, created_at=base + timedelta(minutes=3)),
            MediaItem(id=5, job_id=None, platform="instagram", source_url="https://ig/e", username="other", created_at=base + timedelta(minutes=4)),
        ]
        session.add_all(items)
        session.add_all([
            MediaFile(media_item_id=1, path="/app/media/instagram/rhmfskw/2026-01-01/a.jpg", kind="image"),
            MediaFile(media_item_id=5, path="/app/media/instagram/other/2026-01-01/e.mp4", kind="video"),
        ])
        session.commit()


def test_creator_filter_is_case_insensitive(session_factory):
    _seed(session_factory)
    rows = media_routes.list_media(creator="rhmfskw", limit=100, offset=0)
    assert {r["id"] for r in rows} == {1, 2}
    # Different casing must return the same set.
    assert {r["id"] for r in media_routes.list_media(creator="RHmFSKW", limit=100, offset=0)} == {1, 2}


def test_unknown_creator_matches_null_username(session_factory):
    _seed(session_factory)
    rows = media_routes.list_media(creator="unknown", limit=100, offset=0)
    assert {r["id"] for r in rows} == {3, 4}
    assert all(r["username"] == "unknown" for r in rows)


def test_creator_pagination_offset_is_stable(session_factory):
    _seed(session_factory)
    # 4 null-username items -> page size 2 across two pages, no overlap.
    page1 = media_routes.list_media(creator="unknown", limit=2, offset=0)
    page2 = media_routes.list_media(creator="unknown", limit=2, offset=2)
    assert [r["id"] for r in page1] == [4, 3]
    assert [r["id"] for r in page2] == []
    # Descending created_at with id tiebreaker.
    assert page1[0]["id"] == 4 and page1[1]["id"] == 3


def test_count_endpoint_respects_creator_filter(session_factory):
    _seed(session_factory)
    assert media_routes.count_media(creator="unknown") == {"count": 2}
    assert media_routes.count_media(creator="rhmfskw") == {"count": 2}
    assert media_routes.count_media(creator="nobody") == {"count": 0}


def test_media_type_and_query_filters(session_factory):
    _seed(session_factory)
    video_rows = media_routes.list_media(media_type="video", limit=100, offset=0)
    assert {r["id"] for r in video_rows} == {5}
    image_rows = media_routes.list_media(media_type="image", limit=100, offset=0)
    assert {r["id"] for r in image_rows} == {1}
    search_rows = media_routes.list_media(q="other", limit=100, offset=0)
    assert {r["id"] for r in search_rows} == {5}


def test_list_media_returns_unknown_label_for_null_username(session_factory):
    _seed(session_factory)
    rows = media_routes.list_media(limit=100, offset=0)
    by_id = {r["id"]: r for r in rows}
    assert by_id[3]["username"] == "unknown"
    assert by_id[1]["username"] == "rhmfskw"
