from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from .config import ROOT, get_settings


def executable(name: str) -> str | None:
    configured = getattr(get_settings(), name)
    return shutil.which(configured) or (configured if Path(configured).is_file() else None)


def ffmpeg_path() -> str | None:
    return executable("ffmpeg_path")


def ffprobe_path() -> str | None:
    return executable("ffprobe_path")


def probe(path: str | Path) -> dict:
    binary = ffprobe_path()
    if not binary:
        raise RuntimeError("ffprobe unavailable")
    result = subprocess.run([binary, "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)], capture_output=True, text=True, check=False, timeout=get_settings().video_process_timeout_seconds)
    if result.returncode or not result.stdout:
        raise RuntimeError("video probe failed")
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("invalid video probe output") from exc


def _video_stream(data: dict) -> dict:
    return next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})


def normalize(path: str | Path) -> str:
    path = Path(path)
    data = probe(path)
    fmt = data.get("format", {}).get("format_name", "")
    if "mpegts" not in fmt and path.suffix.lower() == ".mp4":
        return str(path)
    binary = ffmpeg_path()
    if not binary:
        raise RuntimeError("ffmpeg unavailable")
    target = Path(tempfile.mktemp(prefix="mv_norm_", suffix=".mp4", dir=path.parent))
    result = subprocess.run([binary, "-y", "-i", str(path), "-map", "0", "-c", "copy", "-movflags", "+faststart", str(target)], capture_output=True, text=True, check=False, timeout=get_settings().video_process_timeout_seconds)
    if result.returncode or not target.is_file() or probe(target).get("format", {}).get("format_name", "").find("mp4") < 0:
        target.unlink(missing_ok=True)
        raise RuntimeError("video normalization failed")
    path.unlink(missing_ok=True)
    target.replace(path.with_suffix(".mp4"))
    return str(path.with_suffix(".mp4"))


def thumbnail(path: str | Path) -> tuple[str, dict]:
    path = Path(path)
    data = probe(path)
    duration = float(data.get("format", {}).get("duration") or 0)
    offset = min(get_settings().thumbnail_offset_seconds, max(0, duration * 0.25))
    binary = ffmpeg_path()
    if not binary:
        raise RuntimeError("ffmpeg unavailable")
    target = Path(tempfile.mktemp(prefix="mv_thumb_", suffix=".webp", dir=path.parent))
    result = subprocess.run([binary, "-y", "-ss", str(offset), "-i", str(path), "-frames:v", "1", "-vf", f"scale={get_settings().thumbnail_width}:-2", "-quality", str(get_settings().thumbnail_quality), str(target)], capture_output=True, text=True, check=False, timeout=get_settings().video_process_timeout_seconds)
    if result.returncode or not target.is_file() or target.stat().st_size == 0:
        target.unlink(missing_ok=True)
        raise RuntimeError("thumbnail generation failed")
    final = path.with_suffix(".webp")
    target.replace(final)
    return str(final), {"width": _video_stream(data).get("width"), "height": _video_stream(data).get("height"), "duration": duration, "video_codec": _video_stream(data).get("codec_name"), "audio_codec": next((s.get("codec_name") for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)}
