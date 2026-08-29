from __future__ import annotations

from enum import StrEnum


class InstagramErrorCategory(StrEnum):
    RATE_LIMITED = "rate_limited"
    CHALLENGE_REQUIRED = "challenge_required"
    SESSION_EXPIRED = "session_expired"
    NETWORK_ERROR = "network_error"
    INVALID_CREDENTIALS = "invalid_credentials"
    DOWNLOAD_FAILURE = "download_failure"
    UNKNOWN_ERROR = "unknown_error"


def classify_instagram_error(error: BaseException) -> InstagramErrorCategory:
    text = str(error).lower()
    if "instagram_" in text:
        value = text.split("instagram_", 1)[1].split()[0].strip(".:,;)")
        try:
            return InstagramErrorCategory(value)
        except ValueError:
            pass
    if any(value in text for value in ("429", "rate limit", "please wait")):
        return InstagramErrorCategory.RATE_LIMITED
    if any(value in text for value in ("checkpoint", "challenge", "feedback")):
        return InstagramErrorCategory.CHALLENGE_REQUIRED
    if any(value in text for value in ("401", "login_required", "session expired", "not logged in")):
        return InstagramErrorCategory.SESSION_EXPIRED
    if any(value in text for value in ("bad credentials", "invalid credentials", "badcredentials")):
        return InstagramErrorCategory.INVALID_CREDENTIALS
    if any(value in text for value in ("download", "no files", "no media", "extractor")):
        return InstagramErrorCategory.DOWNLOAD_FAILURE
    if any(value in text for value in ("timeout", "network", "dns", "name or service not known", "connection")):
        return InstagramErrorCategory.NETWORK_ERROR
    return InstagramErrorCategory.UNKNOWN_ERROR


def instagram_error(error: BaseException) -> RuntimeError:
    category = classify_instagram_error(error)
    return RuntimeError(f"instagram_{category.value}")
