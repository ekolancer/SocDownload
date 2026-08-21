from __future__ import annotations

import json
import os
import re
import urllib.request

import yt_dlp

from .base import BaseAdapter, ResolvedMedia
from ..engines import ydl_opts


class TikTokAdapter(BaseAdapter):
    platform = "tiktok"
    engine = "yt-dlp + api-fallback"

    def _normalize_url(self, url: str) -> str:
        url = url.strip()
        # Convert photo slideshow format /photo/ID to /video/ID for yt-dlp compatibility
        url = re.sub(r"/photo/(\d+)", r"/video/\1", url)
        # Strip query parameters that might confuse extractors
        url = url.split("?")[0]
        return url

    def detect(self, url: str) -> bool:
        return bool(re.search(r"(?i)(tiktok\.com)", url))

    def _fetch_tikwm_data(self, url: str) -> dict:
        api_url = f"https://www.tikwm.com/api/?url={url}"
        req = urllib.request.Request(
            api_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("code") != 0:
            raise RuntimeError(f"TikTok API returned: {data.get('msg', 'unknown error')}")
        return data.get("data", {})

    def resolve(self, url: str) -> ResolvedMedia:
        normalized_url = self._normalize_url(url)
        # 1. Try yt-dlp first
        try:
            opts = ydl_opts(skip_download=True)
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(normalized_url, download=False)
            return ResolvedMedia(
                platform=self.platform,
                source_url=url,
                username=info.get("uploader") or info.get("creator") or info.get("channel"),
                caption=info.get("title") or info.get("description"),
                posted_at=str(info.get("upload_date")) if info.get("upload_date") else None,
                hashtags=list(info.get("tags") or []),
            )
        except Exception:
            # 2. Fallback to direct API
            d = self._fetch_tikwm_data(url)
            author = d.get("author", {})
            return ResolvedMedia(
                platform=self.platform,
                source_url=url,
                username=author.get("unique_id") or author.get("nickname"),
                caption=d.get("title"),
                posted_at=str(d.get("create_time")) if d.get("create_time") else None,
                hashtags=[],
            )

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        normalized_url = self._normalize_url(url)

        # 1. Try yt-dlp download (for standard videos)
        try:
            opts = ydl_opts(
                outtmpl=os.path.join(dest_dir, "%(id)s.%(ext)s"),
                noplaylist=True,
                ignoreerrors=False,
            )
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([normalized_url])
            files = [
                os.path.join(dest_dir, f)
                for f in os.listdir(dest_dir)
                if os.path.isfile(os.path.join(dest_dir, f)) and not f.endswith(".mp3")
            ]
            if files:
                return files
        except Exception:
            pass

        # 2. Fallback to direct API (handles photo slideshows, HD videos, and anti-bot)
        d = self._fetch_tikwm_data(url)
        images = d.get("images", [])
        video_url = d.get("play") or d.get("wmplay")
        downloaded: list[str] = []

        if images:
            for idx, img_url in enumerate(images):
                dest_file = os.path.join(dest_dir, f"slide_{idx+1}.jpg")
                urllib.request.urlretrieve(img_url, dest_file)
                downloaded.append(dest_file)
        elif video_url:
            dest_file = os.path.join(dest_dir, f"video_{d.get('id', 'tiktok')}.mp4")
            urllib.request.urlretrieve(video_url, dest_file)
            downloaded.append(dest_file)

        if not downloaded:
            raise RuntimeError("no_files_downloaded")

        return downloaded

    def health(self) -> bool:
        return True
