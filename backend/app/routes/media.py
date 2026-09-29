from __future__ import annotations

import io
import shutil
import threading
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from ..config import ROOT, get_settings
from ..db import MediaFile, get_session_factory, now_wib
from ..media_vault import (
    MediaQuery,
    MediaVault,
    neutralize_csv_formula,
    sanitize_zip_component,
)
from ..media_exporter import MediaExporter

router = APIRouter(prefix="/api/media", tags=["media"])
_vault = MediaVault()
_exporter = MediaExporter(vault=_vault)

_storage_cache: dict = {"value": None}
_storage_cache_lock = threading.Lock()
_STORAGE_CACHE_TTL_SECONDS = 60

__all__ = ["router", "BatchMediaPayload", "ToggleFavoritePayload", "neutralize_csv_formula", "sanitize_zip_component"]


class BatchMediaPayload(BaseModel):
    media_ids: list[int] = Field(default_factory=list, max_length=5_000)


class ToggleFavoritePayload(BaseModel):
    is_favorite: bool | None = None


def _validate_batch_ids(ids: list[int]) -> list[int]:
    ids = list(dict.fromkeys(ids))
    if len(ids) > get_settings().batch_ids_limit:
        raise HTTPException(status_code=422, detail="Too many media IDs")
    return ids


def _query(
    *,
    platform: str | None = None,
    creator: str | None = None,
    is_favorite: bool | None = None,
    media_type: str | None = None,
    q: str | None = None,
    ids: list[int] | None = None,
    album_id: int | None = None,
    limit: int = 100,
    offset: int = 0,
) -> MediaQuery:
    return MediaQuery(
        platform=platform,
        creator=creator,
        is_favorite=is_favorite,
        media_type=media_type,
        q=q,
        ids=ids,
        album_id=album_id,
        limit=limit,
        offset=offset,
    )


@router.get("")
def list_media(
    platform: str | None = None,
    creator: str | None = None,
    is_favorite: bool | None = None,
    media_type: str | None = None,
    q: str | None = None,
    limit: int = Query(default=100, ge=1, le=10_000),
    offset: int = Query(default=0, ge=0),
):
    limit = min(limit, get_settings().list_limit)
    return _vault.list_items(_query(platform=platform, creator=creator, is_favorite=is_favorite, media_type=media_type, q=q, limit=limit, offset=offset))


@router.get("/count")
def count_media(
    platform: str | None = None,
    creator: str | None = None,
    is_favorite: bool | None = None,
    media_type: str | None = None,
    q: str | None = None,
):
    return {"count": _vault.count(_query(platform=platform, creator=creator, is_favorite=is_favorite, media_type=media_type, q=q))}


@router.get("/creators")
def list_creators():
    return _vault.creators()


@router.get("/storage")
def get_storage_stats():
    now = time.monotonic()
    with _storage_cache_lock:
        cached = _storage_cache.get("value")
        if cached and now - cached[0] < _STORAGE_CACHE_TTL_SECONDS:
            return cached[1]

    result = {"total_bytes": 0, "total_files": 0, "human_size": "0.0 KB", "disk_total_bytes": 0, "disk_free_bytes": 0, "disk_used_bytes": 0}
    settings = get_settings()
    media_root = Path(settings.media_root).resolve()
    if not media_root.is_absolute():
        media_root = (ROOT / media_root).resolve()

    total_bytes = 0
    total_files = 0
    if media_root.is_dir():
        for p in media_root.rglob("*"):
            if p.is_file() and not p.name.startswith("."):
                try:
                    total_bytes += p.stat().st_size
                    total_files += 1
                except Exception:
                    pass

    if total_bytes < 1024 * 1024:
        human_size = f"{total_bytes / 1024:.1f} KB"
    elif total_bytes < 1024 * 1024 * 1024:
        human_size = f"{total_bytes / (1024 * 1024):.1f} MB"
    else:
        human_size = f"{total_bytes / (1024 * 1024 * 1024):.2f} GB"

    disk = shutil.disk_usage(media_root)
    result.update({
        "total_bytes": total_bytes,
        "total_files": total_files,
        "human_size": human_size,
        "disk_total_bytes": disk.total,
        "disk_free_bytes": disk.free,
        "disk_used_bytes": disk.used,
    })
    with _storage_cache_lock:
        _storage_cache["value"] = (time.monotonic(), result)
    return result


