from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..autosync import (
    get_or_create_autosync_config,
    run_autosync,
    update_autosync_config,
)

router = APIRouter(prefix="/api/autosync", tags=["autosync"])


class AutoSyncConfigUpdate(BaseModel):
    platform: str = "instagram"
    enabled: bool | None = None
    sync_saved: bool | None = None
    sync_liked: bool | None = None
    interval_minutes: int | None = Field(default=None, ge=1, le=1440)


class AutoSyncTriggerRequest(BaseModel):
    platform: str = "instagram"


def _format_config_response(config: Any) -> dict[str, Any]:
    last_sync_iso = None
    if config.last_sync_at:
        dt = config.last_sync_at
        if getattr(dt, "tzinfo", None) is None:
            from ..db import WIB
            dt = dt.replace(tzinfo=WIB)
        last_sync_iso = dt.isoformat()

    return {
        "platform": config.platform,
        "enabled": config.enabled,
        "sync_saved": config.sync_saved,
        "sync_liked": config.sync_liked,
        "interval_minutes": config.interval_minutes,
        "last_sync_at": last_sync_iso,
        "last_sync_status": config.last_sync_status,
        "last_error": config.last_error,
        "items_synced_total": config.items_synced_total or 0,
        "last_discovered_count": getattr(config, "last_discovered_count", 0) or 0,
        "last_enqueued_count": getattr(config, "last_enqueued_count", 0) or 0,
        "last_skipped_count": getattr(config, "last_skipped_count", 0) or 0,
        "last_failed_count": getattr(config, "last_failed_count", 0) or 0,
        "session_expired": config.last_sync_status == "session_expired",
    }




@router.get("/config")
def get_config(platform: str = "instagram"):
    config = get_or_create_autosync_config(platform=platform)
    return _format_config_response(config)


@router.put("/config")
def update_config(payload: AutoSyncConfigUpdate):
    config = update_autosync_config(
        platform=payload.platform,
        enabled=payload.enabled,
        sync_saved=payload.sync_saved,
        sync_liked=payload.sync_liked,
        interval_minutes=payload.interval_minutes,
    )
    return _format_config_response(config)


@router.post("/trigger")
def trigger_sync(payload: AutoSyncTriggerRequest):
    result = run_autosync(platform=payload.platform, force=True)
    config = get_or_create_autosync_config(platform=payload.platform)
    return {
        "sync_result": result,
        "config": _format_config_response(config),
    }
