import asyncio
from fastapi import APIRouter, File, UploadFile, HTTPException
from ..config import get_settings
from ..importer import parse_archive_file, parse_vidara_txt
from ..service import bulk_enqueue

router = APIRouter(prefix="/api", tags=["import"])


def import_response(urls: list[str], result: dict) -> dict:
    return {
        "total_found": len(urls),
        "imported_count": len(result["enqueued"]),
        "skipped_dup_count": len(result["skipped_dup"]),
        "skipped_limit_count": len(result["skipped_limit"]),
        "skipped_invalid_count": len(result["skipped_invalid"]),
        "limit": get_settings().import_url_limit,
        "job_ids": result["job_ids"],
        "urls": result["enqueued"],
        "skipped_dup": result["skipped_dup"][:20],
        "skipped_limit": result["skipped_limit"][:20],
        "skipped_invalid": result["skipped_invalid"][:20],
    }


@router.post("/import/json")
async def import_archive(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    if not (filename.endswith(".json") or filename.endswith(".html") or filename.endswith(".htm") or filename.endswith(".txt")):
        raise HTTPException(
            status_code=400,
            detail="Supported archive formats: .json, .html, .htm, .txt",
        )
    
    settings = get_settings()
    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Uploaded file is too large")
    try:
        urls = parse_archive_file(content, file.filename or "")
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to process archive")

    if not urls:
        raise HTTPException(
            status_code=400,
            detail="No valid social media URLs (Instagram, TikTok, Threads, X, YouTube, etc.) found in the uploaded file.",
        )

    result = await asyncio.to_thread(bulk_enqueue, urls, settings.import_url_limit)

    return import_response(urls, result)


@router.post("/import/vidara")
async def import_vidara(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".txt"):
        raise HTTPException(status_code=400, detail="Vidara import requires a .txt file")

    settings = get_settings()
    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Uploaded file is too large")
    try:
        urls, invalid = parse_vidara_txt(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    url_line_count = sum(1 for line in content.decode("utf-8").splitlines() if line.strip() and not line.strip().startswith("#"))
    if url_line_count > settings.parser_url_limit:
        raise HTTPException(status_code=413, detail="TXT contains too many URL lines")
    if invalid:
        raise HTTPException(status_code=400, detail={"message": "Invalid Vidara URL lines", "invalid": invalid[:20], "invalid_count": len(invalid)})
    if not urls:
        raise HTTPException(status_code=400, detail="No Vidara URLs found in the uploaded file")

    result = await asyncio.to_thread(bulk_enqueue, urls, settings.import_url_limit)
    return import_response(urls, result)


