# Konfigurasi dan Environment

> **Document Type:** Configuration Reference
> **Status:** Draft — defaults and validation ranges read from current source
> **Owner:** [TBD — confirm with team]
> **Last Updated:** 2026-10-19
> **Related Documents:** [Deployment Guide](./deployment.md), [Database Schema](../02-architecture/database-schema.md), [HLD](../02-architecture/HLD.md), [API](./api.md), [Glossary](../glossary.md)

## 1. Sumber konfigurasi

- Backend `Settings` loads process environment, root `.env`, and code defaults via Pydantic Settings; `get_settings()` is `lru_cache`-cached per process.
- Four secret values can be read from path-valued process environment variables: `API_TOKEN_FILE`, `AUTH_PASSWORD_HASH_FILE`, `AUTH_SESSION_SECRET_FILE`, `VAULT_KEY_FILE`. These path variables are read from process environment after the ordinary settings object is created; they are not fields in the `.env` settings model.
- Mutable UI settings are a distinct singleton `app_settings` DB row (id 1): `cookies_file`, `instagram_session_file`, `instagram_username`, `job_cooldown_seconds`, and `default_engine`.
- Per-platform auto-sync settings reside separately in `auto_sync_config` rows.
- Compose injects DB/media/engine paths and secret-file paths, and mounts `data`, `media`, `config`, and `secrets`. The secrets mount is read-only. File names used at `/run/secrets` are declared in `docker-compose.yml`.
- Local values and actual secret-file contents are intentionally not documented.

## 2. Backend settings

Defaults below derive from `backend/app/config.py`; configurable fields include the shown Pydantic bounds. `MiB`/`GiB` use powers of 1024. Empty defaults mean unset/optional.

| Environment variable / setting | Default | Range / meaning |
|---|---:|---|
| `API_TOKEN` | Empty | Optional bearer token; startup requires it unless both password hash and session secret are configured. |
| `AUTH_PASSWORD_HASH` | Empty | Optional encoded password hash for browser login. |
| `AUTH_SESSION_SECRET` | Empty | HMAC signing secret for session cookies. |
| `AUTH_SESSION_TTL_SECONDS` | 86,400 | 300–2,592,000 seconds; maximum session lifetime. |
| `AUTH_IDLE_TIMEOUT_SECONDS` | 300 | 300–86,400 seconds; idle timeout checked by session validation. |
| `AUTH_LOGIN_FAILURE_LIMIT` | 3 | 1–20 failures before process-local lockout. |
| `AUTH_LOGIN_LOCKOUT_SECONDS` | 1,800 | 60–86,400 seconds per lockout. |
| `VAULT_KEY` | Placeholder, not valid for Fernet operations | Encryption utility key; provide valid key material through secret management. |
| `DATABASE_URL` | `sqlite:///./data/mediavault.db` | SQLAlchemy database URL. Relative default SQLite path resolves under project root. |
| `MEDIA_ROOT` | `./media` | Local media file root. Relative paths are resolved against project root where media handlers use them. |
| `COOKIES_FILE` | Empty | Fallback cookie-file path for adapters/engines; app DB cookie setting may override. |
| `INSTAGRAM_SESSION_FILE` | Empty | Pydantic/Compose path, but startup registry loads active Instagram session from DB-backed `app_settings.instagram_session_file`. |
| `INSTAGRAM_USERNAME` | Empty | Optional config username; account/session management also uses DB-backed setting. |
| `JOB_COOLDOWN_SECONDS` | 3 | Pydantic default passed to worker on startup. Separate `app_settings.job_cooldown_seconds` and settings route default are 2; changing DB setting does not reload the already-started worker. Confirm intended runtime precedence. |
| `IMPORT_URL_LIMIT` | 500 | 1–10,000 URLs enqueued per import. |
| `MAX_UPLOAD_BYTES` | 10 MiB | 1 byte–100 MiB request file cap. |
| `LIST_LIMIT` | 1,000 | 1–10,000 rows; maximum effective API list limit. |
| `BATCH_IDS_LIMIT` | 500 | 1–5,000 identifiers in batch media operations. |
| `EXPORT_ITEMS_LIMIT` | 500 | 1–5,000 media items per export. |
| `EXPORT_BYTES_LIMIT` | 500 MiB | 1 byte–5 GiB media data per ZIP export. |
| `PARSER_DEPTH_LIMIT` | 32 | 1–128 parser traversal depth. |
| `PARSER_URL_LIMIT` | 10,000 | 1–100,000 non-comment Vidara URL lines. |
| `VIDARA_MAX_DOWNLOAD_BYTES` | 2 GiB | 1 byte–10 GiB per Vidara download. |
| `FFMPEG_PATH` | `ffmpeg` | Executable path/name for media normalization and thumbnails. |
| `FFPROBE_PATH` | `ffprobe` | Executable path/name for media probing. |
| `THUMBNAIL_OFFSET_SECONDS` | 2 | Minimum 0; used as upper thumbnail seek offset (also capped to fraction of video duration). |
| `THUMBNAIL_WIDTH` | 480 | 1–4,096 pixels. |
| `THUMBNAIL_QUALITY` | 75 | 1–100. |
| `VIDEO_PROCESS_TIMEOUT_SECONDS` | 300 | 1–3,600 seconds for FFmpeg/FFprobe subprocesses. |

