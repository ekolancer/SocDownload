# Deployment Guide

> Document Type: Deployment Guide  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-27  
> Related: [HLD](../02-architecture/HLD.md), [SOP](sop.md)

## Local

Windows: `run-local.ps1`  
Unix-like: `./run-local.sh`

The launchers create data/media/log directories, prepare `.env`, initialize SQLite, and start backend/frontend on loopback ports 8000/3000.

## Manual development

```bash
python -m venv .venv
python -m pip install -e ".[engines,test]"
python -m backend.init_db
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

```bash
cd frontend
npm ci
npm run dev
```

## Production

No Dockerfile, reverse-proxy configuration, process manager configuration, TLS configuration, or production topology exists in the repository. Ubuntu/Nginx deployment is `[TBD — confirm with team]`; do not infer production readiness from local scripts.

Before exposure: configure strong secrets, rotate cookie/session material, add TLS, restrict network access, define backups, and test recovery.
