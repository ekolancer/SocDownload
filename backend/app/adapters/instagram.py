from __future__ import annotations

import os
import re

import gallery_dl
import instaloader

from .base import BaseAdapter, ResolvedMedia
from ..engines import gdl_options


class InstagramAdapter(BaseAdapter):
    platform = "instagram"

    def __init__(self) -> None:
        self._loader = instaloader.Instaloader()
        self._username: str | None = None

    def detect(self, url: str) -> bool:
        return bool(re.search(r"(?i)(instagram\.com|instagr\.am)", url))

    def _shortcode(self, url: str) -> str:
        m = re.search(r"(?:instagram\.com|instagr\.am)/(?:p|reel|tv)/([A-Za-z0-9_-]+)", url)
        if not m:
            raise ValueError("not an instagram post url")
        return m.group(1)

    def _post(self, url: str) -> instaloader.Post:
        return instaloader.Post.from_shortcode(self._loader.context, self._shortcode(url))

    def _gallery_resolve(self, url: str) -> ResolvedMedia:
        extractor = gallery_dl.extractor.find(url)
        for _item_url, kv in extractor.items():
            author = kv.get("author") or kv.get("user") or kv.get("uploader")
            username = author.get("nick") if isinstance(author, dict) else author
            return ResolvedMedia(
                platform=self.platform,
                source_url=url,
                username=username,
                caption=kv.get("content") or kv.get("description"),
                posted_at=str(kv.get("date")) if kv.get("date") else None,
                hashtags=[],
            )
        raise ValueError("no media found")

    def resolve(self, url: str) -> ResolvedMedia:
        try:
            p = self._post(url)
            return ResolvedMedia(
                platform=self.platform,
                source_url=url,
                username=p.owner_username,
                caption=p.caption,
                posted_at=p.date_utc.isoformat() if p.date_utc else None,
                hashtags=list(p.caption_hashtags) if p.caption_hashtags else [],
            )
        except Exception as instaloader_error:
            try:
                return self._gallery_resolve(url)
            except Exception as gallery_error:
                raise RuntimeError(
                    "Instagram blocked public extraction. Configure COOKIES_FILE or retry later. "
                    f"Instaloader: {instaloader_error}; gallery-dl: {gallery_error}"
                ) from gallery_error

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        try:
            post = self._post(url)
            self._loader.download_post(post, target=dest_dir)
        except Exception as instaloader_error:
            try:
                gallery_dl.job.DownloadJob(url, {"directory": dest_dir, **gdl_options()}).run()
            except Exception as gallery_error:
                raise RuntimeError(
                    "Instagram download blocked. Configure COOKIES_FILE or retry later. "
                    f"Instaloader: {instaloader_error}; gallery-dl: {gallery_error}"
                ) from gallery_error
        return [
            os.path.join(dest_dir, f)
            for f in os.listdir(dest_dir)
            if os.path.isfile(os.path.join(dest_dir, f))
        ]

    def login(self, username: str, password: str) -> None:
        self._loader.login(username, password)
        self._username = username

    def load_session(self, session_file: str, username: str) -> None:
        self._loader.load_session_from_file(username, session_file)
        self._username = username

    def save_session(self, session_file: str) -> None:
        self._loader.save_session_to_file(session_file)

    def list_saved(self) -> list[str]:
        if not self._username:
            return []
        profile = instaloader.Profile.from_username(self._loader.context, self._username)
        return [post.url for post in profile.get_saved_posts()]

    def health(self) -> bool:
        return True
