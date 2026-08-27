# API Integration

> Document Type: API Integration  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-27  
> Related: [HLD](../02-architecture/HLD.md), [API](api.md)

## External integrations

- `yt-dlp`: metadata resolution and downloads for supported platforms.
- `gallery-dl`: media extraction/download for supported platforms.
- `Instaloader`: Instagram session-based access and saved-post autosync.
- TikTok fallback: `www.tikwm.com` API and returned media URLs.

## Controls

User URLs are validated before enqueue and worker execution. HTTP fallback URLs use public-DNS and redirect validation. Native engine transport DNS pinning is not available. Cookie/session files are local secrets and must not be committed.

External API availability, rate limits, privacy requirements, and platform terms are `[TBD — confirm with team]`.
