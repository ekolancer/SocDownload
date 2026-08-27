# Business Requirements Document

> Document Type: BRD  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-27  
> Related: [SRS](SRS.md), [Use Cases](use-cases.md)

## Purpose

Provide a local application to download, archive, manage, and export personal social-media media. This purpose is evidenced by project metadata and implemented routes; business stakeholders and success metrics remain `[TBD — confirm with team]`.

## Scope

### In scope

- Submit media URLs for background download.
- View jobs and media vault.
- Manage favorites, albums, and exports.
- Import archive data.
- Configure Instagram saved-post autosync.
- Check adapter and service health.

### Out of scope or conditional

- Multi-user authorization: `[TBD — confirm with team]`.
- Facebook adapter is registered disabled.
- Production deployment/container topology: `[TBD — confirm with team]`.
- Liked-post sync is not supported by current contract.

## Stakeholders

`[TBD — confirm with team]`.

## Business risks

- Download jobs require reliable recovery.
- Cookies/session files contain account access material.
- External platform behavior changes independently.

## Traceability

| Business need | SRS | Use case |
|---|---|---|
| Download media | FR-001 | UC-001 |
| Manage vault | FR-002 | UC-002 |
| Import/export | FR-003 | UC-003 |
| Autosync | FR-004 | UC-004 |
