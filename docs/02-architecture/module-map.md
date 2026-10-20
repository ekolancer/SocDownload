# Peta Modul dan Source Tree

> **Document Type:** Module Map
> **Status:** Draft — file/function map taken from tracked project tree
> **Owner:** [TBD — confirm with team]
> **Last Updated:** 2026-10-19
> **Related Documents:** [HLD](./HLD.md), [LLD](./LLD.md), [API Integration](./api-integration.md), [Testing Guide](../03-technical/testing.md), [Glossary](../glossary.md)

## 1. Struktur project

| Area | Modul / lokasi | Peran |
|---|---|---|
| API entrypoint | `backend/app/main.py` | Membuat FastAPI app, auth/error/request-ID middleware, mendaftarkan routers, menginisialisasi runtime. |
| HTTP endpoints | `backend/app/routes/` | Router untuk auth, jobs, media, albums, importer, autosync, settings, adapters, console, public liveness health. Readiness and metrics are defined in `observability.py` and mounted as router from `main.py`. |
| Download orchestration | `backend/app/service.py`, `worker.py`, `jobs.py`, `job_service.py`, `scheduler.py` | In-process queue, worker loop, job claim/download/retry, listing/cancellation, dispatch periodik. |
| Platform boundary | `backend/app/adapters/` | `BaseAdapter`, `AdapterRegistry`, implementasi per platform dan adapter bersama `gallery-dl`. |
| URL and engine helpers | `url_validation.py`, `engines.py`, `downloader.py`, `video.py` | URL validation/DNS checks, cookie-aware engine config, file hashing/organization, FFmpeg/FFprobe operations. |
| Persistence | `backend/app/db.py`, `settings_store.py` | SQLAlchemy models, SQLite setup/migrations, app settings. |
| Media catalog | `media_vault.py`, `media_exporter.py`, `albums.py` | Query/filter, serialization, favorites, deletion, creator aggregation, CSV/JSON/ZIP, album operations. |
| Instagram account | `instagram_session.py`, `instagram_challenges.py`, `instagram_errors.py` | Session upload/status/disconnect, two-factor challenge lifecycle, user-facing error normalization. |
| Security/config | `config.py`, `vault.py`, `settings_upload.py`, `auth.py`, `ratelimit.py` | Environment/file settings, Fernet utility, cookies upload, password/session auth, optional rate-limit decorator. |
| Observability | `observability.py`, `matrixconsole.py`, `routes/console.py` | Health/readiness, in-process metrics, redacted bounded events, JSON file logging and SSE stream. |
| Frontend pages | `frontend/src/app/` | Studio `/`, Login `/login`, Settings `/settings`, Vault `/vault`, Console `/console`; media proxy routes. |
| Frontend components | `frontend/src/components/` | Layout/navigation; job/download and auto-sync studio; import/album/lightbox/adapter modals; media gallery, creator hub, batch actions. |
| Frontend shared code | `frontend/src/lib/`, `hooks/` | Auth-aware fetch, types, shared vault API, pagination, layout state, keyboard shortcuts, creator archive polling. |
| Configuration/runtime | `pyproject.toml`, `frontend/package.json`, `Dockerfile.*`, `docker-compose.yml`, `run-local.sh`, `caddy/Caddyfile` | Dependencies, build/test scripts, container and local launch, optional local proxy. |
| Tests | `backend/tests/`, `tests/`, frontend Vitest files | Python behavior/resource bounds and UI/client/hook tests; inventory: [Testing Guide](../03-technical/testing.md). |

## 2. Source inventory

Peta di bawah mencakup file Python/TypeScript/CSS, route, config, skrip operasi, dan test yang terlacak Git saat dokumentasi dibuat. File `.env`, secrets, session, database, media, build output, `node_modules`, dan cache lokal sengaja tidak dibaca atau dicantumkan.

**Backend aplikasi:**

