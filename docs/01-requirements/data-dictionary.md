# Data Dictionary

> Document Type: Data Dictionary  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-09-24  
> Related Documents: [ERD](ERD.md), [Database Schema](../02-architecture/database-schema.md)

Definitions derive from `backend/app/db.py`; PK means primary key, FK means foreign key.

| Table | Key fields | Purpose |
|---|---|---|
| `accounts` | `id`, `platform`, `username`, `encrypted_session`, `created_at` | Account/session model. |
| `jobs` | `id`, URL/status, lease, attempts, progress | Download lifecycle. |
| `media_items` | `id`, `job_id`, source/metadata/hash/favorite fields | Logical media record. |
| `media_files` | `id`, `media_item_id`, path/kind/hash/technical metadata | Stored file record. |
| `albums` | `id`, name, description, cover, timestamps | Media grouping. |
| `album_media_items` | `album_id`, `media_item_id`, `added_at` | Album membership. |
| `platform_adapters` | platform, adapter, engine, enabled, health | Adapter registry state. |
| `app_settings` | cookies/session paths, cooldown, default engine | Runtime settings. |
| `auto_sync_config` | platform, enabled, sync flags, interval, counters/status | Autosync state. |
| `schema_migrations` | version, applied_at | Applied migration versions. |

Nullable fields, SQL types, indexes, and constraints: [Database Schema](../02-architecture/database-schema.md).
