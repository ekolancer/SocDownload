# Kamus Data (Data Dictionary)

> **Document Type:** Data Dictionary<br>
> **Status:** Draft — transcribed from current ORM model and migrations<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Source:** SQLAlchemy declarations and migration runner in [`backend/app/db.py`](../../backend/app/db.py#L46-L299); local database contents were not inspected.<br>
> **Related Documents:** [ERD](./ERD.md), [Database Schema](../02-architecture/database-schema.md), [Glossary](../glossary.md)

Nullable and type labels follow current mapped model unless noted. Default values are application defaults (not necessarily database server defaults). `schema_migrations` is created by the migration runner. See [physical schema](../02-architecture/database-schema.md) for indexes and unique constraints.

## 1. Daftar entitas

| No. | Entitas | Tabel | Deskripsi |
|---:|---|---|---|
| 1 | Account | `accounts` | Platform account identity and optional encrypted session. |
| 2 | Job | `jobs` | A URL's download state, attempt, lease, and progress. |
| 3 | Media item | `media_items` | Metadata and source identity for downloaded media. |
| 4 | Media file | `media_files` | Stored media file and optional thumbnail/technical metadata. |
| 5 | Album | `albums` | Named collection and optional cover media. |
| 6 | Album membership | `album_media_items` | Association between album and media item. |
| 7 | Platform adapter | `platform_adapters` | Registered adapter and last health result per platform. |
| 8 | Application settings | `app_settings` | Local application preferences and file references. |
| 9 | Auto-sync configuration | `auto_sync_config` | Sync preference and latest run counters/status per platform. |
| 10 | Schema migration | `schema_migrations` | Applied schema migration versions. |

## 2. Kamus atribut

### `accounts` — Account

| Kolom | Tipe | Nullable | Kunci / default | Makna |
|---|---|---|---|---|
| `id` | INTEGER | No | PK | Identifier account. |
| `platform` | VARCHAR(32) | No | — | Platform name. |
| `username` | VARCHAR(255) | No | — | Username on platform. |
| `encrypted_session` | TEXT | Yes | — | Encrypted platform session, when stored. |
| `created_at` | DATETIME | No | App default `utcnow` | Record creation time. |

### `jobs` — Job

| Kolom | Tipe | Nullable | Kunci / default | Makna |
|---|---|---|---|---|
| `id` | INTEGER | No | PK | Job identifier. |
| `platform` | VARCHAR(32) | No | — | Detected platform. |
| `url` | TEXT | No | Index `ix_jobs_url` | Submitted source URL. |
| `status` | VARCHAR(16) | No | App default `queued`; index `ix_jobs_status` | Job lifecycle status. |
| `error` | TEXT | Yes | — | Error detail. |
| `created_at` | DATETIME | No | App default `utcnow` | Job creation time. |
| `started_at` | DATETIME | Yes | — | Processing start time. |
| `finished_at` | DATETIME | Yes | — | Terminal completion time. |
| `lease_until` | DATETIME | Yes | — | Worker lease expiration time. |
| `lease_token` | VARCHAR(64) | Yes | — | Worker lease token. |
| `next_attempt_at` | DATETIME | Yes | — | Earliest scheduled retry time. |
| `attempts` | INTEGER | No | App default `0`; migration default `0` | Number of processing attempts. |
| `progress_percent` | INTEGER | Yes | — | Reported download progress percentage. |
| `bytes_downloaded` | INTEGER | No | App default `0`; migration default `0` | Bytes downloaded so far. |
| `total_bytes` | INTEGER | Yes | — | Reported total download size. |
| `progress_stage` | VARCHAR(32) | Yes | — | Current processing stage. |
| `transfer_speed` | FLOAT | Yes | — | Reported transfer speed. |
| `eta_seconds` | INTEGER | Yes | — | Estimated remaining time in seconds. |

### `media_items` — Media item

| Kolom | Tipe | Nullable | Kunci / default | Makna |
|---|---|---|---|---|
| `id` | INTEGER | No | PK | Media item identifier. |
| `job_id` | INTEGER | Yes | FK → `jobs.id` | Source job, when known. |
| `platform` | VARCHAR(32) | No | — | Source platform. |
| `source_url` | TEXT | No | Unique with `sha256`; index `ix_media_items_source_url` | Original media URL. |
| `username` | VARCHAR(255) | Yes | — | Source creator username. |
| `caption` | TEXT | Yes | — | Captured caption. |
| `posted_at` | DATETIME | Yes | — | Source post timestamp, when available. |
| `hashtags` | TEXT | Yes | — | Captured hashtags. |
| `sha256` | VARCHAR(64) | Yes | Unique with `source_url`; index `ix_media_items_sha256` | Content hash. |
| `is_favorite` | BOOLEAN | No | App default `False`; migration default `0` | Whether item is favorited. |
| `created_at` | DATETIME | No | App default `utcnow` | Media record creation time. |

### `media_files` — Media file

| Kolom | Tipe | Nullable | Kunci / default | Makna |
|---|---|---|---|---|
| `id` | INTEGER | No | PK | Media file identifier. |
| `media_item_id` | INTEGER | No | FK → `media_items.id` | Parent media record. |
| `path` | TEXT | No | — | Local stored file path. |
| `kind` | VARCHAR(16) | No | — | Media kind used by application. |
| `sha256` | VARCHAR(64) | Yes | — | File content hash. |
| `thumbnail_path` | TEXT | Yes | Migration-added | Optional thumbnail path. |
| `width` | INTEGER | Yes | Migration-added | Pixel width, when available. |
| `height` | INTEGER | Yes | Migration-added | Pixel height, when available. |
| `duration` | FLOAT | Yes | Migration-added | Duration, when available. |
| `video_codec` | VARCHAR(32) | Yes | Migration-added | Video codec, when available. |
| `audio_codec` | VARCHAR(32) | Yes | Migration-added | Audio codec, when available. |

### `albums` — Album

| Kolom | Tipe | Nullable | Kunci / default | Makna |
|---|---|---|---|---|
| `id` | INTEGER | No | PK | Album identifier. |
| `name` | VARCHAR(255) | No | — | Album name. |
| `description` | TEXT | Yes | — | Optional description. |
| `cover_media_id` | INTEGER | Yes | FK → `media_items.id` | Optional cover media item. |
| `created_at` | DATETIME | No | App default `utcnow` | Creation time. |
| `updated_at` | DATETIME | No | App default and `onupdate` `utcnow` | Last application update time. |

### `album_media_items` — Album membership

| Kolom | Tipe | Nullable | Kunci / default | Makna |
|---|---|---|---|---|
| `id` | INTEGER | No | PK | Membership row identifier. |
| `album_id` | INTEGER | No | FK → `albums.id`, `ON DELETE CASCADE`; unique with `media_item_id` | Parent album. |
| `media_item_id` | INTEGER | No | FK → `media_items.id`, `ON DELETE CASCADE`; unique with `album_id` | Included media item. |
| `added_at` | DATETIME | No | App default `utcnow` | Time item was added. |

### `platform_adapters` — Platform adapter

| Kolom | Tipe | Nullable | Kunci / default | Makna |
|---|---|---|---|---|
| `id` | INTEGER | No | PK | Adapter record identifier. |
| `platform` | VARCHAR(32) | No | Unique | Platform key. |
| `adapter_name` | VARCHAR(255) | No | — | Registered adapter name. |
| `engine` | VARCHAR(32) | Yes | — | Selected engine, when available. |
| `engine_version` | VARCHAR(64) | Yes | — | Engine version, when available. |
| `enabled` | BOOLEAN | No | App default `True` | Adapter enabled state. |
| `last_health_at` | DATETIME | Yes | — | Most recent health-check time. |
| `health_ok` | BOOLEAN | Yes | — | Most recent health-check result. |

### `app_settings` — Application settings

| Kolom | Tipe | Nullable | Kunci / default | Makna |
|---|---|---|---|---|
| `id` | INTEGER | No | PK | Settings row identifier. |
| `cookies_file` | TEXT | Yes | — | Optional cookie file path. |
| `instagram_session_file` | TEXT | Yes | — | Optional Instagram session file path. |
| `instagram_username` | VARCHAR(255) | No | App default `""`; migration default `''` | Configured Instagram username. |
| `job_cooldown_seconds` | INTEGER | No | App default `2`; migration default `2` | Worker cooldown between jobs. |
| `default_engine` | VARCHAR(32) | No | App default `"auto"`; migration default `'auto'` | Preferred download engine. |

### `auto_sync_config` — Auto-sync configuration

| Kolom | Tipe | Nullable | Kunci / default | Makna |
|---|---|---|---|---|
| `id` | INTEGER | No | PK | Configuration row identifier. |
| `platform` | VARCHAR(32) | No | Unique | Platform to sync. |
| `enabled` | BOOLEAN | No | App default `False` | Whether scheduled sync is enabled. |
| `sync_saved` | BOOLEAN | No | App default `True` | Whether to retrieve saved items. |
| `sync_liked` | BOOLEAN | No | App default `False` | Liked-item option; current update flow forces false. |
| `interval_minutes` | INTEGER | No | App default `15` | Minimum interval between scheduled runs. |
| `last_sync_at` | DATETIME | Yes | — | Most recent sync time. |
| `last_sync_status` | VARCHAR(32) | Yes | — | Most recent sync status. |
| `last_error` | TEXT | Yes | — | Most recent sync error, when present. |
| `items_synced_total` | INTEGER | No | App default `0` | Cumulative count of newly enqueued items. |
| `last_discovered_count` | INTEGER | No | App default `0`; migration default `0` | URLs collected in last run. |
| `last_enqueued_count` | INTEGER | No | App default `0`; migration default `0` | URLs enqueued in last run. |
| `last_skipped_count` | INTEGER | No | App default `0`; migration default `0` | URLs skipped in last run. |
| `last_failed_count` | INTEGER | No | App default `0`; migration default `0` | Failures recorded for last run. |

### `schema_migrations` — Schema migration

| Kolom | Tipe | Nullable | Kunci / default | Makna |
|---|---|---|---|---|
| `version` | INTEGER | No | PK | Applied migration version. |
| `applied_at` | DATETIME | No | No SQL default specified | Time migration was recorded. |

## 3. Relasi

| Entitas sumber | Entitas target | Kolom FK | Kardinalitas |
|---|---|---|---|
| `media_items` | `jobs` | `job_id` | Many-to-one; nullable. |
| `media_files` | `media_items` | `media_item_id` | Many-to-one; no explicit cascade action. |
| `albums` | `media_items` | `cover_media_id` | Many-to-one optional cover. |
| `album_media_items` | `albums` | `album_id` | Many-to-one; delete cascades. |
| `album_media_items` | `media_items` | `media_item_id` | Many-to-one; delete cascades. |

No relationship inferred for `accounts`; model does not declare foreign key. For column-by-column cross-check, see [ERD physical model](./ERD.md#3-physical-data-model) and [database schema](../02-architecture/database-schema.md#tables).
