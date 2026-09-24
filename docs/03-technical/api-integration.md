# API Integration

> Document Type: API Integration  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-09-24  
> Related Documents: [HLD](../02-architecture/HLD.md), [API](api.md), [Deployment](deployment.md)

## External components

- `yt-dlp`: registered engine dependency for supported downloads.
- `gallery-dl`: registered engine dependency for supported downloads.
- `Instaloader`: Instagram session and saved-post autosync.
- HTTP adapters/fallbacks: adapter source defines target hosts; availability and terms vary.

Registered platforms are defined in `backend/app/main.py`; Facebook registration is disabled. URL validation checks approved HTTPS hosts, ports, and public DNS; redirect/fallback handling is revalidated where implemented.

Credentials/cookies/session files are local secrets. External rate limits, privacy/legal requirements, platform terms, and uptime: `[TBD — confirm with team]`.
