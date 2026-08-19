from __future__ import annotations

import os
import re
from typing import Any

import gallery_dl

from .base import BaseAdapter, ResolvedMedia


class PinterestAdapter(BaseAdapter):
    platform = "pinterest"
    engine = "gallery-dl"

    def detect(self, url: str) -> bool:
        return bool(re.search(r"(?i)(pinterest\.com|pin\.it)", url))

    def resolve(self, url: str) -> ResolvedMedia:
        try:
            extr = gallery_dl.extractor.find(url)
            for _item_url, kv in extr.items():
                return ResolvedMedia(
                    platform=self.platform,
                    source_url=url,
                    username=kv.get("author") or kv.get("uploader"),
                    caption=kv.get("title") or kv.get("description"),
                    posted_at=None,
                    hashtags=[],
                )
        except Exception:
            pass
        return ResolvedMedia(
            platform=self.platform,
            source_url=url,
            username=None,
            caption=None,
            posted_at=None,
            hashtags=[],
        )

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        try:
            gallery_dl.job.DownloadJob(url, {"directory": dest_dir}).run()
        except Exception:
            pass
        return [
            os.path.join(dest_dir, f)
            for f in os.listdir(dest_dir)
            if os.path.isfile(os.path.join(dest_dir, f))
        ]

    def health(self) -> bool:
        return True
