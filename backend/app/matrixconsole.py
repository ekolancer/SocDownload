from __future__ import annotations

import asyncio
import json
import logging
import re
from collections import Counter, deque
from copy import deepcopy
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from threading import RLock
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import uuid4

_SECRET_KEYS = {"authorization", "token", "access_token", "refresh_token", "api_token", "password", "passwd", "cookie", "cookies", "session", "session_id", "secret"}
_SECRET_QUERY = {"token", "access_token", "refresh_token", "api_token", "key", "password", "session"}
_BEARER = re.compile(r"(?i)bearer\s+[a-z0-9._~+/=-]+")


def _secret_key(value: object) -> bool:
    key = str(value).lower().replace("-", "_")
    return key in _SECRET_KEYS or key.endswith(("_token", "_password", "_cookie", "_session", "_secret"))


def _redact_url(value: str) -> str:
    try:
        parts = urlsplit(value)
        if not parts.query:
            return value
        query = [(key, "[REDACTED]" if key.lower() in _SECRET_QUERY else item) for key, item in parse_qsl(parts.query, keep_blank_values=True)]
        return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    except ValueError:
        return value


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): "[REDACTED]" if _secret_key(key) else redact(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [redact(item) for item in value]
    if isinstance(value, str):
        return _BEARER.sub("Bearer [REDACTED]", _redact_url(value))
    return value


class EventStore:
    def __init__(self, capacity: int = 2000) -> None:
        self.capacity = capacity
        self._events: deque[dict[str, Any]] = deque(maxlen=capacity)
        self._lock = RLock()
        self._subscribers: set[tuple[asyncio.AbstractEventLoop, asyncio.Queue]] = set()

    def append(self, event: dict[str, Any]) -> dict[str, Any]:
        item = redact(deepcopy(event))
        item.setdefault("id", uuid4().hex)
        item.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
        with self._lock:
            self._events.append(item)
            subscribers = tuple(self._subscribers)
        for loop, queue in subscribers:
            try:
                loop.call_soon_threadsafe(self._offer, queue, item)
            except RuntimeError:
                self.unsubscribe(loop, queue)
        return item

    @staticmethod
    def _offer(queue: asyncio.Queue, item: dict[str, Any]) -> None:
        if queue.full():
            queue.get_nowait()
        queue.put_nowait(item)

    def get(self, event_id: str) -> dict[str, Any] | None:
        with self._lock:
            return next((deepcopy(item) for item in self._events if item["id"] == event_id), None)

    def list(self, *, source: str | None = None, severity: str | None = None, code: str | None = None, text: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        with self._lock:
            events = list(self._events)
        if source:
            events = [item for item in events if item.get("source") == source]
        if severity:
            events = [item for item in events if item.get("severity") == severity]
        if code:
            events = [item for item in events if item.get("code") == code]
        if text:
            needle = text.lower()
            events = [item for item in events if needle in json.dumps(item, ensure_ascii=False).lower()]
        return [deepcopy(item) for item in events[-limit:]][::-1]

    def stats(self) -> dict[str, Any]:
        with self._lock:
            events = list(self._events)
        return {"count": len(events), "capacity": self.capacity, "by_severity": dict(Counter(item.get("severity", "unknown") for item in events)), "by_source": dict(Counter(item.get("source", "unknown") for item in events))}

    def sources(self) -> list[str]:
        with self._lock:
            return sorted({str(item.get("source")) for item in self._events if item.get("source")})

    def subscribe(self) -> tuple[asyncio.AbstractEventLoop, asyncio.Queue]:
        subscriber = (asyncio.get_running_loop(), asyncio.Queue(maxsize=100))
        with self._lock:
            self._subscribers.add(subscriber)
        return subscriber

    def unsubscribe(self, loop: asyncio.AbstractEventLoop, queue: asyncio.Queue) -> None:
        with self._lock:
            self._subscribers.discard((loop, queue))


store = EventStore()


class ConsoleFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        event = getattr(record, "event", {})
        return event.get("code") != "request_completed"


class HumanFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        event = getattr(record, "event", {})
        code = event.get("code", "log_event").upper().replace("_", " ")
        details = " ".join(f"{key}={value}" for key, value in event.items() if key not in {"code", "severity"})
        suffix = f" {details}" if details else ""
        return f"[{datetime.fromtimestamp(record.created, timezone.utc).astimezone().strftime('%H:%M:%S')}] {code} {record.getMessage()}{suffix}"


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        event = {"timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(), "severity": record.levelname.lower(), "source": record.name, "message": record.getMessage()}
        if hasattr(record, "event") and isinstance(record.event, dict):
            event.update(record.event)
        if record.exc_info:
            event["exception"] = self.formatException(record.exc_info)
        return json.dumps(redact(event), ensure_ascii=False, default=str)


class ConsoleHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            payload = json.loads(JsonFormatter().format(record))
            payload.setdefault("code", "log_event")
            payload.setdefault("retryable", False)
            store.append(payload)
        except Exception:
            self.handleError(record)


def configure_console_logging(log_path: Path) -> None:
    root = logging.getLogger()
    if not any(isinstance(handler, ConsoleHandler) for handler in root.handlers):
        console_handler = ConsoleHandler()
        console_handler.addFilter(ConsoleFilter())
        root.addHandler(console_handler)
    resolved = log_path.resolve()
    if not any(isinstance(handler, RotatingFileHandler) and Path(handler.baseFilename) == resolved for handler in root.handlers):
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(log_path, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8")
        handler.setFormatter(JsonFormatter())
        root.addHandler(handler)
