# Operations SOP

> Document Type: Operations SOP  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-09-24  
> Related Documents: [Deployment](deployment.md), [API](api.md), [LLD](../02-architecture/LLD.md)

## Routine checks

1. Check `GET /api/health` and readiness route.
2. Review active/failed jobs through API or console.
3. Inspect application logs without exposing credentials.
4. Verify database/media backup according to policy `[TBD — confirm with team]`.
5. Check adapter health after dependency/platform changes.

## Incident steps

1. Stop launcher/workers.
2. Preserve logs, request ID, job ID, timestamp, and platform.
3. Back up database before repair.
4. Identify configuration/dependency cause.
5. Restart and verify health, queue, vault, and file access.
6. Reconcile failed jobs/orphan files using an approved procedure `[TBD — confirm with team]`.

Never print/share `.env`, `secrets/`, cookie, session, or vault-key material.
