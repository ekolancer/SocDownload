from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from ..db import PlatformAdapter, get_session_factory

router = APIRouter(prefix="/api", tags=["adapters"])


@router.get("/adapters")
def list_adapters():
    factory = get_session_factory()
    with factory() as session:
        rows = session.scalars(select(PlatformAdapter).order_by(PlatformAdapter.platform)).all()
        return [
            {
                "platform": r.platform,
                "adapter_name": r.adapter_name,
                "engine": r.engine,
                "health_ok": r.health_ok,
                "last_health_at": r.last_health_at,
            }
            for r in rows
        ]
