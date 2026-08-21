from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from threading import RLock

from .config import ROOT, get_settings

_gdl_lock = RLock()


def _cookies() -> str | None:
    cf = get_settings().cookies_file
    if not cf:
        return None
    if os.path.isabs(cf) and os.path.isfile(cf):
        return cf
    candidate = str((ROOT / cf).resolve())
    if os.path.isfile(candidate):
        return candidate
    if os.path.isfile(cf):
        return os.path.abspath(cf)
    return None


def ydl_opts(**extra) -> dict:
    opts: dict = {"quiet": True, **extra}
    ck = _cookies()
    if ck:
        opts["cookiefile"] = ck
    return opts


def gdl_options() -> dict:
    opts: dict = {}
    ck = _cookies()
    if ck:
        opts["cookies"] = ck
    return opts


@contextmanager
def gdl_config(dest_dir: str | None = None):
    import gallery_dl

    config = []
    if dest_dir:
        config.extend(
            [
                ((), "base-directory", str(Path(dest_dir).resolve())),
                ((), "directory", []),
            ]
        )
    cookies = _cookies()
    if cookies:
        config.append(((), "cookies", cookies))

    with _gdl_lock, gallery_dl.config.apply(config):
        yield


def gdl_download(url: str, dest_dir: str) -> list[str]:
    import gallery_dl

    with gdl_config(dest_dir):
        status = gallery_dl.job.DownloadJob(url).run()

    files = [
        os.path.join(dest_dir, name)
        for name in os.listdir(dest_dir)
        if os.path.isfile(os.path.join(dest_dir, name))
    ]
    if status:
        raise RuntimeError(f"gallery-dl failed with status {status}")
    if not files:
        raise RuntimeError("gallery-dl downloaded no files")
    return files


def gdl_first_item(url: str) -> dict:
    import gallery_dl
    from gallery_dl.extractor.message import Message

    with gdl_config():
        extractor = gallery_dl.extractor.find(url)
        if not extractor:
            raise RuntimeError("gallery-dl found no extractor")
        for message, _item_url, metadata in extractor:
            if message in (Message.Directory, Message.Url):
                return metadata
    raise RuntimeError("gallery-dl found no media")
