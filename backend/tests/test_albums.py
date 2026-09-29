from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

from backend.app.albums import AlbumNameEmpty, AlbumNotFound, AlbumService
from backend.app.db import Album, AlbumMediaItem, Base, MediaFile, MediaItem


@pytest.fixture()
def session_factory(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'albums.db').as_posix()}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture()
def service(session_factory):
    return AlbumService(session_factory=session_factory)


def _seed_media(factory, count=3):
    base = datetime(2026, 1, 1, 12, 0, 0)
    with factory() as session:
        session.add_all([
            MediaItem(id=i, job_id=None, platform="instagram", source_url=f"https://ig/{i}", username="creator", created_at=base + timedelta(minutes=i))
            for i in range(1, count + 1)
        ])
        session.add(MediaFile(id=1, media_item_id=1, path="/m/1.mp4", kind="video"))
        session.commit()


def test_create_album_trims_and_rejects_empty(service):
    with pytest.raises(AlbumNameEmpty):
        service.create_album(name="   ", description=None, cover_media_id=None)
    created = service.create_album(name="  Trip  ", description="  hi ", cover_media_id=None)
    assert created["name"] == "Trip"
    assert created["items_count"] == 0


def test_list_albums_counts_and_cover(session_factory, service):
    _seed_media(session_factory, 3)
    album = service.create_album(name="A", description=None, cover_media_id=None)
    service.add_items(album["id"], [1, 2, 3])
    listing = service.list_albums()
    assert len(listing) == 1
    assert listing[0]["items_count"] == 3
    # Fallback cover is the latest-added item (id 3), which has no file -> None.
    assert listing[0]["cover_file_url"] is None


def test_list_albums_uses_explicit_cover_file(session_factory, service):
    _seed_media(session_factory, 1)
    album = service.create_album(name="A", description=None, cover_media_id=1)
    listing = service.list_albums()
    assert listing[0]["cover_file_url"] == "/api/media/files/1"


def test_get_album_detail_orders_and_tags_items(session_factory, service):
    _seed_media(session_factory, 3)
    album = service.create_album(name="A", description=None, cover_media_id=None)
    service.add_items(album["id"], [1, 2])
    detail = service.get_album(album["id"])
    assert detail["items_count"] == 2
    assert {i["id"] for i in detail["items"]} == {1, 2}
    assert all("added_to_album_at" in i for i in detail["items"])


def test_get_album_missing_raises(service):
    with pytest.raises(AlbumNotFound):
        service.get_album(999)


def test_update_album(session_factory, service):
    album = service.create_album(name="A", description="d", cover_media_id=None)
    result = service.update_album(album["id"], name="  B ", description=None, cover_media_id=2)
    assert result == {"updated": True, "id": album["id"], "name": "B"}
    detail = service.get_album(album["id"])
    assert detail["cover_media_id"] == 2
    with pytest.raises(AlbumNameEmpty):
        service.update_album(album["id"], name="   ", description=None, cover_media_id=None)
    with pytest.raises(AlbumNotFound):
        service.update_album(999, name="X", description=None, cover_media_id=None)


def test_add_items_skips_dupes_and_missing(session_factory, service):
    _seed_media(session_factory, 3)
    album = service.create_album(name="A", description=None, cover_media_id=None)
    first = service.add_items(album["id"], [1, 2, 999])
    assert first["added_count"] == 2
    again = service.add_items(album["id"], [1, 2, 3])
    assert again["added_count"] == 1
    assert service.add_items(album["id"], [])["added_count"] == 0
    with pytest.raises(AlbumNotFound):
        service.add_items(999, [1])


def test_remove_items_and_delete_album(session_factory, service):
    _seed_media(session_factory, 3)
    album = service.create_album(name="A", description=None, cover_media_id=None)
    service.add_items(album["id"], [1, 2, 3])
    removed = service.remove_items(album["id"], [1, 2])
    assert removed["removed_count"] == 2
    assert service.get_album(album["id"])["items_count"] == 1
    deleted = service.delete_album(album["id"])
    assert deleted == {"deleted": True, "id": album["id"]}
    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(AlbumMediaItem)) == 0


def test_delete_missing_album_raises(service):
    with pytest.raises(AlbumNotFound):
        service.delete_album(999)
