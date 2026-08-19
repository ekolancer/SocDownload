from __future__ import annotations

import functools
import time


DEFAULT_RATE_LIMIT = {
    "instagram": {"min_interval": 30, "max_retries": 3},
    "x": {"min_interval": 15, "max_retries": 3},
    "threads": {"min_interval": 30, "max_retries": 3},
    "youtube": {"min_interval": 60, "max_retries": 3},
    "reddit": {"min_interval": 2, "max_retries": 3},
    "pinterest": {"min_interval": 10, "max_retries": 3},
    "facebook": {"min_interval": 30, "max_retries": 3},
    "tiktok": {"min_interval": 15, "max_retries": 3},
}


def rate_limit(platform: str):
    cfg = DEFAULT_RATE_LIMIT.get(platform, {"min_interval": 10, "max_retries": 3})

    def decorator(fn):
        last_call = {"at": 0.0}

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            elapsed = time.monotonic() - last_call["at"]
            wait = cfg["min_interval"] - elapsed
            if wait > 0:
                time.sleep(wait)
            last_call["at"] = time.monotonic()
            last_err = None
            for _ in range(cfg["max_retries"]):
                try:
                    return fn(*args, **kwargs)
                except Exception as exc:  # noqa: BLE001
                    last_err = exc
                    time.sleep(cfg["min_interval"])
            raise last_err

        return wrapper

    return decorator
