# API Reference

> **Document Type:** API Documentation<br>
> **Status:** Draft — reconstructed from FastAPI routes<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [SRS](../01-requirements/SRS.md), [HLD](../02-architecture/HLD.md), [API integrations](../02-architecture/api-integration.md), [User guide](./user-guide.md), [Glossary](../glossary.md)

## Overview

Backend uses HTTP JSON and multipart form uploads. In local development the API listens on `127.0.0.1:8000`; in Compose it is reachable from the frontend service as `http://backend:8000`. Browser requests normally use Next.js `/api` proxy, so public/base URL depends on deployment. No version prefix or formal OpenAPI compatibility policy is declared.

## Authentication

For protected `/api/*` paths, send either the configured bearer API token in the HTTP `Authorization` header or a valid password-auth session cookie. Never put credential values in documentation or source control.

`GET /api/health`, all `/api/auth*` paths, `OPTIONS`, and non-API paths bypass auth middleware. `/api/auth/me` checks a session itself. Successful password login sets HTTP-only, SameSite strict cookie; HTTPS requests mark it Secure. Backend default maximum session age is 24 hours and idle timeout 5 minutes; UI separately logs out after 5 minutes without activity. Login defaults to lock after 3 failed attempts for 30 minutes; settings allow bounds. Lockout counter is in process memory. Token/session values must not be committed or pasted into logs/docs. See [secrets and access](./deployment.md#secrets-and-access).

## Endpoint conventions

- JSON models reject unknown fields on selected configuration endpoints. Query/upload limits are configurable where noted.
- Job endpoint serializer hides detailed failure messages as `Job failed`; job stats include cooldown and status counts.
- Album/job data operations and media filesystem deletion are not guaranteed to be a single atomic transaction; avoid retrying destructive actions without checking result.
- Request-validation, application, and HTTP errors are returned as structured error envelopes. Unhandled errors return `500`.
- Middleware adds `X-Request-ID`; it reuses the incoming ID or generates one.
- The examples below show only response shapes confirmed directly in route handlers; unspecified field schemas should be checked in code before integration.

## Authentication and status

| Method / path | Request | Result |
|---|---|---|
| `POST /api/auth/login` | JSON `{ "password": "…" }` | `200` `{ "authenticated": true }` and session cookie; invalid credentials `401`; locked out `429` plus `Retry-After`. |
| `POST /api/auth/logout` | No body | Clears session cookie; `{ "authenticated": false }`. |
| `GET /api/auth/me` | Session cookie | `{ "authenticated": true }` or `401`. |
| `GET /api/health` | Public | `200` `{ "status": "ok" }`. |
| `GET /api/health/ready` | Authenticated | `200` ready or `not_ready` DB status. |
| `GET /api/metrics` | Authenticated | In-process request/status totals, queue depth, job counts and durations. |

## Download jobs

| Method / path | Request / parameters | Result |
|---|---|---|
| `POST /api/jobs` | JSON `{ "url": "https://…" }`; frontend may also send optional `platform`, which backend currently ignores | `{"id": <integer>, "status": "queued"}`; validation errors return `422`. |
| `GET /api/jobs` | `limit` (default 100), `offset` (default 0), optional `status` (`active` matches running/queued; `done` matches done/dup) | Jobs sorted by active/failure/completion priority; limit capped by settings. Failure detail exposed to list is generic `Job failed`. |
| `GET /api/jobs/stats` | None | Job counts/progress, cooldown details, up to five running job summaries. |
| `GET /api/jobs/{job_id}` | Integer path parameter | Job; `404` if absent. |
| `DELETE /api/jobs/{job_id}` | Integer path parameter | `{ "status": "deleted", "id": … }`; `404` if absent. |
| `POST /api/jobs/cancel-all` | None | Purges pending queue IDs, detaches media records from jobs, deletes active queued/running job rows, and returns `{ "status": "cancelled", "purged": … }`. A running worker may already be executing; endpoint does not prove external work was interrupted. |
| `DELETE /api/jobs` | Optional `scope`, default `all`; `finished` deletes done/failed/dup only | Purges queue IDs and detaches media rows from jobs. Returns `{ "status": "cleared", "scope": … }`; other scopes clear all jobs. |

## Media vault

`GET /api/media` accepts optional `platform`, `creator`, `is_favorite`, `media_type`, `q`, `album_id`, `limit`, `offset`, `available_visual`. Limit defaults to 100 and is capped by settings. `media_type` matches stored kinds (for example `image`, `video`, `audio`), not frontend label `photo`. Count/creator routes support shared filters but not pagination or `available_visual`.

| Method / path | Purpose / input | Result |
|---|---|---|
| `GET /api/media` | List/filter/search media | Item list ordered newest-first; normal response omits audio file entries. `available_visual=true` only returns existing image/video files. |
| `GET /api/media/count` | Same filters except `available_visual` | `{ "count": <integer> }`; this metadata count can differ from existing-on-disk visual list. |
| `GET /api/media/creators` | Same filter fields | Aggregates creator username/platform, media/image/video counts, first/last post times, up to four sample image/video thumbnails; audio files are counted in image bucket by current implementation. |
| `GET /api/media/storage` | None | File/disk usage totals; filesystem scan ignores hidden files, value cached in process for 60 seconds. |
| `GET /api/media/files/{file_id}` | File row identifier | Validates resolved path under media root; recognized image/video/audio MIME types inline, other types attachment; unknown/missing file `404`, outside-root `403`. |
| `GET /api/media/thumbnails/{file_id}` | Media-file row identifier | Serves WebP thumbnail; missing thumbnail/file `404`; outside-root `403`; response is private-cacheable. |
| `PATCH /api/media/{item_id}/favorite` | Optional JSON `{ "is_favorite": true }`; omitted value toggles | Updated favorite result; missing item `404`. |
| `DELETE /api/media/{item_id}` | Media item identifier | Attempts DB row/file/thumbnail and empty-directory cleanup; returns `{ "deleted": true, "id": … }`. Missing item currently still returns this shape. |
| `POST /api/media/batch-delete` | JSON `{ "media_ids": [1,2] }` | `{ "deleted_count": … }`; ID count capped by settings. |
| `GET /api/media/export/csv` | Optional `ids`, `album_id`, `username`, `platform`, `is_favorite`, `media_type`, `q`, `limit` (default 500, settings-capped) | CSV metadata attachment. |
| `GET /api/media/export/json` | Same optional filters and limit | JSON metadata attachment. |
| `GET /api/media/export/zip` | Same optional filters and limit | ZIP media + `metadata.json`/`metadata.csv`; selection with no DB items `404`; export-byte cap `413`. Missing physical media files are omitted from archive. |
| `POST /api/media/batch-zip` | JSON `{ "media_ids": [1,2] }` | ZIP for requested IDs, subject to configured item/byte caps; empty ID list returns `400`. |

Export query parameters are defined in [`backend/app/routes/media.py`](../../backend/app/routes/media.py); confirm query/response details there before writing a client.

## Albums

| Method / path | Request | Result |
|---|---|---|
| `GET /api/albums` | None | Album list. |
| `POST /api/albums` | `{ "name": "…", "description": "…", "cover_media_id": 123 }` | Created album and summary; trims name/description; empty name `400`. |
| `GET /api/albums/{album_id}` | Integer path parameter | Album detail; unknown album `404`. |
| `PUT /api/albums/{album_id}` | Optional name/description/cover fields | Updates fields supplied; empty name `400`, missing album `404`. `cover_media_id: null` means “not supplied” and does not clear current cover. |
| `DELETE /api/albums/{album_id}` | Integer path parameter | Deletes album and membership rows; missing album `404`. |
| `POST /api/albums/{album_id}/items` | `{ "media_ids": [1,2] }` | Adds only existing media IDs; duplicate IDs/memberships are skipped; missing album `404`. |
| `DELETE /api/albums/{album_id}/items` | `{ "media_ids": [1,2] }` | Removes matching membership rows; no album-exists check; empty list returns zero removed. |

## Import

Both upload endpoints use multipart field `file` and enforce `max_upload_bytes`.

| Method / path | Accepted input | Result / common errors |
|---|---|---|
| `POST /api/import/json` | `.json`, `.html`, `.htm`, `.txt` archive | Counts/IDs/URLs for imported, duplicate, limit-skipped and invalid links; unsupported/no-valid URL `400`; too large `413`. |
| `POST /api/import/vidara` | UTF-8 `.txt`; one exact Vidara URL per nonblank, non-comment line | Similar import counts; invalid lines/format `400`; byte/line limit `413`. Duplicate lines removed preserving order. |

## Auto-sync and adapters

| Method / path | Request / parameters | Result |
|---|---|---|
| `GET /api/autosync/config` | Optional `platform`, default `instagram` | Configuration, last-run status and counters. |
| `PUT /api/autosync/config` | JSON optional `platform`, `enabled`, `sync_saved`, `interval_minutes` (1–1440); extra fields forbidden | Updated configuration. Current backend forces `sync_liked` off. |
| `POST /api/autosync/trigger` | JSON `{ "platform": "instagram" }` | `{ "sync_result": …, "config": … }`; force-runs configured platform. |
| `GET /api/adapters` | None | Registered adapter/health summary. |

## Settings and Instagram session

| Method / path | Request | Result |
|---|---|---|
| `GET /api/settings` | None | Username, cooldown, engine, and booleans indicating cookie/session file presence; file paths are not serialized. |
| `PUT /api/settings` | `instagram_username` (max 255), `job_cooldown_seconds` (0–3600), `default_engine` (`auto`, `gallery-dl`, `instaloader`); extra fields forbidden | Persists DB-backed settings. |
| `POST /api/settings/instagram/login` | Username/password; optional verification code/challenge ID | Session status/settings; invalid credentials `401`, challenge required `428`, bad/expired challenge `400`. |
| `POST /api/settings/instagram/session` | Multipart `username`, `file` | Uploads session file, subject to service validation and byte limit. |
| `GET /api/settings/instagram/status` | None | Reports configured/connected state and normalized reason. |
| `POST /api/settings/instagram/check` | None | Performs same current session validation and status response. |
| `POST /api/settings/instagram/disconnect` | None | Clears DB session/username, removes configured file, replaces registered adapter. |
| `POST /api/settings/upload/{kind}` | Multipart `file`; current kind `cookies`, `.txt` or `.cookies` Netscape format | Saves randomly named file in config uploads and records path; invalid type/format `400`, empty/oversized file `413`. |

## Console and observability

| Method / path | Request / parameters | Result |
|---|---|---|
| `GET /api/console/events` | Optional source/severity/code/query (query max 200 chars); limit 1–1000, default 100 | `{ "events": [...] }`, newest first. |
| `GET /api/console/stats` | None | Event count/capacity grouped by severity and source. |
| `GET /api/console/sources` | None | Event sources. |
| `GET /api/console/events/{event_id}` | String ID | Event; `404` if absent. |
| `GET /api/console/stream` | Optional source/severity/code/query (query max 200 chars) | Server-sent event stream; keepalive comment every 15 seconds. |

## Limits and changelog

Default configuration includes 10 MiB per upload, 500 imported URLs, 1,000 list items, 500 batch media IDs, 500 export items, and 500 MiB export bytes. Values can be overridden in settings; see [`backend/app/config.py`](../../backend/app/config.py).

| Version | Date | Change |
|---|---|---|
| Unversioned | 2026-10-19 | Endpoint inventory reconstructed from route handlers. |
