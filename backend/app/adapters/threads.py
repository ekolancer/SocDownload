from __future__ import annotations

import html as html_lib
import http.cookiejar
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime

from .base import BaseAdapter, ResolvedMedia
from ..engines import _cookies


class ThreadsAdapter(BaseAdapter):
    platform = "threads"
    engine = "threads-native"

    def detect(self, url: str) -> bool:
        return bool(re.search(r"(?i)(threads\.net|threads\.com)", url))

    def _get_opener(self) -> urllib.request.OpenerDirector:
        cookies_path = _cookies()
        if cookies_path and os.path.isfile(cookies_path):
            cj = http.cookiejar.MozillaCookieJar(cookies_path)
            try:
                cj.load(ignore_discard=True, ignore_expires=True)
                return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
            except Exception:
                pass
        return urllib.request.build_opener()

    def _fetch_html(self, url: str) -> str:
        opener = self._get_opener()
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/128.0.0.0 Safari/537.36"
                ),
                "Accept": (
                    "text/html,application/xhtml+xml,application/xml;q=0.9,"
                    "image/avif,image/webp,image/apng,*/*;q=0.8"
                ),
                "Accept-Language": "en-US,en;q=0.9",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Upgrade-Insecure-Requests": "1",
            },
        )
        with opener.open(req, timeout=18) as resp:
            return resp.read().decode("utf-8", errors="ignore")

    def _parse_meta(self, url: str, html: str) -> dict:
        # Extract username & shortcode
        match = re.search(r"threads\.(?:net|com)/@([^/]+)/post/([^/?#]+)", url)
        username = match.group(1) if match else "threads_user"
        shortcode = match.group(2) if match else "post"

        # Caption / Title extraction
        caption = ""
        desc_match = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', html) or re.search(
            r'<meta\s+property="og:description"\s+content="([^"]+)"', html
        )
        if desc_match:
            caption = html_lib.unescape(desc_match.group(1))

        if not caption:
            title_match = re.search(r"<title>([^<]+)</title>", html)
            if title_match:
                caption = html_lib.unescape(title_match.group(1))

        # Media URLs extraction across entire HTML & JSON payloads
        img_urls: set[str] = set()
        vid_urls: set[str] = set()

        for m in re.finditer(r'(https:[^"\'\s<>\\]+(?:fbcdn\.net|cdninstagram\.com)[^"\'\s<>\\]*)', html):
            raw_u = (
                m.group(1)
                .replace(r"\/", "/")
                .replace(r"\u0026", "&")
                .replace("&amp;", "&")
            )
            # Filter out UI static icons and small thumbnails
            if "rsrc.php" in raw_u or "s150x150" in raw_u or "s320x320" in raw_u:
                continue

            low_u = raw_u.lower()
            if any(ext in low_u for ext in [".mp4", ".m4v", ".webm"]):
                vid_urls.add(raw_u)
            elif any(ext in low_u for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                img_urls.add(raw_u)

        return {
            "username": username,
            "shortcode": shortcode,
            "caption": caption,
            "images": list(img_urls),
            "videos": list(vid_urls),
        }

    def resolve(self, url: str) -> ResolvedMedia:
        try:
            html = self._fetch_html(url)
            meta = self._parse_meta(url, html)
            return ResolvedMedia(
                platform=self.platform,
                source_url=url,
                username=meta["username"],
                caption=meta["caption"],
                posted_at=datetime.utcnow().isoformat(),
                hashtags=[],
            )
        except Exception:
            match = re.search(r"threads\.(?:net|com)/@([^/]+)", url)
            username = match.group(1) if match else "threads_user"
            return ResolvedMedia(
                platform=self.platform,
                source_url=url,
                username=username,
                caption=f"Threads post by @{username}",
                posted_at=datetime.utcnow().isoformat(),
                hashtags=[],
            )

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        try:
            html = self._fetch_html(url)
            meta = self._parse_meta(url, html)
            opener = self._get_opener()

            downloaded_files: list[str] = []
            shortcode = meta["shortcode"]

            # Download Images
            for idx, img_url in enumerate(meta["images"]):
                ext = "jpg"
                if ".png" in img_url:
                    ext = "png"
                elif ".webp" in img_url:
                    ext = "webp"
                dest_file = os.path.join(dest_dir, f"{shortcode}_{idx+1}.{ext}")
                req_img = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
                try:
                    with opener.open(req_img, timeout=20) as r, open(dest_file, "wb") as f:
                        f.write(r.read())
                    downloaded_files.append(dest_file)
                except Exception:
                    pass

            # Download Videos
            for idx, vid_url in enumerate(meta["videos"]):
                dest_file = os.path.join(dest_dir, f"{shortcode}_vid_{idx+1}.mp4")
                req_vid = urllib.request.Request(vid_url, headers={"User-Agent": "Mozilla/5.0"})
                try:
                    with opener.open(req_vid, timeout=35) as r, open(dest_file, "wb") as f:
                        f.write(r.read())
                    downloaded_files.append(dest_file)
                except Exception:
                    pass

            # If no media attached (e.g. text-only thread post)
            if not downloaded_files:
                dest_file = os.path.join(dest_dir, f"{shortcode}_thread.txt")
                with open(dest_file, "w", encoding="utf-8") as f:
                    f.write(
                        f"Platform: Threads\n"
                        f"Author: @{meta['username']}\n"
                        f"Source URL: {url}\n\n"
                        f"Content:\n{meta['caption']}\n"
                    )
                downloaded_files.append(dest_file)

            return downloaded_files
        except Exception as e:
            raise RuntimeError(f"Threads download failed: {e}") from e

    def health(self) -> bool:
        return True
