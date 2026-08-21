from __future__ import annotations

import os
from collections.abc import Iterable

from .base import BaseAdapter


class AdapterRegistry:
    def __init__(self) -> None:
        self._adapters: dict[str, BaseAdapter] = {}

    def register(self, adapter: BaseAdapter) -> None:
        self._adapters[adapter.platform] = adapter

    def get(self, platform: str) -> BaseAdapter | None:
        if not self._adapters:
            init_default_adapters()
        return self._adapters.get(platform)

    def all(self) -> Iterable[BaseAdapter]:
        if not self._adapters:
            init_default_adapters()
        return self._adapters.values()

    def detect(self, url: str) -> str | None:
        if not self._adapters:
            init_default_adapters()
        for platform, adapter in self._adapters.items():
            if adapter.detect(url):
                return platform
        return None


registry = AdapterRegistry()


def init_default_adapters() -> None:
    from .instagram import InstagramAdapter
    from .threads import ThreadsAdapter
    from .tiktok import TikTokAdapter
    from .x import XAdapter
    from .youtube import YouTubeAdapter
    from .reddit import RedditAdapter
    from .pinterest import PinterestAdapter
    from ..config import get_settings

    if "instagram" not in registry._adapters:
        instagram = InstagramAdapter()
        settings = get_settings()
        if settings.instagram_session_file and os.path.isfile(settings.instagram_session_file):
            instagram.load_session(settings.instagram_session_file, settings.instagram_username)
        registry.register(instagram)

    if "threads" not in registry._adapters:
        registry.register(ThreadsAdapter())
    if "tiktok" not in registry._adapters:
        registry.register(TikTokAdapter())
    if "x" not in registry._adapters:
        registry.register(XAdapter())
    if "youtube" not in registry._adapters:
        registry.register(YouTubeAdapter())
    if "reddit" not in registry._adapters:
        registry.register(RedditAdapter())
    if "pinterest" not in registry._adapters:
        registry.register(PinterestAdapter())


def detect_platform(url: str) -> BaseAdapter | None:
    platform_name = registry.detect(url)
    if platform_name:
        return registry.get(platform_name)
    return None
