# Database Schema

> **Document Type:** Database Schema<br>
> **Status:** Draft — model and migration inventory verified from source<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Source:** [`backend/app/db.py`](../../backend/app/db.py#L46-L299); live database was not inspected.<br>
> **Related Documents:** [ERD](../01-requirements/ERD.md), [Data Dictionary](../01-requirements/data-dictionary.md), [HLD](./HLD.md), [Glossary](../glossary.md)

## Overview

Default database is SQLite (`sqlite:///./data/mediavault.db`). SQLAlchemy declares nine application tables; the migration runner additionally creates `schema_migrations`. `init_db()` calls `Base.metadata.create_all()` and then applies numbered migrations 1–10. SQLite foreign keys are enabled per connection. Relative database URLs are resolved against application root. Existing/local DB content and applied migration versions were not inspected.

Column nullability, types and application defaults are documented exhaustively in [Data Dictionary](../01-requirements/data-dictionary.md). This document records physical constraints and migration facts.

## Physical column inventory

The following names are the complete model/migration table inventory. Types, nullability and key annotations are itemized in the [Data Dictionary](../01-requirements/data-dictionary.md), from same source pass. Do not treat this declaration as proof of the local database's current live schema.

| Table | Columns |
|---|---|
| `accounts` | `id`, `platform`, `username`, `encrypted_session`, `created_at` |
| `jobs` | `id`, `platform`, `url`, `status`, `error`, `created_at`, `started_at`, `finished_at`, `lease_until`, `lease_token`, `next_attempt_at`, `attempts`, `progress_percent`, `bytes_downloaded`, `total_bytes`, `progress_stage`, `transfer_speed`, `eta_seconds` |
| `media_items` | `id`, `job_id`, `platform`, `source_url`, `username`, `caption`, `posted_at`, `hashtags`, `sha256`, `is_favorite`, `created_at` |
| `media_files` | `id`, `media_item_id`, `path`, `kind`, `sha256`, `thumbnail_path`, `width`, `height`, `duration`, `video_codec`, `audio_codec` |
| `albums` | `id`, `name`, `description`, `cover_media_id`, `created_at`, `updated_at` |
| `album_media_items` | `id`, `album_id`, `media_item_id`, `added_at` |
| `platform_adapters` | `id`, `platform`, `adapter_name`, `engine`, `engine_version`, `enabled`, `last_health_at`, `health_ok` |
| `app_settings` | `id`, `cookies_file`, `instagram_session_file`, `instagram_username`, `job_cooldown_seconds`, `default_engine` |
| `auto_sync_config` | `id`, `platform`, `enabled`, `sync_saved`, `sync_liked`, `interval_minutes`, `last_sync_at`, `last_sync_status`, `last_error`, `items_synced_total`, `last_discovered_count`, `last_enqueued_count`, `last_skipped_count`, `last_failed_count` |
| `schema_migrations` | `version`, `applied_at` |

## Tables

| Table | Primary key | Foreign keys | Unique constraints |
|---|---|---|---|
| `accounts` | `id INTEGER` | — | — |
| `jobs` | `id INTEGER` | — | — |
| `media_items` | `id INTEGER` | `job_id → jobs.id` | `(source_url, sha256)` named `uq_source_sha256` |
| `media_files` | `id INTEGER` | `media_item_id → media_items.id` | — |
| `albums` | `id INTEGER` | `cover_media_id → media_items.id` | — |
| `album_media_items` | `id INTEGER` | `album_id → albums.id`; `media_item_id → media_items.id` | `(album_id, media_item_id)` named `uq_album_media` |
| `platform_adapters` | `id INTEGER` | — | `platform` |
| `app_settings` | `id INTEGER` | — | — |
| `auto_sync_config` | `id INTEGER` | — | `platform` |
| `schema_migrations` | `version INTEGER` | — | — |

The two association-table foreign keys use `ON DELETE CASCADE`. Other model foreign keys do not specify a delete action. SQLAlchemy does not declare ORM relationships in these model classes.

## Indexes

| Table | Index / constraint | Columns | Source / purpose |
|---|---|---|---|
| `jobs` | `ix_jobs_status` | `status` | Declared in ORM; filter jobs by status. |
| `jobs` | `ix_jobs_url` | `url` | Declared in ORM; URL lookup. |
| `media_items` | `ix_media_items_source_url` | `source_url` | Declared in ORM and migration 1. |
| `media_items` | `ix_media_items_sha256` | `sha256` | Declared in ORM and migration 1. |
| `media_items` | `uq_source_sha256` | `source_url`, `sha256` | Unique dedup constraint declared in ORM. |
| `album_media_items` | `uq_album_media` | `album_id`, `media_item_id` | Unique membership pair declared in ORM. |
| `platform_adapters` | Unique constraint on `platform` | `platform` | Declared in ORM. |
| `auto_sync_config` | Unique constraint on `platform` | `platform` | Declared in ORM. |

## Migration history

Migrations are an in-code dictionary executed in ascending version order. `schema_migrations` records applied versions; duplicate-column/already-exists errors are tolerated, other SQL errors propagate.

| Version | Schema change |
|---:|---|
| 1 | Create indexes for job status/URL and media source URL/SHA-256. |
| 2 | Add `media_items.is_favorite BOOLEAN DEFAULT 0`. |
| 3 | Add `jobs.lease_until` and `jobs.lease_token`. |
| 4 | Add discovered/enqueued/skipped/failed counters to `auto_sync_config`, with integer defaults `0`. |
| 5 | Add `jobs.attempts INTEGER NOT NULL DEFAULT 0`. |
| 6 | Create `app_settings` if absent with initial application settings columns/defaults. |
| 7 | Add cooldown and default-engine settings columns with defaults. |
| 8 | Add thumbnail and media dimension/duration/codec metadata columns to `media_files`. |
| 9 | Add download progress columns to `jobs`. |
| 10 | Add `jobs.next_attempt_at`. |

The migration runner suppresses duplicate-column/already-existing exceptions, so model declarations describe the desired ORM shape while historical database constraints may depend on migration path. Live schema drift has not been ruled out.

**Consistency:** All tables and columns are cross-referenced in [ERD physical model](../01-requirements/ERD.md#3-physical-data-model) and [Data Dictionary](../01-requirements/data-dictionary.md). Update all three from the same schema scan when code changes.
