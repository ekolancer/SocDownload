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
    if "instagram" not in registry._adapters:
        instagram = InstagramAdapter()
        session_file = ""
        username = ""
        try:
            from ..db import AppSettings, get_session_factory
            session = get_session_factory()()
            stored = session.get(AppSettings, 1)
            if stored:
                session_file = stored.instagram_session_file or session_file
                username = stored.instagram_username or username
            session.close()
        except Exception:
            pass
        if session_file and os.path.isfile(session_file):
            instagram.load_session(session_file, username)
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
