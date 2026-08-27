# Software Requirements Specification

> Document Type: SRS  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-27  
> Related: [BRD](BRD.md), [Use Cases](use-cases.md), [HLD](../02-architecture/HLD.md), [API](../03-technical/api.md)

## Functional requirements

- **FR-001:** System accepts approved HTTPS media URLs and creates queued jobs.
- **FR-002:** System processes jobs through adapter selection, download, hashing, metadata persistence, and vault organization.
- **FR-003:** System lists, filters, favorites, deletes, albums, and exports media.
- **FR-004:** System imports supported archive files with configured size/complexity limits.
- **FR-005:** System supports Instagram saved-post autosync; liked sync is rejected/disabled.
- **FR-006:** System protects API routes with single-user Bearer token authentication; health GET remains public.
- **FR-007:** System exposes health, readiness, request, queue, and job metrics.

## Non-functional requirements

- **NFR-001 Security:** loopback defaults, API token, URL validation, public-DNS checks, sanitized public errors.
- **NFR-002 Reliability:** SQLite-backed queue claims, leases, startup recovery, retry limits, compensating file cleanup.
- **NFR-003 Resource control:** request, upload, parser, batch, export item, and byte bounds.
- **NFR-004 Maintainability:** Python tests, TypeScript strict checks, ESLint, CI workflow.
- **NFR-005 Portability:** Python 3.11–3.14 and Node 20.9–24 supported by manifests.

## Constraints

- SQLite is default database.
- Queue remains process-local for dispatch even though job state is persisted.
- External platforms and downloader engines can change behavior.
- Retention, SLA, backup, and multi-user requirements are `[TBD — confirm with team]`.
