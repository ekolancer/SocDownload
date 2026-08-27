# Low-Level Design

> Document Type: LLD  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-27  
> Related: [HLD](HLD.md), [SRS](../01-requirements/SRS.md), [API](../03-technical/api.md)

## Job lifecycle

1. `routes/jobs.py` validates request and calls service enqueue.
2. `service.py` persists a `Job`, then schedules its ID.
3. Worker claims using lease/token fields in `jobs`.
4. Worker resolves adapter, downloads into staging, hashes files, writes metadata, finalizes paths, and commits records.
5. Failure updates status and retry counters; cleanup removes staged/final files where possible.
6. Startup recovery requeues expired work.

## Module map

| Module | Responsibility |
|---|---|
| `main.py` | App creation, auth, lifespan, adapter registration. |
| `routes/*.py` | HTTP request/response contracts. |
| `service.py` | Queue, claims, download orchestration, deduplication. |
| `worker.py` | Async worker loop and status updates. |
| `db.py` | Models, SQLite setup, migrations. |
| `url_validation.py` | URL and public-DNS validation. |
| `observability.py` | Request IDs, logs, readiness, metrics. |
| `adapters/` | Platform-specific resolution/download behavior. |

## Failure handling

Database state is authoritative for job lifecycle. Filesystem operations use staging and compensating cleanup; a single transaction cannot span SQLite and filesystem. Reconciliation remains `[TBD — confirm with team]`.
