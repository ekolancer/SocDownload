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
    INVALID_SESSION = "invalid_session"
    USERNAME_MISMATCH = "username_mismatch"
    NOT_CONFIGURED = "not_configured"


def classify_instagram_error(error: BaseException) -> InstagramErrorCategory:
    text = str(error).lower()
    if text.strip() in {category.value for category in InstagramErrorCategory}:
        return InstagramErrorCategory(text.strip())
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


def instagram_status(error: BaseException) -> dict[str, object]:
    category = classify_instagram_error(error)
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
        InstagramErrorCategory.RATE_LIMITED: "Instagram meminta cooldown; session belum dapat diverifikasi.",
        InstagramErrorCategory.CHALLENGE_REQUIRED: "Instagram meminta verifikasi tambahan.",
        InstagramErrorCategory.SESSION_EXPIRED: "Session Instagram tidak valid atau sudah kedaluwarsa.",
        InstagramErrorCategory.INVALID_SESSION: "File session tidak valid atau tidak dapat dibaca.",
        InstagramErrorCategory.USERNAME_MISMATCH: "Username session berbeda dari username yang dikonfigurasi.",
        InstagramErrorCategory.NETWORK_ERROR: "Instagram tidak dapat dijangkau karena masalah jaringan.",
        InstagramErrorCategory.INVALID_CREDENTIALS: "Username atau password Instagram tidak valid.",
        InstagramErrorCategory.NOT_CONFIGURED: "Session Instagram belum dikonfigurasi.",
    }
    return {"status": category.value, "reason": reason, "message": messages.get(category, "Instagram request gagal."), "retryable": category in {InstagramErrorCategory.RATE_LIMITED, InstagramErrorCategory.NETWORK_ERROR}}


def instagram_error(error: BaseException) -> RuntimeError:
    category = classify_instagram_error(error)
    return RuntimeError(f"instagram_{category.value}")
