from __future__ import annotations

import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .adapters.registry import registry
from .db import PlatformAdapter, get_session_factory, now_wib

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def check_adapters_health() -> None:
    factory = get_session_factory()
    with factory() as session:
        for adapter in registry.all():
            is_ok = adapter.health()
            row = (
                session.query(PlatformAdapter)
                .filter(PlatformAdapter.platform == adapter.platform)
                .first()
            )
            if not row:
                row = PlatformAdapter(
                    platform=adapter.platform,
                    adapter_name=adapter.__class__.__name__,
                    engine=getattr(adapter, "engine", "native"),
                    engine_version=None,
                )
                session.add(row)
            row.health_ok = is_ok
            row.last_health_at = now_wib()
            session.commit()



def run_periodic_autosync() -> None:
    from .autosync import run_autosync
    try:
        run_autosync(platform="instagram", force=False)
    except Exception as e:
        logger.error("Periodic autosync error: %s", e)


def start_scheduler() -> None:
    if not scheduler.running:
        scheduler.add_job(check_adapters_health, "interval", minutes=30, id="adapter_health")
        scheduler.add_job(run_periodic_autosync, "interval", minutes=1, id="autosync_tick")
        scheduler.start()

