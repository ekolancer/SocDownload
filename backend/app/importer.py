from __future__ import annotations

import json
import re
from typing import List

from .config import get_settings

# Comprehensive regex pattern matching any supported social media post URL
SOCIAL_URL_REGEX = re.compile(
    r'https?://(?:www\.)?(?:'
    r'instagram\.com/(?:p|reel|reels|tv)/[A-Za-z0-9_-]+|'
    r'tiktok\.com/@[A-Za-z0-9_.-]+/video/\d+|'
    r'(?:vm|vt)\.tiktok\.com/[A-Za-z0-9_-]+|'
    r'tiktok\.com/t/[A-Za-z0-9_-]+|'
    r'threads\.(?:net|com)/@[A-Za-z0-9_.-]+/post/[A-Za-z0-9_-]+|'
    r'(?:twitter\.com|x\.com)/[A-Za-z0-9_]+/status/\d+|'
    r'youtube\.com/(?:watch\?v=[A-Za-z0-9_-]+|shorts/[A-Za-z0-9_-]+)|'
    r'youtu\.be/[A-Za-z0-9_-]+|'
    r'pinterest\.com/pin/\d+|pin\.it/[A-Za-z0-9_-]+|'
    r'reddit\.com/r/[A-Za-z0-9_]+/comments/[A-Za-z0-9_]+'
    r')',
    re.IGNORECASE,
)


def extract_urls_from_text(text: str) -> List[str]:
    """Extract all supported social media URLs from arbitrary text or HTML."""
    matches = SOCIAL_URL_REGEX.findall(text)
    # Deduplicate while preserving order
    seen = set()
    result = []
    for url in matches:
        # Clean trailing slashes or formatting
        cleaned = url.rstrip('/)>,;"\'')
        if cleaned not in seen:
            seen.add(cleaned)
            result.append(cleaned)
    return result


def parse_archive_json(data: dict | list) -> List[str]:
    """Parse Instagram, X, or TikTok archive JSON data and return a list of URLs."""
    urls: set[str] = set()

    def extract_urls(obj, depth=0):
        if depth > get_settings().parser_depth_limit or len(urls) >= get_settings().parser_url_limit:
            return
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str):
                    found = extract_urls_from_text(v)
                    for u in found:
                        urls.add(u)
                else:
                    extract_urls(v, depth + 1)
        elif isinstance(obj, list):
            for item in obj:
                extract_urls(item, depth + 1)
                if len(urls) >= get_settings().parser_url_limit:
                    break

    extract_urls(data)
    return list(urls)


def parse_archive_file(content_bytes: bytes, filename: str) -> List[str]:
    """Parse archive file (JSON, HTML, or TXT) and return extracted social media URLs."""
    text = content_bytes.decode('utf-8', errors='replace')
    lower_filename = filename.lower()

    if lower_filename.endswith('.json'):
        try:
            data = json.loads(text)
            urls = parse_archive_json(data)
            if urls:
                return urls
        except Exception:
            pass

    # Fallback or for HTML/TXT: parse raw text with regex
    return extract_urls_from_text(text)
