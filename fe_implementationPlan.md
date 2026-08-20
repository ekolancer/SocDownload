# Frontend Implementation Plan

## Design Read

Redesign dashboard SaaS modern untuk pengguna personal, memakai bahasa dark, vibrant, dan rounded dari `design.md`, berbasis Next.js dengan komponen UI milik project.

Skill anti-slop utamanya ditujukan untuk landing page. Project ini merupakan dashboard aplikasi, sehingga prinsip visual dipakai secara kontekstual tanpa memaksakan pola landing page.

## Design Dials

- `DESIGN_VARIANCE: 6`
- `MOTION_INTENSITY: 4`
- `VISUAL_DENSITY: 5`

## Objectives

- Membuat MediaVault terlihat seperti aplikasi SaaS modern.
- Mempertahankan alur submit URL, polling job, dan media library.
- Menampilkan hasil download nyata dari folder media.
- Menyediakan loading, empty, error, running, done, dan duplicate states.
- Memastikan layout berfungsi pada desktop dan mobile.
- Mengikuti token utama dari `design.md` tanpa menyalin referensi secara verbatim.

## Scope

### Included

- Redesign halaman utama MediaVault.
- Download composer untuk URL publik.
- Job history dengan status dan detail error.
- Media library dengan preview gambar/video nyata.
- Filter media berdasarkan platform.
- Backend route aman untuk mengakses file media.
- Responsive layout dan accessibility states.
- Build dan API verification.

### Excluded

- Login dan saved/bookmarked content.
- Multi-user authentication.
- Landing page marketing.
- Perubahan besar pada job processing backend.
- Migrasi ke design-system dependency baru.

## Design System

### Color Tokens

- Primary: `#743CF3`
- Accent: `#9063F5`
- Main background: off-black, disesuaikan dari `#000000` agar tetap memiliki depth.
- Elevated surface: dark elevated surface atau white card berdasarkan kebutuhan hierarchy.
- Primary text: `#E5E7EB`
- Muted text: nilai turunan yang tetap memenuhi contrast.
- Border: nilai gelap yang konsisten dengan `#E5E5E5` reference.

Hanya satu keluarga accent digunakan pada seluruh aplikasi. Tidak menambah competing accent colors.

### Typography

- Font mengikuti Arial/system sans sesuai `design.md`.
- Heading memakai weight `700`.
- Body memakai weight `400` dan line-height sekitar `1.5-1.6`.
- Display type dibatasi agar sesuai dengan dashboard, bukan landing-page hero.

### Shape Rules

- Buttons: pill radius.
- Cards and panels: `18px` radius.
- Inputs: satu radius konsisten yang lebih kecil dari card.
- Tidak memakai radius satu kali yang tidak masuk vocabulary.

### Spacing

Gunakan scale dari `design.md`:

```text
8, 12, 16, 20, 24, 28, 32, 36, 40, 60
```

## Information Architecture

### Desktop

- Compact application header.
- Sidebar untuk navigation dan platform filters.
- Main workspace untuk download composer, status ringkas, media library, dan job history.
- Media library menjadi fokus utama.

### Mobile

- Single-column layout.
- Sidebar berubah menjadi horizontal filter toolbar atau compact menu.
- Composer tetap berada dekat bagian atas.
- Media grid collapse menjadi satu atau dua kolom sesuai viewport.
- Job rows tidak memaksa horizontal overflow.

## Implementation Phases

### Phase 1: Frontend Audit

Files:

- `frontend/app/page.tsx`
- `frontend/app/layout.tsx`
- `frontend/package.json`
- `frontend/next.config.mjs`

Tasks:

- Validasi contract `/api/health`.
- Validasi contract `/api/jobs`.
- Validasi contract `/api/media`.
- Pertahankan submit URL dan polling existing.
- Identifikasi generated CSS setup dan kebutuhan `globals.css`.
- Pastikan dependency yang dipakai memang tersedia.

### Phase 2: SaaS Application Shell

Tasks:

- Buat compact header maksimal 72px.
- Tampilkan MediaVault sebagai brand signal utama.
- Tampilkan backend status sebagai semantic state, bukan decorative dot.
- Buat sidebar/filter area pada desktop.
- Buat responsive mobile toolbar.
- Gunakan max-width dan grid constraints yang stabil.

### Phase 3: Download Composer

Tasks:

- Tambahkan label jelas di atas URL input.
- Gunakan placeholder hanya sebagai contoh format URL.
- Tambahkan platform detection berdasarkan hostname.
- Gunakan primary pill button dengan `#743CF3`.
- Tambahkan loading state saat enqueue.
- Tambahkan inline error state.
- Periksa `response.ok` sebelum membersihkan input.
- Pertahankan keyboard submit melalui Enter.
- Disable submit ketika URL kosong atau request berjalan.

### Phase 4: Backend Media Serving

Target file:

- `backend/app/routes/media.py`

Tasks:

- Tambahkan endpoint untuk menyajikan file media.
- Resolve file hanya dari `MEDIA_ROOT`.
- Tolak path di luar media root untuk mencegah path traversal.
- Return proper content type.
- Tambahkan file URL dan file metadata pada response `/api/media`.
- Jangan expose absolute filesystem path ke browser.
- Pastikan missing file menghasilkan `404`.

### Phase 5: Media Library

Tasks:

- Gunakan preview gambar nyata.
- Gunakan `<video controls>` untuk file video.
- Gunakan aspect ratio stabil untuk mencegah CLS.
- Buat asymmetric grid dengan ritme visual, bukan tiga equal cards.
- Tampilkan platform, username, date, dan caption pendek.
- Tambahkan link ke source URL.
- Tambahkan open/download file action.
- Tambahkan fallback untuk unsupported media type.
- Tambahkan platform filters:
  - All
  - Instagram
  - Threads
  - X
  - TikTok
