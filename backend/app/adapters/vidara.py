from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit
from collections.abc import Callable

import httpx

from ..config import get_settings
from ..url_validation import validate_public_url, validate_url
from ..video import normalize
from .base import BaseAdapter, ResolvedMedia

# How long a stream payload stays valid for reuse between resolve and download.
STREAM_CACHE_TTL_SECONDS = 300


class VidaraAdapter(BaseAdapter):
    platform = "vidara"
    engine = "httpx + yt-dlp fallback"
    page_pattern = re.compile(r"^https://vidara\.to/v/([A-Za-z0-9_-]+)$")
    iframe_pattern = re.compile(r"<iframe\b[^>]*?\bsrc\s*=\s*[\"']([^\"']+)[\"'][^>]*>", re.I)

    # Keys in the stream API payload that signal licensed/DRM playback. Matched
    # against payload keys only, never against the media URL: a hostname such as
    # "drm-cdn.example.com" is legitimate and must not be treated as DRM.
    _DRM_KEYS = frozenset({"drm", "drm_data", "license_url", "license", "widevine", "fairplay", "playready", "clearkey"})

    def __init__(self) -> None:
        # The registry shares one instance across worker threads, so the cache
        # is guarded by a lock. Keyed by URL; value is (fetched_at, payload).
        self._cache: dict[str, tuple[float, dict[str, object]]] = {}
        self._cache_lock = threading.Lock()

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
        if self._is_drm_payload(data):
            raise RuntimeError("Vidara DRM stream unsupported")
        data["streaming_url"] = validate_public_url(stream_url)
        return data

    @classmethod
    def _is_drm_payload(cls, data: dict[str, object]) -> bool:
        """Detect licensed DRM from payload fields, not from the stream URL."""
        for key, value in data.items():
            if key.lower() in cls._DRM_KEYS and value:
                return True
        return False

    def resolve(self, url: str) -> ResolvedMedia:
        return self.resolve_from_data(url, self.resolve_data(url))

    def resolve_from_data(self, url: str, data: dict[str, object]) -> ResolvedMedia:
        return ResolvedMedia(platform=self.platform, source_url=url, caption=data.get("title") if isinstance(data.get("title"), str) else None)

    def resolve_data(self, url: str) -> dict[str, object]:
        normalized = validate_url(url)
        cached = self._cache_get(normalized)
        if cached is not None:
            return cached

        last_error: Exception | None = None
        for attempt in range(2):
            try:
                data = self._stream_data(normalized)
                self._cache_put(normalized, data)
                return data
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                last_error = exc
                if attempt == 0:
                    time.sleep(1)
        assert last_error is not None
        raise last_error

    def _cache_get(self, url: str) -> dict[str, object] | None:
        with self._cache_lock:
            entry = self._cache.get(url)
        if entry is None:
            return None
        fetched_at, data = entry
        if time.monotonic() - fetched_at > STREAM_CACHE_TTL_SECONDS:
            with self._cache_lock:
                self._cache.pop(url, None)
            return None
        return data

    def _cache_put(self, url: str, data: dict[str, object]) -> None:
        with self._cache_lock:
            self._cache[url] = (time.monotonic(), data)

    def _cache_drop(self, url: str) -> None:
        with self._cache_lock:
            self._cache.pop(url, None)

    def _download_http(self, stream_url: str, dest_file: str, on_progress: Callable[[int, int | None, float | None, int | None], None] | None = None) -> None:
        cap = get_settings().vidara_max_download_bytes
        total = 0
        started = __import__("time").monotonic()
        with httpx.stream("GET", validate_public_url(stream_url), follow_redirects=True, timeout=30, headers={"User-Agent": "MediaVault"}) as response:
            total_bytes = int(response.headers.get("content-length", "0")) or None
            validate_public_url(str(response.url))
            response.raise_for_status()
            with open(dest_file, "wb") as output:
                for chunk in response.iter_bytes(65536):
                    total += len(chunk)
                    if total > cap:
                        raise RuntimeError("Vidara download exceeds configured byte cap")
                    output.write(chunk)
                    if on_progress:
                        elapsed = max(__import__("time").monotonic() - started, 0.001)
                        speed = total / elapsed
                        eta = int((total_bytes - total) / speed) if total_bytes and speed > 0 else None
                        on_progress(total, total_bytes, speed, eta)

    def download(self, url: str, dest_dir: str, on_progress: Callable[[int, int | None, float | None, int | None], None] | None = None, resolved_data: dict[str, object] | None = None) -> list[str]:
        os.makedirs(dest_dir, exist_ok=True)
        normalized = validate_url(url)
        # Reuse the payload from a prior resolve via the internal cache; only
        # fetch when neither the caller nor the cache has it.
        data = resolved_data or self._cache_get(normalized) or self.resolve_data(normalized)
        stream_url = str(data["streaming_url"])
        filecode = self.page_pattern.fullmatch(normalized).group(1)
        if ".m3u8" in urlsplit(stream_url).path.lower():
            yt_dlp = shutil.which("yt-dlp")
            if not yt_dlp:
                raise RuntimeError("Vidara HLS requires installed yt-dlp")
            validate_public_url(stream_url)
            result = subprocess.run([yt_dlp, "--no-playlist", "--max-filesize", str(get_settings().vidara_max_download_bytes), "-o", str(Path(dest_dir) / f"{filecode}.%(ext)s"), stream_url], check=False)
            if result.returncode:
                raise RuntimeError("Vidara HLS download failed")
            downloaded = next((path for path in Path(dest_dir).iterdir() if path.is_file()), None)
            if downloaded:
                normalize(downloaded)
        else:
            self._download_http(stream_url, str(Path(dest_dir) / f"{filecode}.mp4"), on_progress)
        files = [str(path) for path in Path(dest_dir).iterdir() if path.is_file()]
        if not files:
            raise RuntimeError("no_files_downloaded")
        self._cache_drop(normalized)
        return files
