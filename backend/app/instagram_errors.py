from __future__ import annotations

from .download_errors import (
    DownloadErrorCategory,
    classify_download_error,
    is_retryable,
)

# Backwards-compatible aliases. Retry classification now lives in
# download_errors (single taxonomy); Instagram-specific presentation stays here.
InstagramErrorCategory = DownloadErrorCategory
classify_instagram_error = classify_download_error


def instagram_status(error: BaseException) -> dict[str, object]:
    category = classify_download_error(error)
    text = str(error).lower()
    reason = error.__class__.__name__.lower()
    if text.strip() in {category.value, f"instagram_{category.value}"}:
        reason = f"adapter_status_{category.value}"
    if "401" in text:
        reason = "instagram_graphql_401"
    elif "429" in text:
        reason = "instagram_http_429"
    elif "please wait" in text:
        reason = "instagram_cooldown_message"
    messages = {
        DownloadErrorCategory.RATE_LIMITED: "Instagram meminta cooldown; session belum dapat diverifikasi.",
        DownloadErrorCategory.CHALLENGE_REQUIRED: "Instagram meminta verifikasi tambahan.",
        DownloadErrorCategory.SESSION_EXPIRED: "Session Instagram tidak valid atau sudah kedaluwarsa.",
        DownloadErrorCategory.INVALID_SESSION: "File session tidak valid atau tidak dapat dibaca.",
        DownloadErrorCategory.USERNAME_MISMATCH: "Username session berbeda dari username yang dikonfigurasi.",
        DownloadErrorCategory.NETWORK_ERROR: "Instagram tidak dapat dijangkau karena masalah jaringan.",
        DownloadErrorCategory.INVALID_CREDENTIALS: "Username atau password Instagram tidak valid.",
        DownloadErrorCategory.NOT_CONFIGURED: "Session Instagram belum dikonfigurasi.",
    }
    return {
        "status": category.value,
        "reason": reason,
        "message": messages.get(category, "Instagram request gagal."),
        "retryable": is_retryable(category),
    }


def instagram_error(error: BaseException) -> RuntimeError:
    category = classify_download_error(error)
    return RuntimeError(f"instagram_{category.value}")
