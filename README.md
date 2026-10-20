# MediaVault — Portal Dokumentasi

> **Document Type:** Documentation Portal<br>
> **Status:** Draft<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [Glossary](docs/glossary.md), [Requirements](docs/01-requirements/README.md), [Architecture](docs/02-architecture/README.md), [Technical](docs/03-technical/README.md)

MediaVault mengunduh media sosial ke vault lokal. Sistem menggabungkan UI Next.js, API FastAPI, SQLite, worker in-process, adapter platform, dan penyimpanan file lokal. Dokumentasi ini diturunkan dari source aktif; business ownership, service target, retention, backup, dan production topology yang tak dibuktikan kode ditandai TBD.

## Mulai di sini

1. [System Architecture](docs/03-technical/system-architecture.md) — gambaran alur untuk developer/operator baru.
2. [HLD](docs/02-architecture/HLD.md) — komponen, teknologi, dan aliran data.
3. [User Guide](docs/03-technical/user-guide.md) — cara memakai fitur UI.
4. [Glossary](docs/glossary.md) — definisi istilah dan status job.

## Kebutuhan dan analisis

[Buka indeks requirements](docs/01-requirements/README.md): [BRD](docs/01-requirements/BRD.md) · [SRS](docs/01-requirements/SRS.md) · [Use Cases](docs/01-requirements/use-cases.md) · [Flowcharts](docs/01-requirements/flowcharts.md) · [ERD](docs/01-requirements/ERD.md) · [Kamus Data](docs/01-requirements/data-dictionary.md).

## Arsitektur dan desain

[Buka indeks arsitektur](docs/02-architecture/README.md): [HLD](docs/02-architecture/HLD.md) · [LLD](docs/02-architecture/LLD.md) · [Module Map](docs/02-architecture/module-map.md) · [Database Schema](docs/02-architecture/database-schema.md) · [API Integration](docs/02-architecture/api-integration.md).

## Dokumentasi teknis

[Buka indeks teknis](docs/03-technical/README.md): [System Architecture](docs/03-technical/system-architecture.md) · [Frontend Reference](docs/03-technical/frontend.md) · [API Reference](docs/03-technical/api.md) · [API Integration Guide](docs/03-technical/api-integration.md) · [Deployment Guide](docs/03-technical/deployment.md) · [User Guide](docs/03-technical/user-guide.md) · [SOP](docs/03-technical/sop.md) · [Testing Guide](docs/03-technical/testing.md) · [Configuration Reference](docs/03-technical/configuration.md).

## Konteks dan keputusan arsitektur

- [Context](CONTEXT.md) — istilah domain, kosakata arsitektur, dan status modul target; catatan desain tidak otomatis berarti perilaku aktif.
- [Architecture Decision Records](docs/adr/README.md) — keputusan dan trade-off yang dicatat tim; cocokkan dengan source sebelum menganggapnya masih berlaku.

## Fakta lokal

- Entrypoint backend: `backend.app.main:app`; port development `127.0.0.1:8000`.
- Frontend Next.js port development `127.0.0.1:3000`; proxy memakai `BACKEND_INTERNAL_URL`.
- Default DB SQLite dikonfigurasi lewat `DATABASE_URL`; file media lewat `MEDIA_ROOT`.
- Script lokal yang ditemukan adalah `run-local.sh`; deployment container di [`docker-compose.yml`](docker-compose.yml).

## Batas keamanan

Protected API memakai bearer token atau password-auth session. Health dan `/api/auth` dikecualikan oleh middleware. Jangan commit `.env`, `secrets/`, cookies, sessions, database, atau media pribadi. TLS, network policy, backup, retention, dan multi-user authorization production **[TBD — confirm with team]**. Lihat [Deployment Guide](docs/03-technical/deployment.md).