- `backend/app/`: `__init__.py`, `albums.py`, `autosync.py`, `config.py`, `db.py`, `download_errors.py`, `downloader.py`, `engines.py`, `errors.py`, `importer.py`, `instagram_challenges.py`, `instagram_errors.py`, `instagram_session.py`, `job_service.py`, `jobs.py`, `main.py`, `matrixconsole.py`, `media_exporter.py`, `media_vault.py`, `observability.py`, `ratelimit.py`, `scheduler.py`, `service.py`, `settings_store.py`, `settings_upload.py`, `url_validation.py`, `vault.py`, `video.py`, `worker.py`.
- `backend/app/adapters/`: `__init__.py`, `base.py`, `facebook.py`, `gallerydl.py`, `instagram.py`, `pinterest.py`, `reddit.py`, `registry.py`, `threads.py`, `tiktok.py`, `vidara.py`, `x.py`, `youtube.py`.
- `backend/app/routes/`: `__init__.py`, `adapters.py`, `albums.py`, `auth.py`, `autosync.py`, `console.py`, `health.py`, `importer.py`, `jobs.py`, `media.py`, `settings.py`.
- Entrypoints: `backend/cli.py`, `backend/init_db.py`.

**Frontend terlacak di `frontend/src/`:**

- `app/`: `console/page.tsx`, `globals.css`, `layout.tsx`, `login/page.tsx`, `media-file/[id]/route.ts`, `media-thumbnail/[id]/route.ts`, `page.tsx`, `settings/page.tsx`, `settings/settings.css`, `vault/page.tsx`, `vault/vault.css`.
- `components/layout/`: `DashboardHeader.tsx`, `DashboardShell.tsx`, `DashboardSidebar.tsx`, `Navbar.tsx`.
- `components/modals/`: `AdapterHealthDrawer.tsx`, `AlbumModal.tsx`, `ArchiveImportModal.tsx`, `CommandPalette.tsx`, `MediaLightboxModal.tsx`.
- `components/studio/`: `AutoSyncCard.tsx`, `DownloadStudio.tsx`, `JobNotificationToast.tsx`, `JobPipeline.tsx`.
- `components/ui/`: `Icons.tsx`.
- `components/vault/`: `BatchActionBar.tsx`, `CreatorsHub.tsx`, `GooglePhotosSidebar.tsx`, `GooglePhotosTopBar.tsx`, `MediaGallery.tsx`, `VaultSidebar.tsx`.
- `hooks/`: `useCreatorArchive.ts`.
- `lib/`: `api.ts`, `pagination.ts`, `types.ts`, `useDashboardShortcuts.ts`, `useLayoutStore.ts`, `vault-api.ts`.

**Tests:** backend `backend/tests/`: `test_albums.py`, `test_auth.py`, `test_autosync.py`, `test_backend_bounds.py`, `test_download_job.py`, `test_gallerydl_adapter.py`, `test_instagram_challenges.py`, `test_instagram_session.py`, `test_job_service.py`, `test_matrixconsole.py`, `test_recent_media.py`, `test_settings_session.py`, `test_settings_upload.py`, `test_url_validation.py`, `test_vidara.py`, `test_vidara_import.py`; root `tests/`: `test_creator_pagination.py`, `test_engines.py`, `test_media_vault.py`, `test_migrate_media_paths.py`, `test_worker_retry.py`; frontend: `src/app/page.test.tsx`, `src/components/studio/JobPipeline.test.tsx`, `src/hooks/useCreatorArchive.test.ts`, `src/lib/vault-api.test.ts`.

