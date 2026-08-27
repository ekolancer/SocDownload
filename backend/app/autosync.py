from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from sqlalchemy import select

from .adapters.registry import registry
from .db import AutoSyncConfig, WIB, get_session_factory, now_wib
from .service import bulk_enqueue

logger = logging.getLogger(__name__)



def get_or_create_autosync_config(platform: str = "instagram") -> AutoSyncConfig:
    """Retrieve existing auto-sync config or create default record if not found."""
    factory = get_session_factory()
    with factory() as session:
        config = session.scalar(
            select(AutoSyncConfig).where(AutoSyncConfig.platform == platform)
        )
        if not config:
            config = AutoSyncConfig(
                platform=platform,
                enabled=False,
                sync_saved=True,
                sync_liked=False,
                interval_minutes=15,
                last_sync_at=None,
                last_sync_status=None,
                last_error=None,
                items_synced_total=0,
            )
            session.add(config)
            session.commit()
            session.refresh(config)
        return config


def update_autosync_config(
    platform: str = "instagram",
    enabled: bool | None = None,
    sync_saved: bool | None = None,
    interval_minutes: int | None = None,
) -> AutoSyncConfig:
    """Update auto-sync settings for a platform."""
    factory = get_session_factory()
    with factory() as session:
        config = session.scalar(
            select(AutoSyncConfig).where(AutoSyncConfig.platform == platform)
        )
        if not config:
            config = AutoSyncConfig(platform=platform)
            session.add(config)

        if enabled is not None:
            config.enabled = enabled
        if sync_saved is not None:
            config.sync_saved = sync_saved
        config.sync_liked = False
        if interval_minutes is not None:
            config.interval_minutes = max(1, interval_minutes)

        session.commit()
        session.refresh(config)
        return config


def run_autosync(platform: str = "instagram", force: bool = False) -> dict[str, Any]:
    """Execute auto-sync check and enqueue new saved/liked items."""
    factory = get_session_factory()
    with factory() as session:
        config = session.scalar(
            select(AutoSyncConfig).where(AutoSyncConfig.platform == platform)
        )
        if not config:
            config = AutoSyncConfig(
                platform=platform,
                enabled=False,
                sync_saved=True,
                sync_liked=False,
                interval_minutes=15,
            )
            session.add(config)
            session.commit()

        if not config.enabled and not force:
            return {"status": "disabled", "platform": platform, "enqueued_count": 0}

        # Check interval timing if not forced
        if not force and config.last_sync_at:
            last_sync_tz = config.last_sync_at if config.last_sync_at.tzinfo else config.last_sync_at.replace(tzinfo=WIB)
            elapsed_minutes = (now_wib() - last_sync_tz).total_seconds() / 60
            if elapsed_minutes < config.interval_minutes:
                return {
                    "status": "skipped_interval",
                    "platform": platform,
                    "minutes_remaining": round(config.interval_minutes - elapsed_minutes, 1),
                }

        adapter = registry.get(platform)
        if not adapter:
            config.last_sync_status = "error"
            config.last_error = f"Adapter for {platform} not registered"
            session.commit()
            return {"status": "error", "error": config.last_error}

        # Validate session if adapter supports it
        if hasattr(adapter, "check_session_valid"):
            is_valid, reason = adapter.check_session_valid()
            if not is_valid and reason in ("session_expired", "no_session_configured"):
                config.last_sync_status = "session_expired"
                config.last_error = "Session expired, please re-login and update cookie."
                config.last_sync_at = now_wib()
                session.commit()
                return {
                    "status": "session_expired",
                    "platform": platform,
                    "error": config.last_error,
                    "enqueued_count": 0,
                }

        try:
            collected_urls: list[str] = []
            # Fetch Saved posts
            if hasattr(adapter, "list_saved"):
                saved_urls = adapter.list_saved(limit=100)
                collected_urls.extend(saved_urls)


            # Deduplicate within this fetch
            unique_urls = list(dict.fromkeys(collected_urls))


            if not unique_urls:
                config.last_sync_status = "ok"
                config.last_error = None
                config.last_sync_at = now_wib()
                config.last_discovered_count = 0
                config.last_enqueued_count = 0
                config.last_skipped_count = 0
                config.last_failed_count = 0
                session.commit()
                return {
                    "status": "ok",
                    "platform": platform,
                    "fetched_total": 0,
                    "enqueued_count": 0,
                    "skipped_dup_count": 0,
                    "failed_count": 0,
                }

            # Enqueue with deduplication against existing Job & MediaItem tables
            enqueue_result = bulk_enqueue(unique_urls, limit=500)
            enqueued_count = len(enqueue_result["enqueued"])
            skipped_dup_count = len(enqueue_result["skipped_dup"]) + len(enqueue_result.get("skipped_limit", []))

            logger.info(
                "[AutoSync] %s: fetched %d URLs | %d new enqueued | %d skipped duplicates",
                platform,
                len(unique_urls),
                enqueued_count,
                skipped_dup_count,
            )

            config.last_sync_status = "ok"
            config.last_error = None
            config.last_sync_at = now_wib()
            config.items_synced_total = (config.items_synced_total or 0) + enqueued_count
            config.last_discovered_count = len(unique_urls)
            config.last_enqueued_count = enqueued_count
            config.last_skipped_count = skipped_dup_count
            config.last_failed_count = 0
            session.commit()

            return {
                "status": "ok",
                "platform": platform,
                "fetched_total": len(unique_urls),
                "enqueued_count": enqueued_count,
                "skipped_dup_count": skipped_dup_count,
                "failed_count": 0,
                "job_ids": enqueue_result["job_ids"],
            }

        except Exception as exc:
            err_msg = str(exc)
            logger.error("AutoSync error for %s: %s", platform, err_msg)
            if "session_expired" in err_msg.lower() or "401" in err_msg:
                config.last_sync_status = "session_expired"
                config.last_error = "Session expired, please re-login and update cookie."
            else:
                config.last_sync_status = "error"
                config.last_error = err_msg

            config.last_sync_at = now_wib()
            config.last_failed_count = (config.last_failed_count or 0) + 1
            session.commit()

            return {
                "status": config.last_sync_status,
                "platform": platform,
                "error": config.last_error,
                "enqueued_count": 0,
                "skipped_dup_count": 0,
                "failed_count": 1,
            }

