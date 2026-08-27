# User Guide

> Document Type: User Guide  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-27  
> Related: [API](api.md), [Deployment](deployment.md)

## Start

1. Configure root `.env` with `API_TOKEN` and `VAULT_KEY`.
2. Run `run-local.ps1` on Windows or `run-local.sh` on Unix-like systems.
3. Open `http://127.0.0.1:3000`.

## Download

Enter an approved HTTPS social-media URL in Studio and submit. Monitor active jobs; completed items appear in Vault.

## Vault

Use search/filter, pagination, preview, favorite, album actions, delete, and ZIP export. File previews require frontend proxy authentication configured by the launcher.

## Import and autosync

Use archive import for supported JSON/HTML/TXT inputs. Autosync currently targets Instagram saved posts; Instagram session setup is required for private/saved content.

## Troubleshooting

- Backend fails on startup: configure non-placeholder `API_TOKEN`.
- Media preview returns unauthorized: restart launcher so `frontend/.env.local` matches root `.env`.
- Instagram session error: clear `INSTAGRAM_SESSION_FILE` or provide a valid Instaloader session file.
