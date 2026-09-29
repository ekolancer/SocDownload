from __future__ import annotations

from .gallerydl import GalleryDlAdapter, PlatformSpec

SPEC = PlatformSpec(
    platform="pinterest",
    host_pattern=r"(?i)(pinterest\.com|pin\.it)",
    username_keys=("pinner", "native_creator", "creator", "owner", "user", "username", "uploader"),
    url_username_pattern=r"pinterest\.com/([^/?#]+)/pin/",
)


class PinterestAdapter(GalleryDlAdapter):
    def __init__(self) -> None:
        super().__init__(SPEC)
