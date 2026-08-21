from __future__ import annotations

import os
import re
import urllib.request
import html as html_lib
import instaloader

from .base import BaseAdapter, ResolvedMedia
from ..engines import gdl_download, gdl_first_item


class InstagramAdapter(BaseAdapter):
    platform = "instagram"

    def __init__(self) -> None:
        self._loader = instaloader.Instaloader(
            max_connection_attempts=1,
            fatal_status_codes=[401, 403, 429],
        )
        self._username: str | None = None

    def detect(self, url: str) -> bool:
        return bool(re.search(r"(?i)(instagram\.com|instagr\.am)", url))

    def _shortcode(self, url: str) -> str:
        m = re.search(r"(?:instagram\.com|instagr\.am)/(?:p|reel|tv|reels)/([A-Za-z0-9_-]+)", url)
        if not m:
            raise ValueError("not an instagram post url")
        return m.group(1)

    def _post(self, url: str) -> instaloader.Post:
        return instaloader.Post.from_shortcode(self._loader.context, self._shortcode(url))

    def _extract_username_from_url(self, url: str) -> str | None:
        m = re.search(r"instagram\.com/([^/?#]+)/(?:p|reel|tv|reels)/", url)
        if m and m.group(1).lower() not in ("p", "reel", "tv", "reels", "stories", "share", "direct", "explore"):
            return m.group(1)
        return None

    def _gallery_resolve(self, url: str) -> ResolvedMedia:
        kv = gdl_first_item(url)
        username = (
            kv.get("username")
            or kv.get("owner_username")
            or kv.get("fullname")
            or kv.get("uploader_id")
            or kv.get("uploader")
        )
        if not username:
            user = kv.get("user") or kv.get("author") or kv.get("owner")
            if isinstance(user, dict):
                username = (
                    user.get("username")
                    or user.get("name")
                    or user.get("nick")
                    or user.get("full_name")
                )
            elif isinstance(user, str):
                username = user

        if not username:
            username = self._extract_username_from_url(url)

        caption = kv.get("description") or kv.get("content") or kv.get("caption") or ""
        posted_at = str(kv.get("date")) if kv.get("date") else None
        tags = kv.get("tags") or kv.get("hashtags") or []

        return ResolvedMedia(
            platform=self.platform,
            source_url=url,
            username=username,
            caption=caption,
            posted_at=posted_at,
            hashtags=tags if isinstance(tags, list) else [],
        )

    @staticmethod
    def _is_rate_limited(error: Exception) -> bool:
        text = str(error).lower()
        return "401 unauthorized" in text or "please wait a few minutes" in text

    def resolve(self, url: str) -> ResolvedMedia:
        try:
            return self._gallery_resolve(url)
        except Exception as gallery_error:
            try:
                p = self._post(url)
                username = p.owner_username or (p.owner_profile.username if p.owner_profile else None)
                if not username:
                    username = self._extract_username_from_url(url)

                return ResolvedMedia(
                    platform=self.platform,
                    source_url=url,
                    username=username,
                    caption=p.caption,
                    posted_at=p.date_utc.isoformat() if p.date_utc else None,
                    hashtags=list(p.caption_hashtags) if p.caption_hashtags else [],
                )
            except Exception as instaloader_error:
                # If both failed, attempt OpenGraph extraction before throwing
                url_user = self._extract_username_from_url(url)
                if url_user:
                    return ResolvedMedia(
                        platform=self.platform,
                        source_url=url,
                        username=url_user,
                        caption="",
                        posted_at=None,
                        hashtags=[],
                    )
                raise self._error(instaloader_error, gallery_error) from gallery_error

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        try:
            return gdl_download(url, dest_dir)
        except Exception as gallery_error:
            try:
                post = self._post(url)
                self._loader.download_post(post, target=dest_dir)
                return [
                    os.path.join(dest_dir, f)
                    for f in os.listdir(dest_dir)
                    if os.path.isfile(os.path.join(dest_dir, f))
                ]
            except Exception as instaloader_error:
                raise self._error(instaloader_error, gallery_error) from gallery_error

    def _error(self, instaloader_error: Exception, gallery_error: Exception) -> RuntimeError:
        if self._is_rate_limited(instaloader_error):
            prefix = "instagram_rate_limited"
        else:
            prefix = "instagram_cookies_required"
        return RuntimeError(
            f"{prefix}: Configure COOKIES_FILE with valid Netscape cookies or retry later. "
            f"gallery-dl: {gallery_error}; instaloader: {instaloader_error}"
        )

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
