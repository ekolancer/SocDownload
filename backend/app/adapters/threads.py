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
        with opener.open(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="ignore")

    def _clean_url(self, raw_u: str) -> str:
        return (
            raw_u.replace(r"\/", "/")
            .replace(r"\u0026", "&")
            .replace("&amp;", "&")
            .strip()
        )

    def _extract_media_from_post_object(self, post: dict) -> tuple[list[str], list[str]]:
        """Extract media URLs with highest quality strictly from a single post object."""
        images: list[str] = []
        videos: list[str] = []

        # 1. Carousel Media (multi-photo / multi-video slide post)
        if "carousel_media" in post and isinstance(post["carousel_media"], list):
            for item in post["carousel_media"]:
                if not isinstance(item, dict):
                    continue
                if item.get("video_versions"):
                    best_vid = max(
                        item["video_versions"],
                        key=lambda v: v.get("width", 0) * v.get("height", 0),
                    )
                    if best_vid.get("url"):
                        videos.append(self._clean_url(best_vid["url"]))
                elif item.get("image_versions2") and isinstance(item["image_versions2"], dict):
                    candidates = item["image_versions2"].get("candidates", [])
                    if candidates:
                        best_img = max(
                            candidates,
                            key=lambda c: c.get("width", 0) * c.get("height", 0),
                        )
                        if best_img.get("url"):
                            images.append(self._clean_url(best_img["url"]))
            return images, videos

        # 2. Single Video Post
        if post.get("video_versions") and isinstance(post["video_versions"], list):
            best_vid = max(
                post["video_versions"],
                key=lambda v: v.get("width", 0) * v.get("height", 0),
            )
            if best_vid.get("url"):
                videos.append(self._clean_url(best_vid["url"]))
                return images, videos

        # 3. Single Image Post
        if post.get("image_versions2") and isinstance(post["image_versions2"], dict):
            candidates = post["image_versions2"].get("candidates", [])
            if candidates:
                best_img = max(
                    candidates,
                    key=lambda c: c.get("width", 0) * c.get("height", 0),
                )
                if best_img.get("url"):
                    images.append(self._clean_url(best_img["url"]))

        return images, videos

    def _find_target_post(self, obj: any, target_shortcode: str | None) -> dict | None:
        """Locate the target post object matching target_shortcode or root thread_item."""
        target_post: dict | None = None

        # Strategy 1: Match post object with exact shortcode/code
        if target_shortcode:
            def search_by_code(node: any) -> None:
                nonlocal target_post
                if target_post is not None:
                    return
                if isinstance(node, dict):
                    if node.get("code") == target_shortcode:
                        target_post = node
                        return
                    for k, v in node.items():
                        # Do not traverse into replies or suggestions when searching
                        if k not in ("reply_threads", "replies", "sub_threads", "suggested_threads"):
                            search_by_code(v)
                elif isinstance(node, list):
                    for item in node:
                        search_by_code(item)

            search_by_code(obj)
            if target_post is not None:
                return target_post

        # Strategy 2: Root thread_items[0] of the primary edge
        def search_root_thread(node: any) -> None:
            nonlocal target_post
            if target_post is not None:
                return
            if isinstance(node, dict):
                if "thread_items" in node and isinstance(node["thread_items"], list) and len(node["thread_items"]) > 0:
                    first_item = node["thread_items"][0]
                    if isinstance(first_item, dict) and "post" in first_item and isinstance(first_item["post"], dict):
                        target_post = first_item["post"]
                        return
                for k, v in node.items():
                    if k not in ("reply_threads", "replies", "sub_threads", "suggested_threads"):
                        search_root_thread(v)
            elif isinstance(node, list):
                for item in node:
                    search_root_thread(item)

        search_root_thread(obj)
        return target_post

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

        # 2. Extract Title / Caption from OpenGraph and HTML meta
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

        # 3. Extract Author from HTML / Title if not found in URL
        if not username:
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

        # 4. Structured JSON extraction for target post only
        target_post: dict | None = None
        script_matches = re.findall(
            r'<script\s+type="application/json"[^>]*>(.*?)</script>', html, re.DOTALL
        )
        for s in script_matches:
            try:
                data = json.loads(s)
                found = self._find_target_post(data, shortcode)
                if found:
                    target_post = found
                    break
            except Exception:
                continue

        final_images: list[str] = []
        final_videos: list[str] = []

        if target_post:
            # Extract author username if available on post node
            if not username and isinstance(target_post.get("user"), dict):
                p_user = target_post["user"].get("username")
                if p_user:
                    username = str(p_user).strip("@")

            # Extract caption from post node if available
            if isinstance(target_post.get("caption"), dict):
                p_caption = target_post["caption"].get("text")
                if p_caption:
                    caption = str(p_caption)

            raw_imgs, raw_vids = self._extract_media_from_post_object(target_post)
            # Deduplicate media URLs
            seen_imgs = set()
            for u in raw_imgs:
                if u not in seen_imgs:
                    seen_imgs.add(u)
                    final_images.append(u)

            seen_vids = set()
            for u in raw_vids:
                if u not in seen_vids:
                    seen_vids.add(u)
                    final_videos.append(u)

        # 5. OpenGraph Fallback (strictly for featured single media of target post)
        if not final_images and not final_videos:
            og_vid = re.search(r'<meta\s+property="og:video(?::secure_url)?"\s+content="([^"]+)"', html)
            if og_vid:
                final_videos.append(self._clean_url(html_lib.unescape(og_vid.group(1))))

            og_img = re.search(r'<meta\s+property="og:image(?::secure_url)?"\s+content="([^"]+)"', html)
            if og_img:
                img_candidate = self._clean_url(html_lib.unescape(og_img.group(1)))
                # Ignore generic meta placeholder or small static assets
                if "rsrc.php" not in img_candidate:
                    final_images.append(img_candidate)

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

            # Download Images (Target post media only)
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

            # Download Videos (Target post video only)
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
