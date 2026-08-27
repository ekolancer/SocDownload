# API Documentation

> Document Type: API Documentation  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-27  
> Related: [SRS](../01-requirements/SRS.md), [HLD](../02-architecture/HLD.md)

Base URL: `http://127.0.0.1:8000/api`

## Authentication

Protected endpoints require `Authorization: Bearer <API_TOKEN>`. `GET /health` and `OPTIONS` are exceptions.

## Endpoint groups

| Router | Prefix/purpose |
|---|---|
| `health.py` | `GET /health`, readiness, metrics. |
| `jobs.py` | Create/list/status/cancel/delete jobs. |
| `media.py` | List/files/favorites/delete/albums/export. |
| `albums.py` | Album CRUD and membership. |
| `importer.py` | JSON/HTML/TXT archive import. |
| `autosync.py` | Instagram autosync config/trigger. |
| `adapters.py` | Adapter status. |

## Example

```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=example"}' \
  http://127.0.0.1:8000/api/jobs
```

Responses use JSON. Invalid input returns `422`; missing/invalid token returns `401`; internal failures use stable public messages where implemented. Exact request models are defined in route modules.
