# Download Fix Plan

## Context

Instagram public download currently fails in two layers:

1. Instagram returns `401 Unauthorized` with `Please wait a few minutes before you try again.`
2. gallery-dl fallback receives a dictionary as `DownloadJob` parent and raises `'dict' object has no attribute 'extractor'`.

Cookies from the user's own authenticated browser session will be supplied. Cookies remain optional for platforms that allow public extraction.

## Goals

- Make gallery-dl downloads work with current gallery-dl API.
- Apply destination and cookies through gallery-dl configuration, not `DownloadJob` positional arguments.
- Reuse one gallery-dl helper across adapters.
- Try gallery-dl before Instaloader for Instagram public URLs.
- Avoid repeated Instaloader retries after Instagram returns rate-limit/authentication errors.
- Return concise, actionable job errors without hiding backend tracebacks.
- Preserve existing media organization, metadata, deduplication, and job flow.

## Changes

### 1. Gallery-dl helper

Add `gdl_download(url, dest_dir)` in `backend/app/engines.py`.

- Create a temporary gallery-dl configuration scope with `gallery_dl.config.apply`.
- Set `base-directory` to `dest_dir`.
- Set `directory` to an empty list so downloaded files land directly in the temporary directory.
- Set `cookies` when configured file exists.
- Run `gallery_dl.job.DownloadJob(url)` with no dictionary parent argument.
- Raise a clear error when gallery-dl reports failure or downloads no file.
- Return downloaded file paths.

### 2. Adapter migration

Replace incorrect `DownloadJob(url, config_dict)` usage in:

- Instagram
- Threads
- X
- Reddit
- Pinterest

All adapters use shared helper. This prevents future gallery-dl API drift across platform modules.

### 3. Instagram extraction order

- Try gallery-dl first for public URL download and metadata resolve.
- Use Instaloader as fallback where appropriate.
- Stop relying on repeated GraphQL calls after a clear Instagram `401` rate-limit response.
- Keep authenticated Instaloader session support for future saved/private content.

### 4. Cookie validation

- Resolve `COOKIES_FILE` from `.env`.
- Use only existing regular files.
- Include cookie path state in diagnostics, never cookie values.
- Document Netscape cookie format and restart requirement.

### 5. Error classification

Use concise stable prefixes:

- `instagram_rate_limited`
- `instagram_cookies_required`
- `gallery_dl_failed`
- `no_media_found`

Keep original engine exception as chained cause for backend logs.

### 6. Verification

- Compile all backend Python files.
- Verify helper imports and adapter imports.
- Test gallery-dl configuration scope without network access.
- Run frontend build to catch cross-project regressions.
- Smoke-test public Instagram URL after cookies are configured.
- Smoke-test public Threads and X URLs because they share gallery-dl helper.
- Confirm media files and `metadata.json` reach expected platform folders.

## Operational Notes

- Instagram `401` is external platform behavior. Code cannot guarantee public extraction without valid cookies.
- Use cookies from user's own account and keep them outside Git.
- Do not repeatedly retry a URL while Instagram is rate-limiting the client.
- Rotate/re-export cookies when expired or invalidated.
- Login/saved/bookmarked content remains v2 scope.

## Completion Criteria

- No adapter passes a dictionary as `DownloadJob` parent.
- `gallery_dl.config.apply` scopes per-download configuration.
- Invalid/missing cookies produce actionable diagnostics.
- Instagram failure no longer reports gallery-dl API misuse.
- Compile and frontend build pass.

## Implementation Status

- [x] Replace dictionary `DownloadJob` parent with scoped gallery-dl configuration.
- [x] Add shared gallery-dl download and metadata helpers.
- [x] Migrate Instagram, Threads, X, Reddit, and Pinterest adapters.
- [x] Make gallery-dl primary Instagram public extractor.
- [x] Reduce Instaloader connection attempts and treat 401/403/429 as fatal.
- [x] Add stable Instagram error prefixes.
- [x] Add helper tests for destination and cookies configuration.
- [ ] Validate real Instagram URL with user-provided cookies.
- [ ] Validate real Threads and X URLs with user-provided cookies.
