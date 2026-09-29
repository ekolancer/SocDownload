from __future__ import annotations

from .gallerydl import GalleryDlAdapter, PlatformSpec

SPEC = PlatformSpec(
    platform="x",
    host_pattern=r"(?i)(twitter\.com|x\.com)",
    username_keys=("author", "user", "username", "uploader", "uploader_id"),
)


class XAdapter(GalleryDlAdapter):
    def __init__(self) -> None:
        super().__init__(SPEC)
