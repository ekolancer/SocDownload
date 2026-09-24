# MediaVault Documentation Portal

> Document Type: Documentation Portal  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-09-24  
> Related Documents: [Glossary](docs/glossary.md), [Requirements](docs/01-requirements/README.md), [Architecture](docs/02-architecture/README.md), [Technical](docs/03-technical/README.md)

MediaVault is a Python/FastAPI service with a frontend, SQLite persistence, an in-process worker queue, platform adapters, and filesystem media storage. Claims here derive from `backend/`, `pyproject.toml`, launch scripts, and configuration examples. Business ownership, retention, SLA, and production topology remain `[TBD — confirm with team]`.

## Navigation
- [Requirements](docs/01-requirements/README.md): business scope, functional requirements, use cases, flows, ERD, dictionary.
- [Architecture](docs/02-architecture/README.md): high-level design, low-level design, schema.
- [Technical](docs/03-technical/README.md): API, integrations, user guide, deployment, operations.
- [Glossary](docs/glossary.md)

## Local facts
- Backend entry point: `backend.app.main:app`; default bind `127.0.0.1:8000`.
- SQLite default configured through `DATABASE_URL`; media path through `MEDIA_ROOT`.
- Dependencies: FastAPI, Uvicorn, SQLAlchemy, cryptography, httpx, APScheduler, optional `yt-dlp`, `gallery-dl`, `Instaloader`.
- Run `run-local.ps1` or `run-local.sh`; manual commands appear in [Deployment](docs/03-technical/deployment.md).

## Security boundary
API routes require Bearer token or valid session, except `GET /api/health`, `/api/auth`, `OPTIONS`, and non-API paths. Keep `.env`, `secrets/`, cookies, sessions, databases, and media out of commits. Production TLS, network policy, backup policy, and multi-user authorization are `[TBD — confirm with team]`.
