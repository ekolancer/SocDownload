# Plan globalstream

> Status: Planned  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-30

## Objective

Add safe single-URL and bulk-URL downloading for public, non-DRM media streams beyond existing platform adapters.

Globalstream is not a universal IDM replacement. It targets direct media, public HLS, supported extractors, and explicitly maintained provider resolvers without bypassing login, CAPTCHA, paywall, access controls, or DRM.

## Feasibility

| Stream type | Feasibility |
|---|---|
| Direct MP4/WebM | High |
| Public HLS `.m3u8` | High |
| Sites supported by yt-dlp | Medium–High |
| HTML player with explicit source | Medium |
| Signed URL requiring referer | Medium |
| Provider API such as Vidara | Provider-specific resolver required |
| JavaScript-generated token | Low without browser context |
| `blob:` browser URL | Unsupported from page URL alone |
| Login/CAPTCHA/paywall | Rejected |
| Widevine/FairPlay/PlayReady DRM | Rejected |

Expected practical coverage: 60–80% of public non-DRM streams with direct, HLS, extractor, or provider support.

## Architecture

```text
GlobalStreamDispatcher
├── DirectMediaResolver
├── HlsResolver
├── YtDlpResolver
└── ProviderResolverRegistry
    ├── VidaraResolver
    ├── FilesPayoutsResolver
    ├── VikuyResolver
    ├── UsersDriveResolver
    ├── StreamtapeResolver
    └── DoodstreamResolver
```

Existing platform adapters always run before globalstream. Globalstream handles only URLs not claimed by a dedicated adapter.

## Resolution pipeline

```text
Source page URL
→ syntax/scheme validation
→ public DNS validation
→ resolver selection
→ fresh stream resolution
→ redirect/peer/content-type validation
→ DRM/auth/CAPTCHA rejection
→ immediate bounded download
→ FFmpeg normalization
→ WebP thumbnail
→ metadata persistence
→ Vault
```

Signed stream URLs are temporary implementation details. Store the source page URL as the durable source. Retry resolves a fresh stream token instead of reusing an expired stream URL.

## Phase 1 — Safe foundation

### Scope

- [ ] Add `GlobalStreamDispatcher`.
- [ ] Add direct MP4/WebM resolver.
- [ ] Add public HLS resolver.
- [ ] Add single-URL Studio support.
- [ ] Add separate bulk TXT import.
- [ ] Add globalstream error mapping.
- [ ] Add configurable byte/time limits.
- [ ] Validate redirects and DNS at every hop.
- [ ] Validate response Content-Type.
- [ ] Clean partial files on overflow/failure.
- [ ] Keep existing adapters unchanged.

### Direct media

Accepted response types:

```text
video/mp4
video/webm
application/vnd.apple.mpegurl
application/x-mpegURL
```

Required controls:

- HTTPS only.
- No credentials in URL.
- Standard HTTPS port only.
- Public/global IP addresses only.
- Redirect validation on every hop.
- Final peer/private-network rejection.
- Content-Type verification.
- Content-Length preflight when available.
- Streaming byte counter when Content-Length is absent or untrusted.
- Configured timeout and retry policy.
- Partial-file cleanup.

### Configuration

```env
GLOBAL_STREAM_ENABLED=true
GLOBAL_STREAM_MODE=direct
GLOBAL_STREAM_MAX_BYTES=2147483648
GLOBAL_STREAM_TIMEOUT_SECONDS=30
GLOBAL_STREAM_ALLOWED_HOSTS=
```

Modes:

```text
strict       registered providers only
direct       registered providers + direct public media URLs
experimental provider/direct support + allowlisted conservative HTML discovery
```

Default mode: `direct`.

## Phase 2 — yt-dlp extractor bridge

- [ ] Run metadata-only extraction first.
- [ ] Use `--dump-single-json`.
- [ ] Use `--no-playlist`.
- [ ] Use `--skip-download` during resolution.
- [ ] Apply subprocess timeout.
- [ ] Reject extractor results requiring login/cookies unless provider policy explicitly permits them.
- [ ] Reject DRM/CAPTCHA/paywall signals.
- [ ] Validate resolved stream URLs before download.
- [ ] Normalize output using FFmpeg.
- [ ] Generate WebP thumbnail through existing media pipeline.

