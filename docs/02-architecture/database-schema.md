# Database Schema

> Document Type: Database Schema  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-27  
> Related: [ERD](../01-requirements/ERD.md), [Data Dictionary](../01-requirements/data-dictionary.md)

## Source

Schema is defined by SQLAlchemy models in `backend/app/db.py`. SQLite is default. `Base.metadata.create_all()` creates missing tables; `MIGRATIONS` applies versioned indexes and columns through `schema_migrations`.

## Tables

See [ERD physical model](../01-requirements/ERD.md#physical-model) and [Data Dictionary](../01-requirements/data-dictionary.md). The exact source remains authoritative.

## Integrity

SQLite foreign keys are enabled on connections. Album membership has cascade foreign keys and unique `(album_id, media_item_id)`. Media has unique `(source_url, sha256)`. Job and media query indexes are created by model metadata/migrations.

## Operational notes

Back up `data/mediavault.db` before schema changes. Existing migration rollback procedure is `[TBD — confirm with team]`.