@router.get("/thumbnails/{file_id}")
def serve_thumbnail(file_id: int):
    factory = get_session_factory()
    with factory() as session:
        mf = session.get(MediaFile, file_id)
        if not mf or not mf.thumbnail_path:
            raise HTTPException(status_code=404, detail="thumbnail not found")
        root = _media_root()
        path = Path(mf.thumbnail_path).resolve()
        _guard_within(path, root)
        if not path.is_file():
            raise HTTPException(status_code=404, detail="thumbnail missing")
        return FileResponse(path, media_type="image/webp", headers={"Cache-Control": "private, max-age=86400"})


@router.get("/files/{file_id}")
def serve_media_file(file_id: int):
    factory = get_session_factory()
    with factory() as session:
        mf = session.get(MediaFile, file_id)
        if not mf:
            raise HTTPException(status_code=404, detail="file not found")
        file_path = Path(mf.path).resolve()
        _guard_within(file_path, _media_root())
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="file missing")
        media_type = "video" if mf.kind == "video" else "image"
        return FileResponse(file_path, media_type=f"{media_type}/*", filename=file_path.name)


def _media_root() -> Path:
    settings = get_settings()
    root = Path(settings.media_root).resolve()
    if not root.is_absolute():
        root = (ROOT / root).resolve()
    return root


def _guard_within(path: Path, root: Path) -> None:
    try:
        path.relative_to(root)
    except ValueError:
        raise HTTPException(status_code=403, detail="path traversal") from None


@router.patch("/{item_id}/favorite")
def toggle_favorite(item_id: int, payload: ToggleFavoritePayload | None = None):
    result = _vault.toggle_favorite(item_id, payload.is_favorite if payload else None)
    if result is None:
        raise HTTPException(status_code=404, detail="Media item not found")
    return result


@router.delete("/{item_id}")
def delete_media_item(item_id: int):
    _vault.delete([item_id])
    return {"deleted": True, "id": item_id}


@router.post("/batch-delete")
def batch_delete_media(payload: BatchMediaPayload):
    media_ids = _validate_batch_ids(payload.media_ids)
    return {"deleted_count": _vault.delete(media_ids)}


def _export_query(ids: str | None, album_id: int | None, username: str | None, platform: str | None, limit: int) -> MediaQuery:
    id_list = None
    if ids:
        try:
            id_list = _validate_batch_ids([int(i.strip()) for i in ids.split(",") if i.strip()])
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid media IDs") from None
    return _query(ids=id_list, album_id=album_id, creator=username, platform=platform, limit=limit)


@router.get("/export/csv")
def export_metadata_csv(
    ids: str | None = None,
    album_id: int | None = None,
    username: str | None = None,
    platform: str | None = None,
    limit: int = Query(default=500, ge=1, le=10_000),
):
    limit = min(limit, get_settings().export_items_limit)
    data = _exporter.csv_bytes(_export_query(ids, album_id, username, platform, limit))
    filename = f"mediavault_metadata_{now_wib().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(io.BytesIO(data), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/export/json")
def export_metadata_json(
    ids: str | None = None,
    album_id: int | None = None,
    username: str | None = None,
    platform: str | None = None,
    limit: int = Query(default=500, ge=1, le=10_000),
):
    limit = min(limit, get_settings().export_items_limit)
    data = _exporter.json_bytes(_export_query(ids, album_id, username, platform, limit))
    filename = f"mediavault_export_{now_wib().strftime('%Y%m%d_%H%M%S')}.json"
    return StreamingResponse(io.BytesIO(data), media_type="application/json", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/export/zip")
def export_media_zip(
    ids: str | None = None,
    album_id: int | None = None,
    username: str | None = None,
    platform: str | None = None,
    limit: int = Query(default=500, ge=1, le=10_000),
):
    settings = get_settings()
    limit = min(limit, settings.export_items_limit)
    try:
        data = _exporter.zip_bytes(_export_query(ids, album_id, username, platform, limit), bytes_limit=settings.export_bytes_limit)
    except ValueError as exc:
        if str(exc) == "export_too_large":
            raise HTTPException(status_code=413, detail="Export is too large") from None
        raise HTTPException(status_code=404, detail="No media items found for export") from None
    prefix = f"mediavault_{username}" if username else "mediavault_vault"
    filename = f"{prefix}_{now_wib().strftime('%Y%m%d_%H%M%S')}.zip"
    return StreamingResponse(io.BytesIO(data), media_type="application/zip", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.post("/batch-zip")
def batch_zip_media(payload: BatchMediaPayload):
    media_ids = _validate_batch_ids(payload.media_ids)
    if not media_ids:
        raise HTTPException(status_code=400, detail="No media IDs specified")
    return export_media_zip(ids=",".join(str(i) for i in media_ids), limit=get_settings().export_items_limit)
