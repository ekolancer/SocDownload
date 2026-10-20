# System Requirement Specification (SRS)

> **Document Type:** SRS<br>
> **Status:** Draft — derived from current implementation<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [BRD](./BRD.md), [Use Cases](./use-cases.md), [Flowcharts](./flowcharts.md), [HLD](../02-architecture/HLD.md), [API reference](../03-technical/api.md), [Glossary](../glossary.md)

## 1. Introduction

### 1.1 Purpose

Describe observable MediaVault requirements and boundaries from the codebase. Requirements below document implementation, not an approved product specification.

### 1.2 Scope

The system includes a Next.js user interface, FastAPI application programming interface (API), SQLite database, local media-file storage, asynchronous download workers, scheduler, import/export, and platform adapters. See [architecture](../02-architecture/HLD.md).

### 1.3 Terms

See [glossary](../glossary.md). SQLite is an embedded relational database. A worker is a background process that handles queued download jobs.

### 1.4 Source of truth

Backend route registration and handlers, SQLAlchemy models and migrations, frontend pages and API calls, configuration, and container files in the repository. Existing graph output was used only to orient navigation; it does not supersede source code.

## 2. Overall description

### 2.1 Product perspective

Users access a browser UI. Next.js forwards API traffic to FastAPI. The backend validates and queues requests, downloads through platform adapters, persists metadata in SQLite, and writes media to the configured filesystem directory.

### 2.2 User classes

| User class | Capabilities observed |
|---|---|
| Vault user | Login, download/import URLs, organize/export media, configure settings. |
| Operator | Inspect adapter status, jobs, application events, health and metrics. |
| Maintainer | Configure secrets, run services, review logs, and maintain adapters. |

The product does not define distinct named roles or multi-user authorization in the inspected code.

### 2.3 Dependencies and constraints

- Python `>=3.11,<3.15`; container image uses Python 3.12. Frontend container uses Node 22.
- Database defaults to SQLite; media and user-provided session/config files require writable persistent storage.
- Download support depends on external platforms and installed engines, including `yt-dlp`, `gallery-dl`, and Instagram tooling.
- Production network exposure, backups, retention, scale, uptime, and legal/privacy requirements are **[TBD — confirm with team]**.

## 3. Functional requirements

| ID | System behavior | Related BR | Priority |
|---|---|---|---|
| <a id="fr-001"></a>FR-001 | Accept a submitted URL, validate/detect its platform, deduplicate matching queued/running jobs, enqueue supported work, and return job ID/status. | [BR-001](./BRD.md#br-001) | Must — implemented |
| <a id="fr-002"></a>FR-002 | Process jobs asynchronously with progress; persist successful media, identify duplicate content, classify failures, and retry retryable failures up to configured attempts. | [BR-001](./BRD.md#br-001) | Must — implemented |
| <a id="fr-003"></a>FR-003 | Import URLs from supported archive files and Vidara text files; reject unsupported, oversized, malformed, or excessive input and report skipped/queued counts. | [BR-003](./BRD.md#br-003) | Should — implemented |
| <a id="fr-004"></a>FR-004 | List, filter, search, favorite, delete, and export media; create/update/delete albums and add/remove media. | [BR-002](./BRD.md#br-002) | Must — implemented |
| <a id="fr-005"></a>FR-005 | Store user configuration and allow Instagram login/session management; optionally sync saved Instagram URLs subject to enablement, interval, and session status. | [BR-004](./BRD.md#br-004) | Should — implemented |
| <a id="fr-006"></a>FR-006 | Expose job management, adapter listing, health/readiness, event history/stream, and request/job metrics. | [BR-005](./BRD.md#br-005) | Should — implemented |
| <a id="fr-007"></a>FR-007 | Protect API routes with configured bearer token or valid password-auth session; permit health, auth and preflight exceptions as implemented. | [BR-001](./BRD.md#br-001) | Must — implemented |

### 3.1 Non-functional requirements and implementation limits

Numeric limits below are defaults in code and are configurable unless otherwise stated. They are not workload capacity or service-level guarantees.

| ID | Category | Observed implementation |
|---|---|---|
| NFR-001 | Input limits | Default upload limit 10 MiB; URL import cap 500; parser depth 32; parser URL lines 10,000; media export cap 500 items / 500 MiB; see `backend/app/config.py`. |
| NFR-002 | Concurrency | Application starts two download workers; worker concurrency is a single-process implementation detail, not a throughput promise. |
| NFR-003 | Authentication | Supports bearer token and password-derived session cookie; session cookie is HTTP-only and SameSite strict; login lockout settings are configurable. |
| NFR-004 | File safety | Media reads constrain resolved file paths to media root; missing paths return not found. |
| NFR-005 | Recoverability | On startup, the application attempts to recover in-progress jobs and schedule due work. No backup, restore, or disaster-recovery objective is defined. |
| NFR-006 | Observability | Request IDs, JSON request logs, event console, readiness, and in-process metrics are exposed. Durability/retention of events is not guaranteed by these interfaces. |
| NFR-007 | Compatibility | Declared Python range is `>=3.11,<3.15`; deployment image pins Python 3.12. Frontend build uses Node 22. |

## 4. External interfaces

- Browser frontend communicates with `/api/*` via the Next.js rewrite.
- Backend connects to social-media sites and third-party download/metadata services through adapter implementations. Specific flows and limits: [API integration](../02-architecture/api-integration.md).
- Local interfaces include SQLite, media/config files, optional FFmpeg/FFprobe, and container mounts.
- HTTP endpoint inventory: [API reference](../03-technical/api.md).

## 5. Traceability

| BR | FR | Use case | Architecture |
|---|---|---|---|
| [BR-001](./BRD.md#br-001) | FR-001, FR-002, FR-007 | [UC-001](./use-cases.md#uc-001-submit-media-url) | [HLD](../02-architecture/HLD.md), [LLD](../02-architecture/LLD.md) |
| [BR-002](./BRD.md#br-002) | FR-004 | [UC-003](./use-cases.md#uc-003-manage-vault-media) | [Vault schema](../02-architecture/database-schema.md), [API](../03-technical/api.md) |
| [BR-003](./BRD.md#br-003) | FR-003 | [UC-002](./use-cases.md#uc-002-import-url-archive) | [Import integration](../02-architecture/api-integration.md) |
| [BR-004](./BRD.md#br-004) | FR-005 | [UC-004](./use-cases.md#uc-004-sync-saved-instagram-posts) | [HLD](../02-architecture/HLD.md), [API](../03-technical/api.md) |
| [BR-005](./BRD.md#br-005) | FR-006 | [UC-005](./use-cases.md#uc-005-inspect-application-status) | [HLD](../02-architecture/HLD.md), [SOP](../03-technical/sop.md) |

## 6. Items to confirm

Formal stakeholder acceptance; requirement priority; legal/compliance constraints; target user population; supported platform policy; performance/load targets; authentication deployment policy; retention, backup, and recovery; production topology; success metrics. All are **[TBD — confirm with team]**.
