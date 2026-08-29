from __future__ import annotations

import os
import re
import urllib.request
import html as html_lib
import instaloader

from .base import BaseAdapter, ResolvedMedia
from ..instagram_errors import classify_instagram_error, instagram_error
from ..engines import gdl_download, gdl_first_item


class InstagramAdapter(BaseAdapter):
    platform = "instagram"

    def __init__(self) -> None:
        self._loader = instaloader.Instaloader(
            max_connection_attempts=1,
            fatal_status_codes=[401, 403, 429],
        )
        self._username: str | None = None

    def _engine(self) -> str:
        try:
            from ..db import AppSettings, get_session_factory
            with get_session_factory()() as session:
                item = session.get(AppSettings, 1)
                return item.default_engine if item and item.default_engine in {"auto", "gallery-dl", "instaloader"} else "auto"
        except Exception:
            return "auto"

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

    def _instaloader_resolve(self, url: str) -> ResolvedMedia:
        p = self._post(url)
        username = p.owner_username or (p.owner_profile.username if p.owner_profile else None) or self._extract_username_from_url(url)
        return ResolvedMedia(
            platform=self.platform,
            source_url=url,
            username=username,
            caption=p.caption,
            posted_at=p.date_utc.isoformat() if p.date_utc else None,
            hashtags=list(p.caption_hashtags) if p.caption_hashtags else [],
        )

    def resolve(self, url: str) -> ResolvedMedia:
        engine = self._engine()
        if engine == "instaloader":
            return self._instaloader_resolve(url)
        try:
            return self._gallery_resolve(url)
        except Exception as gallery_error:
            try:
                return self._instaloader_resolve(url)
            except Exception as instaloader_error:
                url_user = self._extract_username_from_url(url)
                if url_user:
                    return ResolvedMedia(self.platform, url, url_user, "", None, [])
                raise self._error(instaloader_error, gallery_error) from gallery_error

    def _instaloader_download(self, url: str, dest_dir: str) -> list[str]:
        post = self._post(url)
        self._loader.download_post(post, target=dest_dir)
        return [
            os.path.join(dest_dir, name)
            for name in os.listdir(dest_dir)
            if os.path.isfile(os.path.join(dest_dir, name))
        ]

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        engine = self._engine()
        if engine == "instaloader":
            return self._instaloader_download(url, dest_dir)
        try:
            return gdl_download(url, dest_dir)
        except Exception as gallery_error:
            try:
                return self._instaloader_download(url, dest_dir)
            except Exception as instaloader_error:
                raise self._error(instaloader_error, gallery_error) from gallery_error

    def _error(self, instaloader_error: Exception, gallery_error: Exception) -> RuntimeError:
        return instagram_error(instaloader_error)

    def login(self, username: str, password: str) -> None:
        self._loader.login(username, password)
        self._username = username

    def load_session(self, session_file: str, username: str) -> None:
        self._loader.load_session_from_file(username, session_file)
        self._username = username

    def save_session(self, session_file: str) -> None:
        self._loader.save_session_to_file(session_file)

    def two_factor_login(self, code: str) -> None:
        self._loader.two_factor_login(code)

    def check_session_valid(self) -> tuple[bool, str | None]:
        """Check whether the active session cookie or instaloader session is valid."""
        from ..engines import _cookies
        cookie_path = _cookies()

        # If username is set in instaloader
        if self._username:
            try:
                logged_in_user = self._loader.test_login()
                if logged_in_user and logged_in_user.lower() == self._username.lower():
                    return True, None
                return False, "session_expired"
            except Exception as e:
                return False, classify_instagram_error(e).value

        # If cookies file is available
        if cookie_path and os.path.isfile(cookie_path):
            return True, None

        return False, "no_session_configured"

    def list_saved(self, limit: int = 200) -> list[str]:
        """Fetch list of saved post URLs."""
        urls: list[str] = []
        seen: set[str] = set()

        # 1. Try instaloader if session is loaded
        if self._username:
            try:
                profile = instaloader.Profile.from_username(self._loader.context, self._username)
                for post in profile.get_saved_posts():
                    shortcode = getattr(post, "shortcode", None)
                    url = f"https://www.instagram.com/p/{shortcode}/" if shortcode else getattr(post, "url", None)
                    if url and url not in seen:
                        seen.add(url)
                        urls.append(url)
                    if len(urls) >= limit:
                        return urls
            except Exception as e:
                raise instagram_error(e) from e

        # 2. Use gallery-dl with cookies (InstagramSavedExtractor)
        from ..engines import gdl_config
        import gallery_dl
        from gallery_dl.extractor.message import Message

        target_url = f"https://www.instagram.com/{self._username or 'me'}/saved/all-posts/"
        try:
            with gdl_config():
                extractor = gallery_dl.extractor.find(target_url)
                if extractor:
                    for msg in extractor:
                        if msg[0] == Message.Url:
                            metadata = msg[2]
                            post_url = metadata.get("post_url")
                            shortcode = metadata.get("post_shortcode") or metadata.get("shortcode")
                            url = post_url or (f"https://www.instagram.com/p/{shortcode}/" if shortcode else None)
                            if url and url not in seen:
                                seen.add(url)
                                urls.append(url)
                        if len(urls) >= limit:
                            break
        except Exception as e:
            category = classify_instagram_error(e)
            if category.value in {"session_expired", "challenge_required", "rate_limited", "network_error", "invalid_credentials"}:
                raise instagram_error(e) from e

        return urls

    def list_liked(self, limit: int = 200) -> list[str]:
        """Fetch list of liked post URLs (Use Archive Import to ingest liked posts safely)."""
        return []


    def health(self) -> bool:
        return True



