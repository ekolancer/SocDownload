# Operations SOP

> Document Type: Operations SOP  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-27  
> Related: [Deployment](deployment.md), [API](api.md)

## Daily operation

- Check `/api/health` and `/api/health/ready`.
- Inspect active jobs and failed jobs.
- Check `logs/backend.log` and `logs/backend-error.log` for actionable errors.
- Confirm database and media backups according to `[TBD — confirm with team]` retention policy.

## Incident response

1. Stop launcher.
2. Preserve logs and database backup.
3. Record job ID, request ID, timestamp, and platform.
4. Restart only after identifying configuration or dependency cause.
5. Reconcile failed jobs and orphan files.

Never print or share `.env`, cookie files, or session files.
