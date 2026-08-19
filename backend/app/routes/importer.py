from __future__ import annotations

from fastapi import APIRouter, File, UploadFile, HTTPException
import json
from ..importer import parse_archive_json
from ..service import enqueue

router = APIRouter(prefix="/api", tags=["import"])


@router.post("/import/json")
async def import_json(file: UploadFile = File(...)):
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only JSON files supported")
    content = await file.read()
    try:
        data = json.loads(content.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {exc}")

    urls = parse_archive_json(data)
    job_ids = []
    for url in urls:
        job_id = enqueue(url)
        job_ids.append(job_id)

    return {
        "imported_count": len(urls),
        "job_ids": job_ids,
        "urls": urls,
    }
