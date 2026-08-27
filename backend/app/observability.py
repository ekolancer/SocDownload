from __future__ import annotations

import logging
import time
from collections import Counter
from contextvars import ContextVar
from uuid import uuid4

from fastapi import APIRouter, Request
from sqlalchemy import text

from .db import get_session_factory

router = APIRouter(prefix="/api", tags=["health"])
_request_id: ContextVar[str] = ContextVar("request_id", default="-")
_metrics = Counter()
_job_metrics = Counter()
_job_durations: list[float] = []


class RequestFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return self._style._fmt.replace("%(request_id)s", _request_id.get()) % {
            **record.__dict__, "request_id": _request_id.get()
        }


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format='{"level":"%(levelname)s","message":"%(message)s","request_id":"%(request_id)s"}')


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
            _request_id.reset(token)
            logging.getLogger(__name__).info("request completed in %.3fs", time.perf_counter() - started)
    return middleware