## 3. DB-backed user settings

The Settings UI updates only the following columns through `PUT /api/settings`:

| DB column | Default in model / migration | UI validation |
|---|---|---|
| `instagram_username` | Empty string | Up to 255 characters. |
| `job_cooldown_seconds` | 2 seconds | 0–3,600 seconds; route payload default is 2. Worker gets cached `Settings.job_cooldown_seconds` at process startup, not a live DB update. |
| `default_engine` | `auto` | Exactly `auto`, `gallery-dl`, or `instaloader`; Instagram adapter reads DB selection. |
| `cookies_file` | Empty / NULL | Set by validated cookies file upload; serializer reports whether file exists, not its full path. |
| `instagram_session_file` | Empty / NULL | Set by Instagram login or session import; not accepted by general settings update. |

See [database schema](../02-architecture/database-schema.md) for every DB column and [LLD configuration section](../02-architecture/LLD.md#4-configuration-and-credential-boundaries) for secret/config boundaries.

## 4. Compose variables

| Variable | Purpose / default from Compose |
|---|---|
| `MEDIAVAULT_DATA_DIR` | Host directory mounted at `/app/data`; default `./data`. |
| `MEDIAVAULT_MEDIA_DIR` | Host directory mounted at `/app/media`; default `./media`. |
| `MEDIAVAULT_CONFIG_DIR` | Host directory mounted at `/app/config`; default `./config`. |
| `MEDIAVAULT_SECRETS_DIR` | Host secret directory mounted read-only at `/run/secrets`; default `./secrets`. |
| `CLOUDFLARED_NETWORK` | Existing external Compose network for frontend; default `mediavault_tunnel`. This repository does not create the tunnel/network. |
| `MEDIAVAULT_DNS_PRIMARY` | Primary container DNS override; default `1.1.1.1`. |
| `MEDIAVAULT_DNS_SECONDARY` | Secondary container DNS override; default `8.8.8.8`. |
| `BACKEND_INTERNAL_URL` | Frontend-to-backend URL; Compose/default Docker value `http://backend:8000`, Next development fallback `http://127.0.0.1:8000`. |

Compose also sets `DATABASE_URL=sqlite:////app/data/mediavault.db`, `MEDIA_ROOT=/app/media`, `COOKIES_FILE=/app/config/cookies.txt`, `INSTAGRAM_SESSION_FILE=/app/config/instagram-session`, `FFMPEG_PATH=ffmpeg`, and `FFPROBE_PATH=ffprobe`; secret path variables point to `/run/secrets/...`.

## 5. Defaults and values to treat carefully

- The Pydantic worker cooldown default (3 seconds) and DB/UI cooldown default (2 seconds) differ. The worker receives its cooldown only at application startup.
- `SettingsStore` and some adapters read DB-backed cookie/session/engine values; don't assume `.env` always wins. ADR-0003 describes proposed precedence as deferred; see [ADR index](../adr/README.md).
- `run-local.sh` may generate `.env` material when absent and writes `NEXT_PUBLIC_API_TOKEN` to `frontend/.env.local`; frontend source currently has no reference to `NEXT_PUBLIC_API_TOKEN`. Do not expose secret env variables to browser bundles or share `.env.local`.
- Never copy runtime secrets, usernames, session files, cookies, local paths containing personal data, or DB contents into docs/tickets. See [deployment](./deployment.md).
