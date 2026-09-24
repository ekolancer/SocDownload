# Software Requirements Specification

> Document Type: SRS  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-09-24  
> Related Documents: [BRD](BRD.md), [Use Cases](use-cases.md), [HLD](../02-architecture/HLD.md), [API](../03-technical/api.md)

## Functional requirements

- **FR-001:** Accept validated URLs and create queued jobs.
- **FR-002:** Select adapters, download, hash, persist metadata/files, and update job status.
- **FR-003:** List/filter media; serve files/thumbnails; favorite, album, delete, and export media.
- **FR-004:** Import supported archive formats subject to configured limits.
- **FR-005:** Configure/trigger Instagram saved-post autosync; liked sync defaults false.
- **FR-006:** Protect API routes with Bearer token or signed session; allow `GET /api/health` publicly.
- **FR-007:** Expose health/readiness, request, queue, and job observability routes.

## Non-functional requirements

- **Security:** URL validation, public-DNS checks, sanitized errors, loopback defaults, secret configuration.
- **Reliability:** SQLite job leases, startup recovery, retries, staging cleanup.
- **Resource control:** request, upload, parser, batch, export, and byte limits in settings/routes.
- **Maintainability:** pytest configuration covers `backend/tests` and `tests`; Python package metadata defines supported runtime.
- **Portability:** Python `>=3.11,<3.15`; frontend requires Node.js `>=20.9 <25` and uses Next.js `16.3.3` with React `19.2.1` from `frontend/package.json`.

Retention, SLA, backup, multi-user authorization, and deployment requirements: `[TBD — confirm with team]`.