Do not execute arbitrary commands or headers from extractor metadata.

## Phase 3 — Provider resolvers

Each provider receives a dedicated resolver, exact host/path allowlist, mocked fixtures, stable errors, and explicit maintenance ownership.

Recommended order:

1. [ ] Extend Vidara resolver for `vidara.so`.
2. [ ] Add FilesPayouts direct/page resolver.
3. [ ] Add Vikuy player resolver.
4. [ ] Add UsersDrive resolver.
5. [ ] Add Streamtape resolver.
6. [ ] Add Doodstream resolver.

A provider resolver must define:

```text
supported hosts
supported URL patterns
page/iframe/API flow
required safe referer
stream URL lifetime
expected content types
known unsupported states
mocked fixtures/tests
```

## Phase 4 — Conservative HTML discovery

Default: disabled.

When explicitly enabled for allowlisted hosts, inspect only standard declarations:

```html
<video src="...">
<source src="...">
<meta property="og:video" content="...">
```

Supported explicit player patterns may include:

```text
JWPlayer file/source configuration
Video.js sources
HLS source URL
```

Rules:

- Never execute remote JavaScript in backend.
- Never evaluate arbitrary expressions.
- Never forward browser credentials.
- Never accept arbitrary user-supplied headers.
- Require host allowlist for experimental HTML discovery.

## Single URL workflow

User submits a URL through Studio.

```text
Known adapter detection
→ globalstream dispatcher fallback
→ resolver selection
→ metadata and stream resolution
→ queued worker download
→ Vault
```

Unknown HTML pages fail safely as:

```text
GLOBAL_UNSUPPORTED_PROVIDER
```

## Bulk URL workflow

Endpoint:

```http
POST /api/import/global-stream
```

Input: UTF-8 `.txt`, one URL per line.

```text
# Public non-DRM streams
https://example.com/video.mp4
https://example.com/master.m3u8
https://provider.example/watch/abc
```

Rules:

- One URL per line.
- Ignore blank lines.
- Ignore lines beginning with `#`.
- Reject embedded arbitrary text.
- Deduplicate while preserving order.
- Apply upload byte and URL count limits.
- Perform syntax/scheme/basic host validation during import.
- Perform network resolution only inside workers.
- Return invalid line number and reason.
- Reuse existing bulk job progress UI.

Response:

```json
{
  "total_lines": 14,
  "accepted": 8,
  "unsupported": 3,
  "duplicates": 2,
  "invalid": 1,
  "job_ids": [901, 902]
}
```

## Referer and signed URLs

Some public streams require a source-page referer.

Allowed internal metadata:

```text
source_page_url
resolved_stream_url
required_referer
expires_at
```

Rules:

- Referer may only be derived from the submitted source page.
- User TXT cannot define arbitrary headers.
- Cookies, authorization headers, and browser session data are never forwarded.
- Resolve and download occur in one worker operation.
- Retry resolves a new signed stream URL.

## Error mapping

```text
GLOBAL_UNSUPPORTED_PROVIDER
GLOBAL_MEDIA_NOT_FOUND
GLOBAL_INVALID_CONTENT_TYPE
GLOBAL_STREAM_EXPIRED
GLOBAL_REFERER_REQUIRED
GLOBAL_DRM_UNSUPPORTED
GLOBAL_AUTH_REQUIRED
GLOBAL_CAPTCHA_REQUIRED
GLOBAL_DOWNLOAD_TOO_LARGE
GLOBAL_NETWORK_ERROR
GLOBAL_RATE_LIMITED
GLOBAL_RESOLUTION_FAILED
GLOBAL_DOWNLOAD_FAILED
```

Each error must provide:

```text
stable code
severity
retryable flag
human-readable message
operator remediation
safe structured context
```

Examples:

```text
GLOBAL_STREAM_EXPIRED
User: Stream link expired. Retry to resolve a fresh link.
Operator: Re-run provider resolution; do not reuse cached stream URL.

GLOBAL_DRM_UNSUPPORTED
User: This stream uses DRM and cannot be downloaded.
Operator: Stop processing; do not attempt circumvention.
```

## Security requirements

Reject all private/local destinations:

```text
localhost
127.0.0.0/8
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
169.254.0.0/16
169.254.169.254
file://
ftp://
```

