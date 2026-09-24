# Deployment Guide

> Document Type: Deployment Guide  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-09-24  
> Related Documents: [HLD](../02-architecture/HLD.md), [SOP](sop.md), [Portal](../../README.md)

## Local

Windows: `run-local.ps1`. Unix-like systems: `run-local.sh`. These scripts are repository launchers; inspect them before production use.

```bash
python -m venv .venv
python -m pip install -e ".[engines,test]"
python -m backend.init_db
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Frontend setup uses Node.js `>=20.9 <25` and scripts from `frontend/package.json`: `npm ci`, `npm run dev`, `npm run build`, and `npm run start`.

## Runtime prerequisites

Configure non-placeholder auth plus `DATABASE_URL`, `MEDIA_ROOT`, and optional engine/session settings. Default backend bind is loopback. Do not expose backend port directly without reviewed network/TLS controls.

## Production

Repository scan found no Dockerfile, reverse proxy config, process manager config, or TLS config. Ubuntu/Nginx topology, DNS, backup/restore, monitoring, and rollback: `[TBD — confirm with team]`.