- Tambahkan loading skeleton sesuai bentuk final media tile.
- Tambahkan empty state yang menunjukkan cara mengisi library.
- Tambahkan media fetch error state.

### Phase 6: Job History

Tasks:

- Pisahkan job history dari media library.
- Tampilkan semantic states:
  - `queued`
  - `running`
  - `done`
  - `failed`
  - `dup`
- Gunakan satu accent family; status dibedakan melalui text, border, dan icon treatment.
- Potong URL panjang tanpa kehilangan full URL pada title/accessibility text.
- Tampilkan error detail melalui disclosure, bukan memenuhi row.
- Pastikan mobile layout tidak membutuhkan data table horizontal.
- Pertahankan polling tanpa request overlap.

### Phase 7: Interaction and Motion

Motion level: `4`.

Tasks:

- Tambahkan entry transition ringan pada workspace.
- Tambahkan skeleton shimmer saat loading.
- Tambahkan tactile active state pada buttons.
- Tambahkan subtle media reveal.
- Animasi hanya memakai transform dan opacity.
- Hormati `prefers-reduced-motion`.
- Jangan memakai `window.addEventListener("scroll")`.
- Jangan memakai perpetual decorative animation.

### Phase 8: Accessibility

Tasks:

- Pastikan semua inputs memiliki labels.
- Pastikan focus ring terlihat pada dark background.
- Audit contrast primary button.
- Audit placeholder, helper, muted, status, dan error text.
- Tambahkan accessible names pada icon buttons.
- Pastikan keyboard navigation mengikuti urutan visual.
- Gunakan semantic headings.
- Tambahkan alt text berdasarkan platform dan caption.
- Jangan mengandalkan warna saja untuk status.

### Phase 9: Responsive Verification

Viewports:

- Mobile: 375x812
- Tablet: 768x1024
- Desktop: 1280x800
- Wide desktop: 1536x960

Checks:

- Header tetap satu baris pada desktop.
- Tidak ada overlapping text atau controls.
- Button labels tidak wrap.
- Input dan CTA tidak keluar viewport.
- Sidebar collapse eksplisit di bawah 768px.
- Media aspect ratio tetap stabil.
- Job errors tidak merusak layout.

## State Matrix

### Backend

- Loading health check.
- Online.
- Offline.

### Download Form

- Idle.
- Invalid/empty URL.
- Submitting.
- Submitted.
- API error.
- Network error.

### Jobs

- No jobs.
- Loading.
- Queued.
- Running.
- Done.
- Failed.
- Duplicate.

### Media

- No media.
- Loading.
- Loaded image.
- Loaded video.
- Missing file.
- Unsupported type.
- Fetch error.

## API Contract Changes

Proposed media response:

```json
{
  "id": 1,
  "platform": "instagram",
  "source_url": "https://www.instagram.com/p/example/",
  "username": "creator",
  "caption": "Caption",
  "posted_at": "2026-08-17T00:00:00",
  "created_at": "2026-08-20T00:00:00",
  "files": [
    {
      "id": 1,
      "kind": "image",
      "url": "/api/media/files/1",
      "name": "example.jpg"
    }
  ]
}
```

Backend must derive URL from database file records. Browser never receives local absolute path.

## Target Files

- `frontend/app/page.tsx`
- `frontend/app/layout.tsx`
- `frontend/app/globals.css`
- `frontend/package.json` only if a justified dependency is needed
- `backend/app/routes/media.py`
- backend tests for media file access
- frontend tests if test framework exists

`design.md` remains reference-only.

## Testing Plan

### Backend

```powershell
python -m compileall -q backend tests
python -m pytest tests -q
```

Test cases:

- List media with files.
- Serve existing media file.
- Reject missing media file.
- Reject path outside media root.
- Return expected image/video content type.

### Frontend

```powershell
Set-Location frontend
npm run build
```

Manual checks:

- Submit valid public URL.
- Observe queued, running, and done states.
- Open downloaded image.
- Play downloaded video.
- Filter by platform.
- Display failed job error.
- Disconnect backend and verify offline/error state.
- Test keyboard-only flow.

## Pre-Flight Checklist

- [ ] Dark theme locked across entire application.
- [ ] Primary accent remains `#743CF3` throughout.
- [ ] Buttons use pill radius consistently.
- [ ] Cards use `18px` radius consistently.
- [ ] No pure black or pure white used as dominant page values.
- [ ] No em dash in visible UI copy.
- [ ] No fake metrics or fake media previews.
- [ ] Real downloaded assets visible in media library.
- [ ] No generic three-equal-card feature row.
- [ ] No duplicate CTA intent.
- [ ] Form labels, errors, and focus states pass contrast checks.
- [ ] Buttons meet WCAG AA contrast.
- [ ] Button labels remain one line.
- [ ] Loading, empty, error, done, and duplicate states exist.
- [ ] Desktop navigation remains one line and at most 80px high.
- [ ] Mobile collapse is explicit for every multi-column section.
- [ ] No `h-screen`; stable viewport constraints used.
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] No manual scroll listeners.
- [ ] Media paths cannot escape `MEDIA_ROOT`.
- [ ] Backend compile and tests pass.
- [ ] Frontend production build passes.

## Completion Criteria

- MediaVault presents a cohesive modern SaaS dashboard.
- Existing download workflow remains operational.
- Downloaded images and videos can be viewed from UI.
- Four target platform filters are represented.
- All key asynchronous states are visible and actionable.
- Backend media file access is constrained to configured media root.
- Desktop and mobile layouts pass visual checks.
- Backend tests and frontend build pass.
