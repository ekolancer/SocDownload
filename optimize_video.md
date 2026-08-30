# Plan optimizevideo

> Plan Name: optimizevideo  
> Status: Implemented with remaining lifecycle/test limitations  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-29

## Objective

Optimize video storage and playback. Backend uses Python/FastAPI with FFmpeg. Frontend gallery renders lightweight thumbnails; video loads only in lightbox.

## Scope

### 1. FFmpeg tooling

- Detect `ffmpeg` and `ffprobe` from configured path or `PATH`.
- Add configurable executable paths and processing limits.
- Expose readiness status when required tooling is unavailable.
- Keep downloaded media even when optional thumbnail generation fails.

```env
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
THUMBNAIL_OFFSET_SECONDS=2
THUMBNAIL_WIDTH=480
THUMBNAIL_QUALITY=75
```

### 2. Video normalization

- Probe container, duration, dimensions, and codecs.
- Detect MPEG-TS content stored with `.mp4` extension.
- Remux compatible streams to MP4 with `-movflags +faststart`.
- Remux Vidara HLS output through FFmpeg instead of accepting MPEG-TS disguised as MP4.
- Transcode only when browser compatibility requires it; prefer stream copy.
- Validate output container before database commit.
- Apply subprocess timeout and output-size limits.

```bash
ffmpeg -i input -map 0 -c copy -movflags +faststart output.mp4
```

### 3. Automatic WebP thumbnails

After successful video download and normalization:

```bash
ffmpeg -ss 2 -i video.mp4 -frames:v 1 -vf "scale=480:-2" -quality 75 thumbnail.webp
```

- Use frame at second 2.
- Fall back to a proportional offset for short videos.
- Write to a temporary file, then atomically rename.
- Validate image output and clean failed temporary files.
- Store thumbnail separately from primary media files.

### 4. Database metadata

Add versioned migration fields, preferably on `media_files`:

```text
thumbnail_path
width
height
duration_seconds
video_codec
audio_codec
```

Keep thumbnails out of media-item counts, carousel counts, and normal media exports unless explicitly requested.

### 5. API

Media responses expose thumbnail and video metadata:

```json
{
  "id": 2804,
  "kind": "video",
  "url": "/media-file/2804",
  "thumbnail_url": "/media-thumbnail/2804",
  "width": 1280,
  "height": 720,
  "duration_seconds": 42.5
}
```

- Add authenticated thumbnail serving.
- Preserve path containment checks.
- Use correct MIME types.
- Use cache headers for immutable thumbnails where safe.
- Forward range requests only for user-opened video playback.

### 6. Frontend gallery

Remove direct `<video>` loading from:

- `MediaGallery`.
- Studio Recent Download cards.
- Creator cards.

Render lazy WebP thumbnails:

```tsx
<img
  src={thumbnailUrl}
  loading="lazy"
  decoding="async"
  width={480}
  height={270}
/>
```

Retain video indicator without loading video data. Add fallback placeholder when thumbnail is unavailable.

### 7. Lightbox playback

Load video only after user opens a media item:

```tsx
<video controls preload="metadata" playsInline />
```

On close:

- Pause playback.
- Clear `src`.
- Call `load()` to release buffers.
- Remove event listeners.

### 8. Existing-media backfill

Add idempotent command:

```powershell
.\.venv\Scripts\python.exe -m backend.cli generate-thumbnails
```

Supported options:

```text
--missing-only
--limit 100
--workers 2
--dry-run
```

Behavior:

- Read video records from database.
- Validate source files.
- Normalize malformed containers.
- Generate missing thumbnails.
- Update metadata transactionally.
- Skip valid existing thumbnails.
- Report processed, skipped, missing, and failed items.

### 9. Lifecycle consistency

Thumbnail files must:

- Be deleted with parent media.
- Move during media-root migration.
- Participate in filesystem reconciliation.
- Be included in backup procedures.
- Be optionally included in ZIP exports.
- Never appear as separate media cards.

### 10. Tests

Add mocked/unit/integration coverage for:

