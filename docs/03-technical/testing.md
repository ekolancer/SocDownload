# Pengujian dan Validasi

> **Document Type:** Testing Guide
> **Status:** Draft — test inventory taken from repository; not executed for this documentation task
> **Owner:** [TBD — confirm with team]
> **Last Updated:** 2026-10-19
> **Related Documents:** [Deployment Guide](./deployment.md), [SRS](../01-requirements/SRS.md), [HLD](../02-architecture/HLD.md), [Glossary](../glossary.md)

## Overview

Repository has Python tests under `backend/tests/` and `tests/`, plus frontend Vitest tests. Backend pytest paths are set in `pyproject.toml`; frontend scripts are in `frontend/package.json`. No CI workflow was found in `.github/workflows/`; automated remote checks therefore cannot be inferred from the repository. Coverage percentage and quality gates are not specified.

## Backend tests

Prerequisites: active project Python environment with test dependencies from the optional `test` extra. From repository root:

```bash
python -m pytest
```

Run from an already-configured development environment containing pytest and project/test dependencies.

| Test file | Main area indicated by test names/source path |
|---|---|
| `backend/tests/test_albums.py` | Album behavior. |
| `backend/tests/test_auth.py` | Password authentication/session routes. |
| `backend/tests/test_autosync.py` | Saved-item auto-sync. |
| `backend/tests/test_backend_bounds.py` | API/import/export/resource limits. |
| `backend/tests/test_download_job.py` | Job worker/download lifecycle. |
| `backend/tests/test_gallerydl_adapter.py` | Shared `gallery-dl` adapter. |
| `backend/tests/test_instagram_challenges.py` | Instagram login challenge. |
| `backend/tests/test_instagram_session.py` | Session persistence/status. |
| `backend/tests/test_job_service.py` | Enqueue/job service. |
| `backend/tests/test_matrixconsole.py` | Event console. |
| `backend/tests/test_recent_media.py` | Recent media/API filtering and unavailable files. |
| `backend/tests/test_settings_session.py` | Settings/session lifecycle. |
| `backend/tests/test_settings_upload.py` | Settings file upload. |
| `backend/tests/test_url_validation.py` | URL validation. |
| `backend/tests/test_vidara.py` | Vidara adapter. |
| `backend/tests/test_vidara_import.py` | Vidara import parsing/routes. |

## Additional Python tests

Tests outside backend package (also selected by project pytest config):

| Test file | Main area indicated by filename/tests |
|---|---|
| `tests/test_creator_pagination.py` | Creator/media pagination. |
| `tests/test_engines.py` | Download engine and media classification. |
| `tests/test_media_vault.py` | Media search/filter/export and utility behavior. |
| `tests/test_migrate_media_paths.py` | Media path migration utility. |
| `tests/test_worker_retry.py` | Retry/rollback and file organization. |

`conftest.py` provides shared pytest setup. Use isolated temporary databases/files in tests; do not use real local `data/`, `media/`, `config/uploads/`, or credentials.

## Frontend tests and checks

Run from `frontend/` after dependencies are present:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

| File / script | Scope indicated by source |
|---|---|
| `src/app/page.test.tsx` | Studio page behavior. |
| `src/components/studio/JobPipeline.test.tsx` | Download job pipeline component. |
| `src/hooks/useCreatorArchive.test.ts` | Creator archive hook. |
| `src/lib/vault-api.test.ts` | Vault API client. |
| `npm test` | Runs `vitest run`; configuration uses Vitest and jsdom. |
| `npm run typecheck` | Runs TypeScript compiler with no emit. |
| `npm run lint` | Runs ESLint across frontend. |
| `npm run build` | Production Next.js build. |

## Limits

This inventory describes tests present in the tree, not test coverage or correctness. Tests were not run while writing docs. CI workflow, release gates, required coverage threshold, performance test, external-platform integration test policy, and test owner remain **[TBD — confirm with team]**.
