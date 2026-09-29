# ADR-0001: One download error taxonomy

> Status: Accepted
> Date: 2026-09-29
> Related: [CONTEXT.md](../../CONTEXT.md#named-modules-target-architecture), [LLD](../02-architecture/LLD.md)

## Context

Two classifiers map download failures to categories:

- `backend/app/errors.py::classify_download_error` — platform-agnostic, matches on message text.
- `backend/app/instagram_errors.py::classify_instagram_error` — Instagram-scoped, returns
  `InstagramErrorCategory`.

`worker._set_status` calls the Instagram classifier on every failed job regardless of platform,
while `service._sync_process_job` catches and calls the generic one. The two disagree: a Vidara
DRM failure taken through the Instagram path must be special-cased to avoid matching the generic
"download" rule (see `tests/test_worker_retry.py`). Retry decisions therefore depend on which
path the failure travelled.

## Decision

Adopt **one** download-error taxonomy for retry classification.

- Rename `InstagramErrorCategory` to `DownloadErrorCategory`. Its members are already generic
  (`NETWORK_ERROR`, `RATE_LIMITED`, `SESSION_EXPIRED`, `DOWNLOAD_FAILURE`, …).
- `classify_download_error` in `errors.py` is removed. The surviving classifier feeds
  `DownloadJob`.
- `instagram_errors.instagram_status` (user-facing Instagram messages and session status) stays,
  consuming the shared enum. It is a presentation concern, not a retry concern.

## Consequences

- Retry behaviour is a property of the failure category, not of which code path observed it.
- `DownloadJob` (ADR-0002 partner work) owns the single retry decision.
- The DRM-before-generic-download ordering guard collapses into the enum's single classifier.
- Instagram-specific operator messages remain, sourced from `instagram_errors`.

## Alternatives considered

- **Keep both classifiers, cross-reference.** Rejected: two taxonomies drift; the retry seam stays
  shallow.
- **Parameterise per platform.** Rejected as premature: no platform needs a different category
  set today.
