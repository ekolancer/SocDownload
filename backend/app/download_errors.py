from __future__ import annotations

from enum import StrEnum


class DownloadErrorCategory(StrEnum):
    """Single taxonomy for download/retry classification across all platforms.

    Replaces the former Instagram-only ``InstagramErrorCategory`` and the
    message-matching ``errors.classify_download_error``. Retry behaviour is a
    property of the category, not of which code path observed the failure.
    See docs/adr/0001-download-error-taxonomy.md.
    """

    RATE_LIMITED = "rate_limited"
    CHALLENGE_REQUIRED = "challenge_required"
    SESSION_EXPIRED = "session_expired"
    NETWORK_ERROR = "network_error"
    INVALID_CREDENTIALS = "invalid_credentials"
    DOWNLOAD_FAILURE = "download_failure"
    UNSUPPORTED_MEDIA = "unsupported_media"
    STORAGE_ERROR = "storage_error"
    INVALID_URL = "invalid_url"
    UNKNOWN_ERROR = "unknown_error"
    INVALID_SESSION = "invalid_session"
    USERNAME_MISMATCH = "username_mismatch"
    NOT_CONFIGURED = "not_configured"


RETRYABLE_CATEGORIES = frozenset(
    {
        DownloadErrorCategory.RATE_LIMITED,
        DownloadErrorCategory.NETWORK_ERROR,
    }
)


def is_retryable(category: DownloadErrorCategory) -> bool:
    return category in RETRYABLE_CATEGORIES


def classify_download_error(error: BaseException) -> DownloadErrorCategory:
    """Map any download failure to a single category.

    Order matters: specific signals (DRM, auth, host resolution) are tested
    before the generic "download"/"network" rules.
    """
    text = str(error).lower()

    # Already a category value (optionally prefixed "instagram_").
    if text.strip() in {category.value for category in DownloadErrorCategory}:
        return DownloadErrorCategory(text.strip())
    if "instagram_" in text:
        value = text.split("instagram_", 1)[1].split()[0].strip(".:,;)")
        try:
            return DownloadErrorCategory(value)
        except ValueError:
            pass

    if "no_files_downloaded" in text or "no files" in text or "no media" in text:
        return DownloadErrorCategory.DOWNLOAD_FAILURE
    if any(value in text for value in ("drm", "widevine", "fairplay", "playready", "clearkey")):
        return DownloadErrorCategory.DOWNLOAD_FAILURE
    if any(value in text for value in ("429", "rate limit", "too many requests", "please wait")):
        return DownloadErrorCategory.RATE_LIMITED
    if any(value in text for value in ("checkpoint", "challenge", "feedback")):
        return DownloadErrorCategory.CHALLENGE_REQUIRED
    if any(value in text for value in ("could not be resolved", "name resolution", "failed to resolve", "getaddrinfo")):
        return DownloadErrorCategory.NETWORK_ERROR
    if any(value in text for value in ("401", "login_required", "session expired", "not logged in", "session")):
        return DownloadErrorCategory.SESSION_EXPIRED
    if any(value in text for value in ("bad credentials", "invalid credentials", "badcredentials", "unauthorized", "forbidden", "authentication")):
        return DownloadErrorCategory.INVALID_CREDENTIALS
    if any(value in text for value in ("unsupported", "format")):
        return DownloadErrorCategory.UNSUPPORTED_MEDIA
    if any(value in text for value in ("no space", "disk full", "storage")):
        return DownloadErrorCategory.STORAGE_ERROR
    if any(value in text for value in ("extractor", "download")):
        return DownloadErrorCategory.DOWNLOAD_FAILURE
    if any(value in text for value in ("timeout", "timed out", "network", "dns", "name or service not known", "connection")):
        return DownloadErrorCategory.NETWORK_ERROR
    return DownloadErrorCategory.UNKNOWN_ERROR
