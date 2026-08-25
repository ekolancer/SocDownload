from __future__ import annotations

import html as html_lib
import http.cookiejar
import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime

from .base import BaseAdapter, ResolvedMedia
from ..db import now_wib
from ..engines import _cookies, gdl_download, gdl_first_item


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
        with opener.open(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="ignore")

    def _clean_url(self, raw_u: str) -> str:
        return (
            raw_u.replace(r"\/", "/")
            .replace(r"\u0026", "&")
            .replace("&amp;", "&")
            .strip()
        )

    def _extract_from_json_tree(
        self, obj: any, images: list[str], videos: list[str], usernames: list[str]
    ) -> None:
        """Recursively walk JSON data to find post author and media with highest resolution."""
        if isinstance(obj, dict):
            # Check user/author
            if "user" in obj and isinstance(obj["user"], dict) and obj["user"].get("username"):
                usernames.append(str(obj["user"]["username"]).strip("@"))
            elif "owner" in obj and isinstance(obj["owner"], dict) and obj["owner"].get("username"):
                usernames.append(str(obj["owner"]["username"]).strip("@"))
            elif "author" in obj and isinstance(obj["author"], dict) and obj["author"].get("username"):
                usernames.append(str(obj["author"]["username"]).strip("@"))

            # Check for carousel media (multi-photo/video post)
            if "carousel_media" in obj and isinstance(obj["carousel_media"], list):
                for item in obj["carousel_media"]:
                    if isinstance(item, dict):
                        if "video_versions" in item and item["video_versions"]:
                            best_vid = max(
                                item["video_versions"],
                                key=lambda v: v.get("width", 0) * v.get("height", 0),
                            )
                            if best_vid.get("url"):
                                videos.append(self._clean_url(best_vid["url"]))
                        elif "image_versions2" in item and isinstance(item["image_versions2"], dict):
                            candidates = item["image_versions2"].get("candidates", [])
                            if candidates:
                                best_img = max(
                                    candidates,
                                    key=lambda c: c.get("width", 0) * c.get("height", 0),
                                )
                                if best_img.get("url"):
                                    images.append(self._clean_url(best_img["url"]))
                return

            # Check for single post image / video
            if "video_versions" in obj and obj["video_versions"]:
                best_vid = max(
                    obj["video_versions"],
                    key=lambda v: v.get("width", 0) * v.get("height", 0),
                )
                if best_vid.get("url"):
                    videos.append(self._clean_url(best_vid["url"]))
            elif "image_versions2" in obj and isinstance(obj["image_versions2"], dict):
                candidates = obj["image_versions2"].get("candidates", [])
                if candidates:
                    best_img = max(
                        candidates,
                        key=lambda c: c.get("width", 0) * c.get("height", 0),
                    )
                    if best_img.get("url"):
                        images.append(self._clean_url(best_img["url"]))

            for k, v in obj.items():
                if k not in ("carousel_media", "video_versions", "image_versions2"):
                    self._extract_from_json_tree(v, images, videos, usernames)
        elif isinstance(obj, list):
            for item in obj:
                self._extract_from_json_tree(item, images, videos, usernames)

    def _parse_meta(self, url: str, html: str) -> dict:
        # 1. Try URL extraction for username & shortcode
        username: str | None = None
        shortcode: str = "post"

        url_user_match = re.search(r"threads\.(?:net|com)/@([^/?#]+)", url)
        if url_user_match:
            username = url_user_match.group(1).strip()

        sc_match = re.search(r"threads\.(?:net|com)/(?:@[^/]+/post|t)/([^/?#]+)", url)
        if sc_match:
            shortcode = sc_match.group(1).strip()

        # 2. Extract Title / Caption
        caption = ""
        desc_match = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', html) or re.search(
            r'<meta\s+property="og:description"\s+content="([^"]+)"', html
        )
        if desc_match:
            caption = html_lib.unescape(desc_match.group(1))

        page_title = ""
        title_match = re.search(r"<title>([^<]+)</title>", html)
        if title_match:
            page_title = html_lib.unescape(title_match.group(1))
            if not caption:
                caption = page_title

        # 3. Extract Author from HTML / Title / Meta tags if not yet found
        if not username:
            # Pattern: Name (@username) on Threads or @username on Threads
            user_title_match = re.search(r"\(@([A-Za-z0-9_.]+)\)", page_title) or re.search(
                r"@([A-Za-z0-9_.]+)\s*(?:on Threads|:)", page_title
            )
            if user_title_match:
                username = user_title_match.group(1)

        if not username:
            og_title_match = re.search(r'<meta\s+property="og:title"\s+content="([^"]+)"', html)
            if og_title_match:
                t_content = html_lib.unescape(og_title_match.group(1))
                u_m = re.search(r"\(@([A-Za-z0-9_.]+)\)", t_content) or re.search(
                    r"@([A-Za-z0-9_.]+)", t_content
                )
                if u_m:
                    username = u_m.group(1)

        # 4. Attempt structured JSON parsing
        json_images: list[str] = []
        json_videos: list[str] = []
        json_usernames: list[str] = []

        script_matches = re.findall(
            r'<script\s+type="application/json"[^>]*>(.*?)</script>', html, re.DOTALL
        )
        for s in script_matches:
            try:
                data = json.loads(s)
                self._extract_from_json_tree(data, json_images, json_videos, json_usernames)
            except Exception:
                continue

        if not username and json_usernames:
            username = json_usernames[0]

        # 5. Media deduplication
        final_images: list[str] = []
        final_videos: list[str] = []

        if json_images or json_videos:
            seen_imgs = set()
            for u in json_images:
                if u not in seen_imgs:
                    seen_imgs.add(u)
                    final_images.append(u)

            seen_vids = set()
            for u in json_videos:
                if u not in seen_vids:
                    seen_vids.add(u)
                    final_videos.append(u)

        # Fallback to OpenGraph & Smart Filter if JSON had no media
        if not final_images and not final_videos:
            og_vid = re.search(r'<meta\s+property="og:video(?::secure_url)?"\s+content="([^"]+)"', html)
            if og_vid:
                final_videos.append(self._clean_url(html_lib.unescape(og_vid.group(1))))

            og_img = re.search(r'<meta\s+property="og:image(?::secure_url)?"\s+content="([^"]+)"', html)
            if og_img:
                final_images.append(self._clean_url(html_lib.unescape(og_img.group(1))))

            if not final_images and not final_videos:
                media_groups: dict[str, tuple[int, str]] = {}

                for m in re.finditer(r'(https:[^"\'\s<>\\]+(?:fbcdn\.net|cdninstagram\.com)[^"\'\s<>\\]*)', html):
                    raw_u = self._clean_url(m.group(1))

                    if (
                        "rsrc.php" in raw_u
                        or "s150x150" in raw_u
                        or "s320x320" in raw_u
                        or "150x150" in raw_u
                        or "profile_pic" in raw_u
                    ):
                        continue

                    low_u = raw_u.lower()
                    if any(ext in low_u for ext in [".mp4", ".m4v", ".webm"]):
                        final_videos.append(raw_u)
                    elif any(ext in low_u for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                        path_part = raw_u.split("?")[0]
                        filename = path_part.split("/")[-1]
                        id_match = re.search(r"(\d+_\d+_\d+)", filename)
                        group_key = id_match.group(1) if id_match else filename

                        dim_match = re.search(r"[sp](\d+)x(\d+)", raw_u)
                        score = (
                            int(dim_match.group(1)) * int(dim_match.group(2))
                            if dim_match
                            else 99999999
                        )

                        if group_key not in media_groups or score > media_groups[group_key][0]:
                            media_groups[group_key] = (score, raw_u)

                for _, (_, best_url) in media_groups.items():
                    final_images.append(best_url)

        return {
            "username": username or "threads_user",
            "shortcode": shortcode,
            "caption": caption,
            "images": final_images,
            "videos": final_videos,
        }

    def resolve(self, url: str) -> ResolvedMedia:
        try:
            html = self._fetch_html(url)
            meta = self._parse_meta(url, html)
            username = meta.get("username")
            if not username or username == "threads_user":
                m = re.search(r"@([A-Za-z0-9_.]+)", url)
                if m:
                    username = m.group(1)

            return ResolvedMedia(
                platform=self.platform,
                source_url=url,
                username=username,
                caption=meta.get("caption") or "",
                posted_at=now_wib().isoformat(),
                hashtags=[],
            )
        except Exception:
            match = re.search(r"@([A-Za-z0-9_.]+)", url)
            username = match.group(1) if match else None
            return ResolvedMedia(
                platform=self.platform,
                source_url=url,
                username=username,
                caption=f"Threads post {url}",
                posted_at=now_wib().isoformat(),
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

            # Download Images (Highest resolution only)
            for idx, img_url in enumerate(meta["images"]):
                ext = "jpg"
                if ".png" in img_url:
                    ext = "png"
                elif ".webp" in img_url:
                    ext = "webp"
                dest_file = os.path.join(dest_dir, f"{shortcode}_{idx+1}.{ext}")
                req_img = urllib.request.Request(
                    img_url,
                    headers={
                        "User-Agent": (
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/128.0.0.0 Safari/537.36"
                        )
                    },
                )
                try:
                    with opener.open(req_img, timeout=25) as r, open(dest_file, "wb") as f:
                        f.write(r.read())
                    downloaded_files.append(dest_file)
                except Exception:
                    pass

            # Download Videos (Highest bitrate only)
            for idx, vid_url in enumerate(meta["videos"]):
                dest_file = os.path.join(dest_dir, f"{shortcode}_vid_{idx+1}.mp4")
                req_vid = urllib.request.Request(
                    vid_url,
                    headers={
                        "User-Agent": (
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/128.0.0.0 Safari/537.36"
                        )
                    },
                )
                try:
                    with opener.open(req_vid, timeout=35) as r, open(dest_file, "wb") as f:
                        f.write(r.read())
                    downloaded_files.append(dest_file)
                except Exception:
                    pass

            # If text-only post
            if not downloaded_files:
                dest_file = os.path.join(dest_dir, f"{shortcode}_thread.txt")
                with open(dest_file, "w", encoding="utf-8") as f:
                    f.write(
                        f"Platform: Threads\n"
                        f"Author: @{meta.get('username', 'unknown')}\n"
                        f"Source URL: {url}\n\n"
                        f"Content:\n{meta.get('caption', '')}\n"
                    )
                downloaded_files.append(dest_file)

            return downloaded_files
        except Exception as e:
            raise RuntimeError(f"Threads download failed: {e}") from e

    def health(self) -> bool:
        return True
