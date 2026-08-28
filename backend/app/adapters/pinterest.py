from __future__ import annotations

import os
import re
from .base import BaseAdapter, ResolvedMedia, extract_username
from ..engines import gdl_download, gdl_first_item


class PinterestAdapter(BaseAdapter):
    platform = "pinterest"
    engine = "gallery-dl"

    def detect(self, url: str) -> bool:
        return bool(re.search(r"(?i)(pinterest\.com|pin\.it)", url))

    def resolve(self, url: str) -> ResolvedMedia:
        try:
            kv = gdl_first_item(url)
            username = extract_username(kv, "pinner", "native_creator", "creator", "owner", "user", "username", "uploader")
            if not username:
                match = re.search(r"pinterest\.com/([^/?#]+)/pin/", url, re.IGNORECASE)
                username = match.group(1) if match else None
            return ResolvedMedia(
                platform=self.platform,
                source_url=url,
                username=username,
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
        return gdl_download(url, dest_dir)

    def health(self) -> bool:
        return True
