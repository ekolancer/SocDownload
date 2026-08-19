from __future__ import annotations

import json
from typing import List


def parse_archive_json(data: dict | list) -> List[str]:
    """Parse Instagram, X, or TikTok archive JSON data and return a list of URLs."""
    urls: set[str] = set()

    def extract_urls(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str):
                    if "instagram.com/p/" in v or "instagram.com/reel/" in v:
                        urls.add(v)
                    elif "twitter.com/" in v or "x.com/" in v:
                        urls.add(v)
                    elif "tiktok.com/" in v:
                        urls.add(v)
                else:
                    extract_urls(v)
        elif isinstance(obj, list):
            for item in obj:
                extract_urls(item)

    extract_urls(data)
    return list(urls)
