from __future__ import annotations

import hashlib
import json
import os
import shutil
import time
from datetime import datetime

from .config import get_settings
from .db import MediaFile, MediaItem, get_session_factory, now_wib



def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def compute_hashes(files: list[str]) -> dict[str, str]:
    return {f: sha256_file(f) for f in files}


def existing_by_url(url: str) -> MediaItem | None:
    from sqlalchemy import select

    factory = get_session_factory()
    with factory() as session:
        return session.scalars(select(MediaItem).where(MediaItem.source_url == url)).first()


def existing_by_sha256(sha: str) -> MediaItem | None:
    from sqlalchemy import select

    factory = get_session_factory()
    with factory() as session:
        return session.scalars(select(MediaItem).where(MediaItem.sha256 == sha)).first()


def _safe_username(username: str | None) -> str:
    if not username:
        return "unknown"
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in username)


def _safe_date(posted_at: str | None) -> str:
    if posted_at:
        return posted_at[:10].replace(":", "-")
    return now_wib().strftime("%Y-%m-%d")


def organize(
    media_root: str,
    platform: str,
    username: str | None,
    posted_at: str | None,
    files: list[str],
) -> list[str]:
    dest = os.path.join(media_root, platform, _safe_username(username), _safe_date(posted_at))
    os.makedirs(dest, exist_ok=True)
    moved: list[str] = []
    for f in files:
        base = os.path.basename(f)
        target = os.path.join(dest, base)
        if os.path.abspath(f) != os.path.abspath(target):
            _move_file(f, target)
        moved.append(target)
    return moved


def _move_file(source: str, target: str) -> None:
    """Move a downloaded file into the media tree.

    The media root may live on a bind mount (e.g. NTFS via WSL) that rejects
    ``utime``/``chmod``. ``shutil.move`` falls back to ``copy2`` on
    cross-device moves and then raises ``PermissionError`` from ``copystat``,
    even though the bytes were copied. Fall back to copy-without-metadata so
    the transfer still succeeds.
    """
    try:
        shutil.move(source, target)
    except OSError:
        # If the move partially succeeded, the bytes already sit at target and
        # the source is gone (e.g. copystat/utime failed after copy2). Treat
        # that as success rather than re-copying from a missing source.
        if os.path.exists(target):
            if os.path.exists(source):
                try:
                    os.remove(source)
                except OSError:
                    pass
            return
        shutil.copyfile(source, target)
        try:
            os.remove(source)
        except OSError:
            pass


def write_metadata(dest_dir: str, metadata: dict) -> str:
    path = os.path.join(dest_dir, "metadata.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2, default=str)
    return path
