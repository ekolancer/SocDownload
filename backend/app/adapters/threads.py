from __future__ import annotations

import os
import re

from .base import BaseAdapter, ResolvedMedia
from ..engines import gdl_download, gdl_first_item


class ThreadsAdapter(BaseAdapter):
    platform = "threads"
    engine = "gallery-dl"

    def detect(self, url: str) -> bool:
        return bool(re.search(r"(?i)(threads\.net|threads\.com)", url))

    def resolve(self, url: str) -> ResolvedMedia:
        try:
            kv = gdl_first_item(url)
            return ResolvedMedia(
                platform=self.platform,
                source_url=url,
                username=kv.get("author") or kv.get("uploader"),
                caption=kv.get("content") or kv.get("description"),
                posted_at=str(kv.get("date")) if kv.get("date") else None,
                hashtags=[],
            )
        except Exception as e:
            raise RuntimeError(
                f"Threads extraction requires cookies or is currently restricted by Meta anti-bot: {e}"
            ) from e

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        try:
            return gdl_download(url, dest_dir)
        except Exception as e:
            raise RuntimeError(
                f"Threads download failed (cookies required in .env COOKIES_FILE): {e}"
            ) from e

    def health(self) -> bool:
        return True
