# Dokumentasi Teknis

> **Document Type:** Section Index<br>
> **Status:** Draft<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [Requirements](../01-requirements/README.md), [Architecture](../02-architecture/README.md), [Glossary](../glossary.md)

| Dokumen | Tujuan |
|---|---|
| [System Architecture](./system-architecture.md) | Penjelasan ringkas alur sistem bagi developer, support, dan operator. |
| [API Documentation](./api.md) | Inventaris endpoint FastAPI dari route yang tersedia. |
| [API Integration Guide](./api-integration.md) | Panduan base URL, autentikasi, upload, error, dan integrasi konsumen. |
| [Deployment Guide](./deployment.md) | Setup lokal dan Compose; production unknowns dinyatakan terbuka. |
| [User Guide](./user-guide.md) | Panduan browser UI untuk download, Vault, import, dan Instagram sync. |
| [SOP](./sop.md) | Startup dan pemeriksaan dasar dengan perlindungan data lokal. |
| [Testing Guide](./testing.md) | Inventaris test Python dan Vitest beserta commands dan cakupannya. |
| [Frontend Reference](./frontend.md) | Peta halaman, komponen, request UI, proxy, styling, dan testing frontend. |
| [Configuration Reference](./configuration.md) | Backend defaults, bounds, DB-backed preferences, secrets, and Compose variables. |

**Catatan:** Project portal menyebut `run-local.ps1`, namun file tidak ditemukan pada scan; `run-local.sh` ada. Portal diperbarui agar mencerminkan fakta ini. Production path, CI/CD, dan kebijakan operasi belum dapat disimpulkan dari codebase.
