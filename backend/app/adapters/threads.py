from __future__ import annotations

import os
import re

import gallery_dl

from .base import BaseAdapter, ResolvedMedia
from ..engines import gdl_options


class ThreadsAdapter(BaseAdapter):
    platform = "threads"
    engine = "gallery-dl"

    def detect(self, url: str) -> bool:
        return bool(re.search(r"(?i)(threads\.net)", url))

    def resolve(self, url: str) -> ResolvedMedia:
        extr = gallery_dl.extractor.find(url)
        for _item_url, kv in extr.items():
            return ResolvedMedia(
                platform=self.platform,
                source_url=url,
                username=kv.get("author") or kv.get("uploader"),
                caption=kv.get("content") or kv.get("description"),
                posted_at=str(kv.get("date")) if kv.get("date") else None,
                hashtags=[],
            )
        raise ValueError("no media found")

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        gallery_dl.job.DownloadJob(url, {"directory": dest_dir, **gdl_options()}).run()
        return [
            os.path.join(dest_dir, f)
            for f in os.listdir(dest_dir)
            if os.path.isfile(os.path.join(dest_dir, f))
        ]

    def health(self) -> bool:
        return True
