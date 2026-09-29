from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..albums import AlbumNameEmpty, AlbumNotFound, AlbumService

router = APIRouter(prefix="/api/albums", tags=["albums"])
_service = AlbumService()


class CreateAlbumPayload(BaseModel):
    name: str
    description: str | None = None
    cover_media_id: int | None = None


class UpdateAlbumPayload(BaseModel):
    name: str | None = None
    description: str | None = None
    cover_media_id: int | None = None


class BatchAlbumItemsPayload(BaseModel):
    media_ids: list[int]


def _translate(exc: Exception) -> HTTPException:
    if isinstance(exc, AlbumNotFound):
        return HTTPException(status_code=404, detail="Album not found")
    return HTTPException(status_code=400, detail=str(exc))


@router.get("")
def list_albums():
    return _service.list_albums()


@router.post("")
def create_album(payload: CreateAlbumPayload):
    try:
        return _service.create_album(name=payload.name, description=payload.description, cover_media_id=payload.cover_media_id)
    except AlbumNameEmpty as exc:
        raise _translate(exc) from None


@router.get("/{album_id}")
def get_album_detail(album_id: int):
    try:
        return _service.get_album(album_id)
    except AlbumNotFound as exc:
        raise _translate(exc) from None


@router.put("/{album_id}")
def update_album(album_id: int, payload: UpdateAlbumPayload):
    try:
        return _service.update_album(
            album_id,
            name=payload.name,
            description=payload.description,
            cover_media_id=payload.cover_media_id,
        )
    except (AlbumNotFound, AlbumNameEmpty) as exc:
        raise _translate(exc) from None


@router.delete("/{album_id}")
def delete_album(album_id: int):
    try:
        return _service.delete_album(album_id)
    except AlbumNotFound as exc:
        raise _translate(exc) from None


@router.post("/{album_id}/items")
def add_items_to_album(album_id: int, payload: BatchAlbumItemsPayload):
    try:
        return _service.add_items(album_id, payload.media_ids)
    except AlbumNotFound as exc:
        raise _translate(exc) from None


@router.delete("/{album_id}/items")
def remove_items_from_album(album_id: int, payload: BatchAlbumItemsPayload):
    return _service.remove_items(album_id, payload.media_ids)
