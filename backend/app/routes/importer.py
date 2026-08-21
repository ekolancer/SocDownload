import asyncio
from fastapi import APIRouter, File, UploadFile, HTTPException
from ..config import get_settings
from ..importer import parse_archive_file
from ..service import bulk_enqueue

router = APIRouter(prefix="/api", tags=["import"])


@router.post("/import/json")
async def import_archive(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    if not (filename.endswith(".json") or filename.endswith(".html") or filename.endswith(".htm") or filename.endswith(".txt")):
        raise HTTPException(
            status_code=400,
            detail="Supported archive formats: .json, .html, .htm, .txt",
        )
    
    content = await file.read()
    try:
        urls = parse_archive_file(content, file.filename or "")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to process archive: {exc}")

    if not urls:
        raise HTTPException(
            status_code=400,
            detail="No valid social media URLs (Instagram, TikTok, Threads, X, YouTube, etc.) found in the uploaded file.",
        )

    settings = get_settings()
    result = await asyncio.to_thread(bulk_enqueue, urls, settings.import_url_limit)

    return {
        "total_found": len(urls),
        "imported_count": len(result["enqueued"]),
        "skipped_dup_count": len(result["skipped_dup"]),
        "skipped_limit_count": len(result["skipped_limit"]),
        "limit": settings.import_url_limit,
        "job_ids": result["job_ids"],
        "urls": result["enqueued"],
        "skipped_dup": result["skipped_dup"][:20],
        "skipped_limit": result["skipped_limit"][:20],
    }


