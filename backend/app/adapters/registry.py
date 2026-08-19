from __future__ import annotations

from collections.abc import Iterable

from .base import BaseAdapter


class AdapterRegistry:
    def __init__(self) -> None:
        self._adapters: dict[str, BaseAdapter] = {}

    def register(self, adapter: BaseAdapter) -> None:
        self._adapters[adapter.platform] = adapter

    def get(self, platform: str) -> BaseAdapter | None:
        return self._adapters.get(platform)

    def all(self) -> Iterable[BaseAdapter]:
        return self._adapters.values()

    def detect(self, url: str) -> str | None:
        for platform, adapter in self._adapters.items():
            if adapter.detect(url):
                return platform
        return None


registry = AdapterRegistry()
