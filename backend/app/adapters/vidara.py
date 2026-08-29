from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

import httpx

from ..config import get_settings
from ..url_validation import validate_public_url, validate_url
from .base import BaseAdapter, ResolvedMedia


class VidaraAdapter(BaseAdapter):
    platform = "vidara"
    engine = "httpx + yt-dlp fallback"
    page_pattern = re.compile(r"^https://vidara\.to/v/([A-Za-z0-9_-]+)$")
    iframe_pattern = re.compile(r"<iframe[^>]+src=[\"'](https://kitchenstories\.ink/e/[A-Za-z0-9_-]+)[\"']", re.I)

    def detect(self, url: str) -> bool:
        return self.page_pattern.fullmatch(url.strip()) is not None

    def _page_url(self, url: str) -> tuple[str, str]:
        normalized = validate_url(url)
        match = self.page_pattern.fullmatch(normalized)
        if not match:
            raise ValueError("invalid Vidara URL")
        return normalized, match.group(1)

    def _request(self, method: str, url: str, **kwargs: object) -> httpx.Response:
        validate_public_url(url)
        with httpx.Client(follow_redirects=True, timeout=20, cookies={}) as client:
            headers = {"User-Agent": "MediaVault", **dict(kwargs.pop("headers", {}))}
            response = client.request(method, url, headers=headers, **kwargs)
            validate_public_url(str(response.url))
            response.raise_for_status()
            return response

    def _stream_data(self, url: str) -> dict[str, object]:
        page_url, filecode = self._page_url(url)
        page = self._request("GET", page_url)
        iframe_match = self.iframe_pattern.search(page.text)
        if not iframe_match:
            raise RuntimeError("Vidara embed not found")
        embed_url = validate_public_url(iframe_match.group(1))
        response = self._request("POST", "https://kitchenstories.ink/api/stream", json={"filecode": filecode, "device": "web"}, headers={"Referer": embed_url})
        try:
            data = response.json()
        except json.JSONDecodeError as exc:
            raise RuntimeError("Vidara stream response is not JSON") from exc
        if not isinstance(data, dict):
            raise RuntimeError("Vidara stream response is invalid")
        stream_url = data.get("streaming_url")
        if not isinstance(stream_url, str) or not stream_url:
            raise RuntimeError("Vidara stream unavailable")
        if any(token in stream_url.lower() for token in ("drm", "widevine", "fairplay", "playready")):
            raise RuntimeError("Vidara DRM stream unsupported")
        data["streaming_url"] = validate_public_url(stream_url)
        return data

    def resolve(self, url: str) -> ResolvedMedia:
        data = self._stream_data(url)
        return ResolvedMedia(platform=self.platform, source_url=url, caption=data.get("title") if isinstance(data.get("title"), str) else None)

    def _download_http(self, stream_url: str, dest_file: str) -> None:
        cap = get_settings().vidara_max_download_bytes
        total = 0
        with httpx.stream("GET", validate_public_url(stream_url), follow_redirects=True, timeout=30, headers={"User-Agent": "MediaVault"}) as response:
            validate_public_url(str(response.url))
            response.raise_for_status()
            with open(dest_file, "wb") as output:
                for chunk in response.iter_bytes(65536):
                    total += len(chunk)
                    if total > cap:
                        raise RuntimeError("Vidara download exceeds configured byte cap")
                    output.write(chunk)

    def download(self, url: str, dest_dir: str) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        data = self._stream_data(url)
        stream_url = str(data["streaming_url"])
        filecode = self.page_pattern.fullmatch(validate_url(url)).group(1)
        if ".m3u8" in urlsplit(stream_url).path.lower():
            yt_dlp = shutil.which("yt-dlp")
            if not yt_dlp:
                raise RuntimeError("Vidara HLS requires installed yt-dlp")
            validate_public_url(stream_url)
            result = subprocess.run([yt_dlp, "--no-playlist", "--max-filesize", str(get_settings().vidara_max_download_bytes), "-o", str(Path(dest_dir) / f"{filecode}.%(ext)s"), stream_url], check=False)
            if result.returncode:
                raise RuntimeError("Vidara HLS download failed")
        else:
            self._download_http(stream_url, str(Path(dest_dir) / f"{filecode}.mp4"))
        files = [str(path) for path in Path(dest_dir).iterdir() if path.is_file()]
        if not files:
            raise RuntimeError("no_files_downloaded")
        return files