- FFmpeg and FFprobe discovery.
- Command construction.
- MPEG-TS detection.
- MP4 remux and `faststart`.
- Browser-compatible codec handling.
- Short-video thumbnail offset fallback.
- Atomic thumbnail writes.
- Thumbnail cleanup on delete.
- Thumbnail path migration.
- API thumbnail response and authorization.
- Gallery absence of direct video tags.
- Lightbox lazy video loading and cleanup.
- Idempotent backfill and dry-run behavior.
- Vidara MP4/HLS behavior.

## Implementation sequence

1. FFmpeg/FFprobe discovery and configuration.
2. Vidara output normalization.
3. Database migration for media metadata.
4. Thumbnail generation pipeline.
5. Thumbnail serving endpoint and proxy.
6. Image-only gallery and Recent Download.
7. Lightbox video lifecycle cleanup.
8. Existing-media backfill command.
9. Delete, export, migration, and reconciliation integration.
10. Tests, lint, typecheck, build, and performance validation.

## Acceptance criteria

- Vidara MPEG-TS output is not stored as invalid `.mp4`.
- Video cards request thumbnails, not video streams.
- Gallery uses lazy-loaded WebP images with intrinsic dimensions.
- Video requests occur only after lightbox activation.
- Closing lightbox releases video resources.
- Existing videos can be backfilled safely and repeatedly.
- Delete and media migration keep thumbnail paths consistent.
- Missing FFmpeg produces actionable status, not silent corruption.
- Backend tests, frontend lint, typecheck, production build, and `git diff --check` pass.

## Implementation status and validation

- Phase 1: **Implemented** — FFmpeg/FFprobe settings and discovery in `backend/app/video.py`; processing limits in `backend/app/config.py`.
- Phase 2: **Implemented** — video probing and MP4 normalization with `faststart`; Vidara HLS normalization integrated.
- Phase 3: **Implemented** — WebP thumbnail generation for images and videos, preserving originals with `.thumb.webp` output.
- Phase 4: **Implemented** — `media_files` thumbnail/video metadata migration in `backend/app/db.py`.
- Phase 5: **Implemented** — authenticated thumbnail endpoint and `/media-thumbnail/{id}` frontend proxy; API exposes thumbnail metadata.
- Phase 6: **Implemented** — gallery, Recent Download, and creator cards use lazy thumbnail images; grid no longer loads video tags.
- Phase 7: **Implemented** — lightbox remains video playback boundary and releases video source on close.
- Phase 8: **Implemented** — `python -m backend.cli generate-thumbnails` processes image/video records, reclassifies audio, supports `--missing-only`, `--limit`, and `--dry-run`; `--workers` currently accepts only `1` and rejects parallel values explicitly.
- Phase 9: **Partial** — delete cleanup is implemented; migration/reconciliation and export thumbnail policy require further integration.
- Phase 10: **Partial** — existing suite passes; dedicated FFmpeg subprocess and frontend behavior tests remain limited.

Validation performed:

```text
pytest: 28 passed, 10 warnings, 5 subtests
compileall: pass
pip check: pass
frontend lint: pass
frontend typecheck: pass
frontend production build: pass
git diff --check: pass
```

Live backfill completed with FFmpeg/FFprobe `9.0.1`. Dry-run reported 2,627 visual candidates and 59 audio reclassifications. First batch processed 100 items with zero failures. Full run processed 2,526 remaining items, skipped 101 existing thumbnails, reclassified 59 audio files, and reported zero missing/failed files. Final state: 2,527 images, 100 videos, 59 audio files; all 2,627 visual records have valid thumbnail files. SQLite `PRAGMA integrity_check` returned `ok`.

## Risks and decisions

- FFmpeg must be installed separately and licensed according to deployment policy.
- Transcoding increases CPU, storage, and processing time; remux is preferred.
- CDN/tokenized streams may expire before backfill completes.
- Thumbnail retention: thumbnails remain beside originals and participate in media backup. ZIP exports intentionally exclude thumbnails because they are regenerable presentation assets.
- Video rights and download authorization remain user responsibility.
