# API Integration

> **Document Type:** API Integration<br>
> **Status:** Draft — source code is authoritative<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [HLD](./HLD.md), [LLD](./LLD.md), [API reference](../03-technical/api.md), [Deployment](../03-technical/deployment.md), [Glossary](../glossary.md)

## Internal integration

| From | To | Protocol | Purpose |
|---|---|---|---|
| Next.js UI | FastAPI | HTTP JSON / file upload / event stream | UI calls `/api/*`; Next rewrite forwards to `BACKEND_INTERNAL_URL`. |
| FastAPI routes | Services and stores | In-process Python calls | Validate request, query SQLite, enqueue jobs, manage library and settings. |
| Job service | Worker | `asyncio.Queue[int]` inside backend process | Deliver job identifiers to two workers; jobs are separately persisted in SQLite. |
| Worker | SQLAlchemy / SQLite | Local DB connection | Claim jobs and store metadata/status/progress. |
| Worker | Media root | Local filesystem | Temporary downloads, organized files, sidecar metadata and thumbnails. |
| Scheduler | Job/autosync services | In-process APScheduler callbacks | Dispatch due retries and periodic adapter health / Instagram saved-item sync. |
| Console UI | FastAPI console API | HTTP JSON and server-sent events (SSE) | Read filtered events and follow event stream. |

The queue, scheduler and metrics live in the API process; no separate broker, cache or metrics server is configured.

## Platform integrations

Platform presence and registered adapters derive from `backend/app/main.py` and `backend/app/adapters/`. A registered adapter does not guarantee every URL or private resource is retrievable.

| Platform / feature | Observed implementation | Boundary / limitation |
|---|---|---|
| Instagram | `instaloader` login/session and adapter; `gallery-dl` fallback; session validation and saved-item retrieval. | Session required for some operations; saved sync registered. Credentials and cookies belong in local secret/config storage. |
| Threads | Native HTTP-oriented adapter. | Depends on upstream site/network behavior. |
| TikTok | Normalizes `/photo/{id}` URL for extractor; tries `yt-dlp` for metadata/download, then `www.tikwm.com` fallback. Fallback can write image slideshow files or `play`/`wmplay` video URL. | TikWM is an external metadata dependency; direct media helper enforces public URL check. No service-level guarantee declared. |
| YouTube | `yt-dlp`. | Depends on extractor and upstream support. |
| X | Shared `GalleryDlAdapter`; hosts include Twitter/X domains; creator metadata keys include author/user/username/uploader. | Depends on engine and upstream behavior. |
| Reddit | Shared `GalleryDlAdapter`; hosts include Reddit and `redd.it`; creator metadata keys include author/user/username/uploader. | Depends on engine and upstream behavior. |
| Pinterest | Shared `GalleryDlAdapter`; hosts include Pinterest and `pin.it`; creator name may fall back to URL. | Depends on engine and upstream behavior. |
| Vidara | Fetches page iframe, POSTs file code/device to `https://kitchenstories.ink/api/stream`, validates stream URL and selected DRM payload fields; caches resolution for 300 seconds; HTTP stream or `yt-dlp` HLS fallback. | Retries timeout/network resolution once after one second. Direct byte stream has configured cap and 64 KiB progress chunks; HLS command uses max-file size. Behavior depends on third-party service. |
| Facebook | Adapter source exists. | Registration is commented out during application startup; not advertised as enabled support. |

Optional engines are declared in `pyproject.toml` extra `engines`: `yt-dlp`, `gallery-dl`, and pinned `instaloader`. Backend container installs that extra and FFmpeg. Specific engine selection and health are exposed through settings/adapter APIs where implemented.

## Instagram saved-post sync

```mermaid
sequenceDiagram
    participant UI as Studio / scheduler
    participant API as FastAPI
    participant Sync as Auto-sync service
    participant Adapter as Instagram adapter
    participant DB as SQLite
    participant Jobs as Job service
    UI->>API: Configure or trigger sync
    API->>Sync: run_autosync(platform, force)
    Sync->>DB: Read enabled flag and interval
    Sync->>Adapter: Validate session; list saved URLs
    Adapter-->>Sync: Saved URLs
    Sync->>Jobs: Bulk enqueue unique URLs
    Sync->>DB: Save result, timestamps and counters
    API-->>UI: Sync result/configuration
```

Scheduled sync checks every minute and respects configured interval. Adapter request lists up to 100 saved URLs per run; bulk enqueue considers at most 500. Manual trigger forces execution. Current settings update explicitly sets `sync_liked=False`; only `list_saved()` is used in this flow. See [UC-004](../01-requirements/use-cases.md#uc-004-sync-saved-instagram-posts).

## Authentication and data handling

- UI uses API path proxy; backend middleware accepts bearer API token or valid password-derived session cookie.
- Password-auth login and health are exceptions to route middleware; CORS allows the configured local frontend origin.
- Compose mounts `/run/secrets` read-only and persists data, media, and config via bind mounts.
- Adapter/network request timeouts, retry/backoff policy per platform, official API guarantees, rate-limit budgets, content licensing, and production egress rules are **[TBD — confirm with team]**.

See [deployment guide](../03-technical/deployment.md#secrets-and-access) for configuration names. Endpoint-by-endpoint contracts live in [API reference](../03-technical/api.md).
