from __future__ import annotations

import os
import re

import yt_dlp

from .base import BaseAdapter, ResolvedMedia


class YouTubeAdapter(BaseAdapter):
    platform = "youtube"
    engine = "yt-dlp"

    def detect(self, url: str) -> bool:
        return bool(re.search(r"(?i)(youtube\.com|youtu\.be)", url))

    def resolve(self, url: str) -> ResolvedMedia:
        opts = {"quiet": True, "skip_download": True}
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
        return ResolvedMedia(
            platform=self.platform,
            source_url=url,
            username=info.get("channel") or info.get("uploader"),
            caption=info.get("title") or info.get("description"),
            posted_at=info.get("upload_date"),
            hashtags=[],
        )

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        opts = {
            "quiet": True,
            "outtmpl": os.path.join(dest_dir, "%(title)s [%(id)s].%(ext)s"),
            "noplaylist": True,
            "writesubtitles": False,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
        return [
            os.path.join(dest_dir, f)
            for f in os.listdir(dest_dir)
            if os.path.isfile(os.path.join(dest_dir, f))
        ]

    def health(self) -> bool:
        return True
