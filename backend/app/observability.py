from __future__ import annotations

import logging
import time
from collections import Counter
from pathlib import Path
from contextvars import ContextVar
from uuid import uuid4

from fastapi import APIRouter, Request
from sqlalchemy import text

from .config import ROOT
from .db import get_session_factory
from .matrixconsole import configure_console_logging

router = APIRouter(prefix="/api", tags=["health"])
_request_id: ContextVar[str] = ContextVar("request_id", default="-")
_metrics = Counter()
_job_metrics = Counter()
_job_durations: list[float] = []


class RequestFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        record.request_id = _request_id.get()
        return super().format(record)


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO)
    formatter = RequestFormatter('{"level":"%(levelname)s","message":"%(message)s","request_id":"%(request_id)s"}')
    root = logging.getLogger()
    for handler in root.handlers:
        handler.setFormatter(formatter)
    configure_console_logging(Path(ROOT) / "data" / "matrixconsole.jsonl")


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/health/ready")
def readiness():
    try:
        with get_session_factory()() as session:
            session.execute(text("SELECT 1"))
    except Exception:
        return {"status": "not_ready"}
    return {"status": "ready"}


@router.get("/metrics")
def metrics():
    from .service import get_queue

    return {
        "requests_total": sum(_metrics.values()),
        "requests_by_status": dict(_metrics),
        "queue_depth": get_queue().qsize(),
        "jobs": dict(_job_metrics),
        "job_duration_seconds": {
            "count": len(_job_durations),
            "total": sum(_job_durations),
            "max": max(_job_durations, default=0),
        },
    }


def record_job(status: str, duration: float, retried: bool = False) -> None:
    _job_metrics[f"{status}_total"] += 1
    if retried:
        _job_metrics["retries_total"] += 1
    _job_durations.append(duration)


def request_metrics_middleware(app):
    async def middleware(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid4())
        token = _request_id.set(request_id)
        started = time.perf_counter()
        try:
            response = await call_next(request)
            _metrics[f"{request.method} {request.url.path} {response.status_code}"] += 1
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            duration = time.perf_counter() - started
            logging.getLogger(__name__).info(
                "%s %s selesai dalam %.3fs",
                request.method,
                request.url.path,
                duration,
                extra={"event": {"code": "request_completed", "method": request.method, "path": request.url.path, "status_code": getattr(locals().get("response"), "status_code", 500), "duration_ms": round(duration * 1000, 2), "request_id": request_id}},
            )
            _request_id.reset(token)
    return middleware
