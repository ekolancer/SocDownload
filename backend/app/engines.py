from __future__ import annotations

import os

from .config import get_settings


def _cookies() -> str | None:
    cf = get_settings().cookies_file
    if cf and os.path.isfile(cf):
        return cf
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
