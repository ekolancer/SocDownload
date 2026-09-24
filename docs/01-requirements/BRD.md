# Business Requirements Document

> Document Type: BRD  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-09-24  
> Related Documents: [SRS](SRS.md), [Use Cases](use-cases.md), [HLD](../02-architecture/HLD.md)

## Purpose and scope

Code identifies MediaVault as a personal social-media downloader. Current scope: submit approved URLs, queue downloads, store media metadata/files, browse/filter/favorite/delete media, manage albums, import/export, inspect adapter health, and configure Instagram saved-post autosync.

## Actors

- Local operator: uses frontend/API.
- Scheduler: triggers periodic work.
- External platforms and download engines: supply media.

Stakeholders, business objectives, success measures, retention, SLA, and legal policy: `[TBD — confirm with team]`.

## Constraints and risks

SQLite-backed state coordinates an in-process worker queue. External platforms and engines can change. Cookies, session files, tokens, vault keys, and password/session secrets require local protection. Multi-user authorization and tenant isolation are not evidenced.

## Traceability

| Need | Requirement | Use case |
|---|---|---|
| Download | [FR-001](SRS.md#functional-requirements) | [UC-001](use-cases.md#uc-001-download-url) |
| Vault | [FR-003](SRS.md#functional-requirements) | [UC-002](use-cases.md#uc-002-manage-vault) |
| Import/export | [FR-004](SRS.md#functional-requirements) | [UC-003](use-cases.md#uc-003-importexport) |
| Autosync | [FR-005](SRS.md#functional-requirements) | [UC-004](use-cases.md#uc-004-autosync) |