**Build/configuration/operations:** `pyproject.toml`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/next.config.mjs`, `frontend/tsconfig.json`, `frontend/postcss.config.mjs`, `frontend/eslint.config.mjs`, `frontend/vitest.config.ts`, `frontend/vitest.setup.ts`, `frontend/.eslintrc.json`, `.env.example`, `.env.compose.example`, `.gitignore`, `.dockerignore`, `Dockerfile.backend`, `Dockerfile.frontend`, `docker-compose.yml`, `run-local.sh`, `caddy/Caddyfile`, `migrate_media_paths.py`, and root `conftest.py`.

Planning/context documents, not runtime requirements: root `CONTEXT.md`, `globalstream.md`, and [ADR records](../adr/README.md). `globalstream.md` describes a proposed feature; it is not an implemented route/adapter.

## 3. Backend module responsibilities

| File/module | Public seam / purpose | Important behavior |
|---|---|---|
| `backend/app/config.py` | `Settings`, `get_settings`, `_secret_value` | Environment + `.env` settings; process env `*_FILE` can load token/password-hash/session-secret/vault-key files; settings cached. Values can differ between `.env` defaults and database-backed user settings. |
| `backend/app/errors.py` | `AppError`, `map_exception`, `error_envelope` | Maps error to code, severity, HTTP status, retryability, user/operator text, remediation and request ID. |
| `backend/app/download_errors.py` | `DownloadErrorCategory`, `classify_download_error`, `is_retryable` | Unified download failure classification; only network and rate-limited categories retryable. |
| `backend/app/url_validation.py` | `validate_url`, `validate_public_url`, `open_public_url` | Job URL must use HTTPS, approved exact host, no credentials/custom port, and resolve only to globally routable addresses. A transient DNS resolution error is separated from permanent URL rejection. `open_public_url` validates redirect targets; TikTok uses it for API/media fallback. |
| `backend/app/service.py` | `enqueue`, `bulk_enqueue`, `recover_jobs`, `enqueue_due_jobs` | Canonicalizes URL, detects platform, reuses active matching URL, bulk-deduplicates against jobs and media, applies per-import enqueue cap, tracks pending queue IDs. |
| `backend/app/job_service.py` | `JobService` | Serializes/list/stats jobs, cancellation, queue purge, clear/delete. See [job API](../03-technical/api.md#download-jobs). |
| `backend/app/worker.py` | `Worker` | Runs queue consumers with configured count and cooldown; invokes processor; catches unhandled failures as last-resort guard. |
| `backend/app/jobs.py` | `DownloadJob` | Conditional job claim, URL dedup, adapter download, SHA-256 dedup, metadata, organized storage, DB persistence, progress, retry/backoff, rollback of moved files on exceptions. |
| `backend/app/scheduler.py` | `start_scheduler`, health/autosync/retry callbacks | Schedules adapter health, periodic autosync, and due retry dispatch. |
| `backend/app/ratelimit.py` | `rate_limit` decorator | Contains per-platform intervals/retries but no active call site was found; do not infer enforced throttling from constants alone. |
| `backend/app/adapters/base.py`, `registry.py` | Adapter interface and registry | `detect`, `get`, `all`; startup registers eight platforms; Facebook module exists but registration is disabled. |
| `backend/app/adapters/instagram.py` | Instagram adapter | `auto`/`gallery-dl`/`instaloader` selection from app settings; resolves/downloads through engines; login, session validation, saved-post listing. |
| `backend/app/adapters/threads.py` | Threads adapter | Fetches page HTML with optional configured cookies, extracts post metadata/media, downloads images/videos; writes a text record for text-only posts or when no asset downloads succeed. |
| `backend/app/adapters/tiktok.py` | TikTok adapter | Normalizes photo URL for `yt-dlp`; tries `yt-dlp` first, then TikWM metadata/media fallback. `open_public_url()` used for API/media fetches. |
| `backend/app/adapters/youtube.py` | YouTube adapter | Uses `yt-dlp`, requests single-item extraction (`noplaylist`), maps uploader/channel, title/description, date. |
| `backend/app/adapters/gallerydl.py`, `x.py`, `reddit.py`, `pinterest.py` | Shared gallery-dl adapter | Per-platform `PlatformSpec` supplies hosts and metadata keys; resolve is best-effort, download shared. |
| `backend/app/adapters/vidara.py` | Vidara adapter | HTTP stream API, short in-process URL cache, public URL/redirect validation, HTTP or `yt-dlp` HLS download, size cap, DRM-payload rejection. |
| `backend/app/adapters/facebook.py` | Inactive adapter implementation | Uses `yt-dlp` but application startup has registration commented out. |
| `backend/app/engines.py` | `ydl_opts`, `gdl_options`, `gdl_config`, `gdl_download` | Resolves cookies from DB then environment/path; protects process-global gallery-dl config with lock; engine download errors on nonzero/no files. |
| `backend/app/downloader.py` | `sha256_file`, `compute_hashes`, `organize`, `write_metadata` | Checks existing source/hash; cleans creator/date names for path; moves downloaded files; writes JSON metadata sidecar. |
| `backend/app/video.py` | `probe`, `normalize`, `classify_media`, `thumbnail` | Uses FFprobe/FFmpeg with configured executables/timeout; can normalize transport stream and generate WebP thumbnail/media properties. |
| `backend/app/media_vault.py` | `MediaQuery`, `MediaVault` | Shared filters for list/count/creator/export; result list ordered newest-first; visual-only listing checks physical files and excludes audio; count is metadata-based. CSV formula and ZIP component sanitization helpers live here. |
| `backend/app/media_exporter.py` | `MediaExporter` | Serializes selected items to CSV/JSON/ZIP; byte-size guard and in-memory/spooled output handling. |
| `backend/app/albums.py` | `AlbumService` | Album CRUD, cover/media mapping, association add/remove with duplicate handling. |
| `backend/app/autosync.py` | `run_autosync`, settings getters/updater | Reads at most 100 saved URLs, respects enablement/interval unless forced, de-duplicates/bulk-enqueues up to 500, persists run status and counters; current sync update disables liked sync. |
| `backend/app/settings_store.py` | `SettingsStore` | Single DB settings row (id 1); internal snapshot retains file paths, public serialization masks file paths to existence booleans. Updates only username, cooldown and default engine. |
| `backend/app/settings_upload.py` | `SettingsFileService` | Current route allows Netscape cookie files in `.txt`/`.cookies`; non-empty file up to configured upload cap; filename length at most 100. Writes random filename under `config/uploads` and DB path; old upload cleanup is not guaranteed. |
| `backend/app/instagram_session.py`, `instagram_challenges.py` | Session service and in-memory 2FA store | Upload session validates local session format/username and updates registry/settings; challenge TTL 300 seconds, max 3 attempts, single-use; state is process-local. |
| `backend/app/vault.py` | `encrypt`, `decrypt`, `gen_key` | Fernet-based utility using configured `vault_key`; not a database vault service by itself. Placeholder key is not valid Fernet key. |
| `backend/app/observability.py` | Health/readiness/metrics router and middleware | `/api/health` is liveness-only; readiness checks DB query; counters and durations held in process memory. Request middleware adds/reuses `X-Request-ID` and logs duration. |
| `backend/app/matrixconsole.py` | Event store and logging handlers | Bounded event history (2,000), severity/source stats, queue per subscriber (100, oldest dropped when full), selected-field/query/bearer redaction, console log handler, and rotating JSON log file (5 MiB, five backups). Redaction is selective, not a guarantee for arbitrary secrets. |
| `backend/app/routes/console.py` | Console event API and SSE | Event query/history, stats/sources/detail, filtered server-sent stream, 15-second keepalive, disconnect cleanup. |
| `backend/app/importer.py` | `parse_archive_file`, `parse_vidara_txt` | Extracts matching Instagram, TikTok, Threads, X/Twitter, YouTube, Pinterest and Reddit URL forms from JSON/HTML/TXT; Vidara TXT accepts exact URL per line, ignores blank/comment lines, deduplicates order. Routes enforce byte, parser depth/URL, and line caps. |
| `backend/cli.py` | `mediavault-keygen` CLI | Generates Fernet key, encrypts/decrypts a supplied value, or runs thumbnail backfill; backfill changes media files and DB unless `--dry-run`. |
| `backend/init_db.py` | DB initialization executable | Calls `init_db()` for setup. |
| `migrate_media_paths.py` | Legacy path preview/apply tool | Preview by default; apply updates configured DB path records with backup/integrity check; doesn't move physical media files. |

## 3. Known caveats that matter to maintainers

- Job queue, pending-ID set, scheduler, console event buffer, request metrics, and durations are process-local. Multiple backend replicas do not share these structures.
- URL validation performs DNS public-address checks, then downloader/engine connects separately. No IP pinning for DNS rebinding was found.
- `GET /api/media/count` uses metadata query while `available_visual=true` checks file existence; counts can exceed the number of currently renderable items.
- Gallery/export URL shapes differ: serialized media item files expose `/api/media/files/{id}` plus optional `/media-thumbnail/{id}`; Next rewrites `/api/*`, while thumbnail proxy lives at `/media-thumbnail/[id]`. The text does not depend on thumbnail proxy for media file routes.
- Media file deletion spans database and filesystem; these are not one atomic transaction. A crash can leave stale files or metadata. Thumbnail deletion errors can propagate even though ordinary file unlink errors are swallowed.
- `ratelimit.py` defines a decorator but search found no call sites; actual per-platform throttling should be verified before relying on it.
- `matrixconsole.py` redacts selected secret-shaped field names and query parameters; it should not be treated as a guarantee that all arbitrary secrets/URLs in event messages are hidden.
- Instagram challenges, worker leases, event streams, and metrics have no cross-process coordination.
- Runtime config values and local schema may differ; no live `.env`, secret files, local DB, session, or media were inspected.

## 4. Full test inventory

See [Testing Guide](../03-technical/testing.md) for grouped test names, commands and limitations.
