# User Guide

> Document Type: User Guide  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-09-24  
> Related Documents: [API](api.md), [Deployment](deployment.md), [SOP](sop.md)

## Start

1. Configure `.env` with valid authentication and storage settings.
2. Run `run-local.ps1` or `run-local.sh`.
3. Open the frontend URL emitted by launcher; backend default is `http://127.0.0.1:8000`.

## Download and vault

Submit approved HTTPS URL in Studio. Monitor jobs. Completed records appear in media list; available actions include filtering, favorites, albums, file/thumbnail preview, deletion, and export.

## Import and autosync

Use importer routes for supported archive inputs. Instagram saved-post autosync requires configured session access. Exact input limits and platform availability derive from route/settings code.

## Troubleshooting

- Startup auth error: replace placeholder token or configure password/session auth.
- Unauthorized media: verify frontend/backend auth configuration.
- Adapter failure: inspect adapter health and logs; platform availability may change.
