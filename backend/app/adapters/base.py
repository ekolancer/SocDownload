from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class ResolvedMedia:
    platform: str
    source_url: str
    username: str | None = None
    caption: str | None = None
    posted_at: str | None = None
    hashtags: list[str] = field(default_factory=list)
    files: list[str] = field(default_factory=list)


class BaseAdapter(Protocol):
    platform: str

    def resolve(self, url: str) -> ResolvedMedia:
        ...

    def download(self, url: str, dest_dir: str) -> list[str]:
        ...

    def list_saved(self, limit: int = 200) -> list[str]:
        return []

    def list_liked(self, limit: int = 200) -> list[str]:
        return []

    def health(self) -> bool:
        return True

    def detect(self, url: str) -> bool:
        return self.platform in url

