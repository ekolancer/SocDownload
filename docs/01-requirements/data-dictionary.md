# Data Dictionary

> Document Type: Data Dictionary  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-27  
> Related: [ERD](ERD.md), [Database Schema](../02-architecture/database-schema.md)

All definitions below are sourced from `backend/app/db.py`. `PK` means primary key; `FK` means foreign key.

| Table | Key fields | Purpose |
|---|---|---|
| `accounts` | `id` PK; `platform`; `username`; `encrypted_session`; `created_at` | Stored account session model. |
| `jobs` | `id` PK; `platform`; `url`; `status`; lease fields; `attempts` | Download lifecycle and recovery state. |
| `media_items` | `id` PK; `job_id` FK; source/metadata/hash/favorite fields | Logical downloaded media item. |
| `media_files` | `id` PK; `media_item_id` FK; `path`; `kind`; `sha256` | Physical file belonging to media item. |
| `albums` | `id` PK; `name`; `description`; `cover_media_id` FK | User-created grouping. |
| `album_media_items` | `id` PK; `album_id` FK; `media_item_id` FK; `added_at` | Album membership join table. |
| `platform_adapters` | `id` PK; `platform`; engine/health fields | Adapter registry health metadata. |
| `auto_sync_config` | `id` PK; `platform`; enabled/sync/interval/status counters | Autosync configuration and result counters. |

Nullable fields are nullable in the model; timestamps use `DateTime` and runtime creation uses UTC-aware values. Exact SQL types and constraints are listed in [ERD](ERD.md) and `backend/app/db.py`.
