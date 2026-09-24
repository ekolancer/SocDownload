# Database Schema

> Document Type: Database Schema  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-09-24  
> Related Documents: [ERD](../01-requirements/ERD.md), [Data Dictionary](../01-requirements/data-dictionary.md), [LLD](LLD.md)

## Source and lifecycle

`backend/app/db.py` defines SQLAlchemy models. `init_db()` runs `Base.metadata.create_all()` then versioned `MIGRATIONS` recorded in `schema_migrations`. SQLite foreign keys are enabled on connections.

## Tables

`accounts`, `jobs`, `media_items`, `media_files`, `albums`, `album_media_items`, `platform_adapters`, `app_settings`, and `auto_sync_config` are model tables. `schema_migrations` tracks migration versions.

Relationships and complete field list: [ERD physical source](../01-requirements/ERD.md) and [Data Dictionary](../01-requirements/data-dictionary.md). Important constraints: unique `(source_url, sha256)`, unique `(album_id, media_item_id)`, unique adapter platform, and foreign keys on media/job and album membership.

Backup, rollback, and migration recovery procedure: `[TBD — confirm with team]`.
