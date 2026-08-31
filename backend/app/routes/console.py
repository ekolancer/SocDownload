from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from ..matrixconsole import store

router = APIRouter(prefix="/api/console", tags=["console"])


def _matches(event: dict, source: str | None, severity: str | None, code: str | None, text: str | None) -> bool:
    if source and event.get("source") != source:
        return False
    if severity and event.get("severity") != severity:
        return False
    if code and event.get("code") != code:
        return False
    return not text or text.lower() in json.dumps(event, ensure_ascii=False).lower()


@router.get("/events")
def events(source: str | None = None, severity: str | None = None, code: str | None = None, q: str | None = Query(default=None, max_length=200), limit: int = Query(default=100, ge=1, le=1000)):
    return {"events": store.list(source=source, severity=severity, code=code, text=q, limit=limit)}


@router.get("/stats")
def stats():
    return store.stats()


@router.get("/sources")
def sources():
    return {"sources": store.sources()}


@router.get("/events/{event_id}")
def event(event_id: str):
    item = store.get(event_id)
    if item is None:
        raise HTTPException(status_code=404)
    return item


@router.get("/stream")
def stream(request: Request, source: str | None = None, severity: str | None = None, code: str | None = None, q: str | None = Query(default=None, max_length=200)):
    async def generate():
        loop, queue = store.subscribe()
        try:
            while not await request.is_disconnected():
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=15)
                except TimeoutError:
                    yield ": keepalive\n\n"
                    continue
                if _matches(item, source, severity, code, q):
                    yield f"id: {item['id']}\ndata: {json.dumps(item, ensure_ascii=False)}\n\n"
        finally:
            store.unsubscribe(loop, queue)

    return StreamingResponse(generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
