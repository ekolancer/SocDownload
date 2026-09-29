from __future__ import annotations

import os
import re
from dataclasses import dataclass, field

from .base import BaseAdapter, ResolvedMedia, extract_username
from ..engines import gdl_download, gdl_first_item


@dataclass(frozen=True)
class PlatformSpec:
    """Data describing one gallery-dl backed platform.

    Platforms differ only in hosts, the metadata keys that hold each field,
    and an optional URL fallback for the creator name. The resolve/download
    body is shared by :class:`GalleryDlAdapter`.
    """

    platform: str
    host_pattern: str
    username_keys: tuple[str, ...] = ()
    caption_keys: tuple[str, ...] = ("content", "description", "title")
    posted_at_keys: tuple[str, ...] = ("date",)
    hashtags_keys: tuple[str, ...] = ("tags", "hashtags")
    url_username_pattern: str | None = None
    engine: str = "gallery-dl"

    def detect(self, url: str) -> bool:
        return bool(re.search(self.host_pattern, url, re.IGNORECASE))


def _first(metadata: dict, keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = metadata.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


class GalleryDlAdapter(BaseAdapter):
    """One deep adapter that drives gallery-dl for many platforms.

    The platform-specific facts live in a :class:`PlatformSpec`; resolve and
    download behave identically across them.
    """

    def __init__(self, spec: PlatformSpec) -> None:
        self.spec = spec
        self.platform = spec.platform
        self.engine = spec.engine

    def detect(self, url: str) -> bool:
        return self.spec.detect(url)

    def _username(self, metadata: dict, url: str) -> str | None:
        username = extract_username(metadata, *self.spec.username_keys)
        if not username and self.spec.url_username_pattern:
            match = re.search(self.spec.url_username_pattern, url, re.IGNORECASE)
            if match:
                username = match.group(1)
        return username

    def resolve(self, url: str) -> ResolvedMedia:
        try:
            metadata = gdl_first_item(url)
        except Exception:
            # Best-effort: a failed resolve must not fail the download.
            metadata = {}
        hashtags = metadata.get(self.spec.hashtags_keys[0]) if self.spec.hashtags_keys else None
        if not isinstance(hashtags, list):
            hashtags = []
        return ResolvedMedia(
            platform=self.platform,
            source_url=url,
            username=self._username(metadata, url),
            caption=_first(metadata, self.spec.caption_keys),
            posted_at=_first(metadata, self.spec.posted_at_keys),
            hashtags=hashtags,
        )

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        return gdl_download(url, dest_dir)

    def health(self) -> bool:
        return True
