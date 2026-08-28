# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Single self-hosted user archiving personal social-media media locally or on a home server/NAS. User is comfortable with Docker and command-line workflows.

## Product Purpose

MediaVault downloads and archives personal social-media media, both from individual post URLs and from saved, liked, or bookmarked collections. Success means reliable offline access, organized metadata, duplicate avoidance, and safe local control of credentials and files.

## Positioning

Privacy-first, self-hosted personal archive spanning multiple social platforms through modular adapters. Unlike single-platform tools or public downloader services, MediaVault keeps credentials, metadata, and media under the user's local control.

## Operating Context

User pastes post URLs, imports or fetches personal saved/liked/bookmarked lists, queues downloads, monitors progress, reviews history, and browses the local media vault. Deployment targets include local machines, home servers, and NAS devices.

## Capabilities and Constraints

- Single-URL download with automatic platform detection.
- Bulk import or sync for saved, liked, and bookmarked media where supported.
- Metadata storage including caption, username, date, source URL, and hashtags.
- Automatic organization by platform, username, and date.
- Download history, duplicate detection, queue, progress, retries, rate limiting, and adapter health checks.
- Modular platform adapters; Tier 1 platforms precede Tier 2. Tier 3 platforms remain undecided.
- Credentials and sessions encrypted at rest; no external analytics or telemetry.
- SQLite database, local filesystem storage, asynchronous download processing.
- Personal-use archive only; respect platform terms, creator rights, and download restrictions.
- No DRM circumvention or public multi-tenant service.

## Brand Commitments

Product name: MediaVault. Voice and visual direction remain open for future design work.

## Evidence on Hand

- Product requirements: `PRD_MediaVault_Personal_Downloader.md`.
- Existing frontend: Next.js application in `frontend/`.
- Existing backend and tests in `backend/`.
- Existing local SQLite database: `data/mediavault.db`.
- No testimonials, customer claims, public deployment claims, or external proof assets confirmed; do not fabricate them.

## Product Principles

- Keep personal data under user control.
- Prefer reliable, maintainable adapters over fragile broad coverage.
- Make archive state visible and recoverable.
- Reduce duplicate work and unnecessary platform traffic.
- Preserve source metadata with every archived asset.

## Accessibility & Inclusion

No product-specific accessibility requirement confirmed. Preserve standard web accessibility: keyboard access, semantic controls, readable contrast, visible focus, and non-color status communication.
