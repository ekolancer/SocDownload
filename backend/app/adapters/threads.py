from __future__ import annotations

import os
import re

from .base import BaseAdapter, ResolvedMedia
from ..engines import gdl_download, gdl_first_item


class ThreadsAdapter(BaseAdapter):
    platform = "threads"
    engine = "gallery-dl"

    def detect(self, url: str) -> bool:
        return bool(re.search(r"(?i)(threads\.net)", url))

    def resolve(self, url: str) -> ResolvedMedia:
        kv = gdl_first_item(url)
        return ResolvedMedia(
            platform=self.platform,
            source_url=url,
            username=kv.get("author") or kv.get("uploader"),
            caption=kv.get("content") or kv.get("description"),
            posted_at=str(kv.get("date")) if kv.get("date") else None,
            hashtags=[],
        )

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        return gdl_download(url, dest_dir)

    def health(self) -> bool:
        return True