Mandatory protections:

- SSRF validation before every connection.
- Redirect revalidation.
- Connection-time peer/private-IP checks where transport permits.
- No arbitrary headers from users.
- No credential/cookie forwarding.
- Content-Type validation.
- Byte limits for individual files and jobs.
- Disk free-space threshold.
- Timeout and bounded retries.
- Cleanup partial files.
- Redact signed query tokens from logs/Matrix Console.
- Reject DRM, CAPTCHA, login, and paywall workflows.

## Media processing

Successful globalstream downloads use the existing media pipeline:

```text
classify image/video/audio
→ FFprobe
→ normalize/remux MP4
→ +faststart
→ generate WebP thumbnail
→ persist metadata
→ serve thumbnail-only grid
→ play original only in lightbox
```

Audio remains excluded from visual frontend cards.

## Tests

### Unit

- [ ] Direct MP4 detection.
- [ ] Direct WebM detection.
- [ ] HLS detection.
- [ ] Invalid content-type rejection.
- [ ] Redirect to private IP rejection.
- [ ] DNS/private-address rejection.
- [ ] Byte overflow cleanup.
- [ ] Timeout mapping.
- [ ] DRM/auth/CAPTCHA mapping.
- [ ] Signed URL expiry handling.
- [ ] Referer derivation safety.
- [ ] Resolver ordering.

### Bulk import

- [ ] Valid one-URL-per-line TXT.
- [ ] Blank/comment lines.
- [ ] Duplicate lines.
- [ ] Invalid scheme.
- [ ] Private/local host rejection.
- [ ] Embedded text rejection.
- [ ] Upload/count limits.
- [ ] Mixed valid/invalid line reporting.
- [ ] Job ID/progress integration.

### Integration

- [ ] Mock direct MP4 download.
- [ ] Mock HLS normalization.
- [ ] Mock yt-dlp metadata resolution.
- [ ] Mock provider page/API flow.
- [ ] Verify partial-file cleanup.
- [ ] Verify thumbnail generation.
- [ ] Verify existing adapters remain first priority.
- [ ] Verify worker retry resolves fresh stream.

## Operational requirements

Matrix Console events should include:

```text
source=globalstream
provider
resolver
download type
content type
bytes downloaded
elapsed time
error code
retryable
request/job ID
```

Never log:

```text
signed query token
cookies
authorization headers
session content
passwords
```

## Acceptance criteria

- [ ] Single direct MP4/WebM URL succeeds.
- [ ] Single public HLS URL succeeds.
- [ ] Bulk TXT import reuses existing job progress.
- [ ] Unknown HTML page fails as unsupported provider.
- [ ] No connection to private/local IP succeeds.
- [ ] Every redirect is revalidated.
- [ ] Content-Type mismatch is rejected.
- [ ] Byte cap aborts and cleans partial file.
- [ ] DRM/auth/CAPTCHA are rejected without bypass attempts.
- [ ] Signed streams are freshly resolved on retry.
- [ ] Existing dedicated adapters remain unchanged and higher priority.
- [ ] Audio remains hidden from visual frontend.
- [ ] FFmpeg normalization and WebP thumbnails remain active.
- [ ] Provider failures cannot create retry loops.
- [ ] Backend tests, lint, typecheck, build, and diff-check pass.

## Risks

1. Generic URL ingestion significantly expands the SSRF boundary.
2. Upstream Content-Length may be absent or false.
3. Provider HTML/API contracts can change without notice.
4. Signed URLs can expire during queue delay.
5. Generic HTML can contain malicious or misleading source declarations.
6. Provider-specific resolvers require ongoing maintenance.
7. Public availability does not automatically grant download rights.
8. Backend-only resolution cannot reproduce every browser runtime flow.

## Recommended delivery sequence

```text
Phase 1 safe direct/HLS foundation
→ validate security and cleanup
→ Phase 2 yt-dlp bridge
→ validate subprocess and metadata
→ Phase 3 one provider per change
→ validate fixtures/live public samples
→ Phase 4 experimental HTML allowlist
```

## Final position

Globalstream is viable for public non-DRM direct media, HLS, yt-dlp-supported sites, and maintained provider resolvers. It should not claim universal IDM parity from page URLs alone. Safe direct resolution plus a provider registry is the correct architecture.
