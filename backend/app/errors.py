from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException


@dataclass(frozen=True)
class ErrorInfo:
    code: str
    severity: str
    status: int
    retryable: bool
    user_message: str
    operator_message: str
    remediation: str


ERRORS = {
    "invalid_request": ErrorInfo("invalid_request", "warning", 422, False, "Request is invalid.", "Request validation failed.", "Correct request fields and retry."),
    "unauthorized": ErrorInfo("unauthorized", "warning", 401, False, "Authentication required.", "Request authentication failed.", "Provide a valid session or bearer token."),
    "forbidden": ErrorInfo("forbidden", "warning", 403, False, "Access denied.", "Request is not authorized for this operation.", "Verify account permissions."),
    "not_found": ErrorInfo("not_found", "info", 404, False, "Resource not found.", "Requested resource does not exist.", "Verify resource identifier."),
    "conflict": ErrorInfo("conflict", "warning", 409, False, "Request conflicts with current state.", "State conflict prevented the operation.", "Refresh state and retry."),
    "rate_limited": ErrorInfo("rate_limited", "warning", 429, True, "Too many requests.", "Request rate limit exceeded.", "Wait before retrying."),
    "service_unavailable": ErrorInfo("service_unavailable", "error", 503, True, "Service is temporarily unavailable.", "A required service is unavailable.", "Check service health and retry."),
    "internal_error": ErrorInfo("internal_error", "critical", 500, False, "An unexpected error occurred.", "Unhandled application exception.", "Inspect console event and server logs."),
}


class AppError(Exception):
    def __init__(self, code: str, *, operator_message: str | None = None, context: dict[str, Any] | None = None) -> None:
        self.info = ERRORS.get(code, ERRORS["internal_error"])
        self.operator_message = operator_message or self.info.operator_message
        self.context = context or {}
        super().__init__(self.operator_message)


def map_exception(exc: BaseException) -> ErrorInfo:
    if isinstance(exc, AppError):
        return exc.info
    if isinstance(exc, HTTPException):
        code = {
            401: "unauthorized",
            403: "forbidden",
            404: "not_found",
            409: "conflict",
            422: "invalid_request",
            429: "rate_limited",
            503: "service_unavailable",
        }.get(exc.status_code)
        if code:
            return ERRORS[code]
        if 400 <= exc.status_code < 500:
            return ErrorInfo("request_error", "warning", exc.status_code, False, "Request could not be completed.", str(exc.detail), "Correct request and retry.")
    return ERRORS["internal_error"]


def error_envelope(exc: BaseException, request_id: str = "-") -> dict[str, Any]:
    info = map_exception(exc)
    operator_message = exc.operator_message if isinstance(exc, AppError) else info.operator_message
    detail = exc.detail if isinstance(exc, HTTPException) else info.user_message
    return {"detail": detail, "error": {"code": info.code, "severity": info.severity, "status": info.status, "retryable": info.retryable, "message": info.user_message, "operator_message": operator_message, "remediation": info.remediation, "request_id": request_id}}
