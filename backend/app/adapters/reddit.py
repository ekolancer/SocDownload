from __future__ import annotations

from .gallerydl import GalleryDlAdapter, PlatformSpec

SPEC = PlatformSpec(
    platform="reddit",
    host_pattern=r"(?i)(reddit\.com|redd\.it)",
    username_keys=("author", "user", "username", "uploader"),
)


class RedditAdapter(GalleryDlAdapter):
    def __init__(self) -> None:
        super().__init__(SPEC)
