# API Documentation

> Document Type: API Documentation  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-09-24  
> Related Documents: [SRS](../01-requirements/SRS.md), [HLD](../02-architecture/HLD.md), [User Guide](user-guide.md)

Backend default URL: `http://127.0.0.1:8000`; API prefix: `/api`.

## Authentication

Protected API routes require `Authorization: Bearer <API_TOKEN>` or valid session cookie. `GET /api/health`, `/api/auth/*`, `OPTIONS`, and non-API paths are middleware exceptions.

## Route groups

| Source router | Prefix | Evidence |
|---|---|---|
| `health.py` | `/api/health`, readiness/metrics routes | health router |
| `jobs.py` | `/api/jobs` | create, list, stats, cancel, delete, detail |
| `media.py` | `/api/media` | list, count, storage, files, thumbnails, favorite, delete/export |
| `albums.py` | `/api/albums` | album operations |
| `importer.py` | `/api` import routes | archive import |
| `autosync.py` | `/api` autosync routes | configuration/trigger |
| `adapters.py` | `/api` adapter routes | adapter status |
| `auth.py`, `settings.py`, `console.py` | `/api` | auth/settings/operations |

## Example

```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=example"}' \
  http://127.0.0.1:8000/api/jobs
```

Exact request models, limits, and response fields are route source. Validation errors are mapped by FastAPI handlers; unauthorized requests return `401`.
