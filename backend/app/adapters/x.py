from __future__ import annotations

import os
import re
from typing import Any

import gallery_dl

from .base import BaseAdapter, ResolvedMedia


class XAdapter(BaseAdapter):
    platform = "x"

    def detect(self, url: str) -> bool:
        return bool(re.search(r"(?i)(twitter\.com|x\.com)", url))

    def _extractor(self, url: str) -> Any:
        try:
            return gallery_dl.extractor.find(url)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"cannot find extractor for url: {exc}") from exc

    def resolve(self, url: str) -> ResolvedMedia:
        try:
            extr = self._extractor(url)
            for _item_url, kv in extr.items():
                return ResolvedMedia(
                    platform=self.platform,
                    source_url=url,
                    username=(kv.get("author") or kv.get("user") or {}).get("nick") if isinstance(kv.get("author") or kv.get("user"), dict) else (kv.get("author") or kv.get("uploader") or None),
                    caption=kv.get("content") or kv.get("description"),
                    posted_at=str(kv.get("date")) if kv.get("date") else None,
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

    def list_saved(self) -> list[str]:
        return []

    def health(self) -> bool:
        return True
