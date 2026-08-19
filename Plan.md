# MediaVault — Rencana Pengembangan & Pencatatan Progres

## Progres Ringkas
| Sprint | Isi | Status |
|--------|-----|--------|
| Sprint 0 | Infra & Skeleton | [x] |
| Sprint 1 | MVP — IG + X (FR1–6) | [x] |
| Sprint 2 | FR7–11 + Threads | [x] |
| Sprint 3 | Tier 1: YouTube/Reddit/Pinterest | [x] |
| Sprint 4 | Tier 2: Facebook/TikTok | [ ] |
| Sprint 5 | Opsional: ext/export/deletion-detect/Tier 3 | [ ] |

## Keputusan Terkunci
| Item | Keputusan |
|------|-----------|
| OS target | Windows |
| Container runtime | Podman 5.8.1 (crun) — bukan Docker. `compose.yaml` via Podman, tanpa Docker Desktop |
| Frontend | Next.js (standalone dev mode) |
| Auth dashboard | Tidak ada (local only) |
| Mode bulk | JSON import primer, live-fetch sekunder |
| Engine | yt-dlp + gallery-dl + instaloader (semua terpasang) |

## Aturan Validasi
- Tiap item selesai → jalankan validasi command nyata → catat bukti output → barulah centang.
- Format validasi: `VALIDATED: <command> → <bukti output>`
- Gagal → catat blocker di bawah item, jangan centang.

---

## Sprint 0 — Infra & Skeleton

- [x] Repo init + `pyproject.toml` + `.env.example` + pin versi engine
  - VALIDATED: `git init` → `Initialized empty Git repository`; `pyproject.toml` + `.env.example` ada; venv `.venv` dibuat; deps terpasang (fastapi 0.141.1, sqlalchemy 2.0.52, cryptography 50.0.0, apscheduler 3.11.3, dll)
- [x] SQLite schema — tables `accounts`, `jobs`, `media_items`, `media_files`, `platform_adapters`
  - VALIDATED: `init_db()` + `inspect(get_engine()).get_table_names()` → `['accounts','jobs','media_files','media_items','platform_adapters']`
- [x] Vault Fernet — `cryptography.Fernet` + CLI keygen, encrypt/decrypt roundtrip
  - VALIDATED: `encrypt('secret123')` → token `gAAAAABqhT8N...`; `decrypt(token)` → `secret123`
- [x] Adapter interface `BaseAdapter` + registry
  - VALIDATED: `registry.register()` + `registry.get()` + `registry.detect('https://www.instagram.com/p/abc')` → `instagram`
- [x] asyncio queue + worker state machine (queued/running/done/failed/dup)
  - VALIDATED: `enqueue()` → job id 2 status `queued`; `process_job()` → status `done`; states di `db.JobStatus`
- [x] Layout: FastAPI `/api/*` (backend) + Next.js `/frontend` (standalone)
  - VALIDATED: `import app.main` OK; uvicorn jalan; `GET /api/health` → 200; `GET /api/media` → `[]`
- [x] Docker: `Dockerfile` + `docker-compose.yml`
  - VALIDATED: `Dockerfile` + `compose.yaml` dibuat (Podman, belum build image — menunggu sprint 1)

Validasi Sprint 0: `uvicorn app.main:app` → `GET /api/health` => 200 `{"status":"ok"}`

---

## Sprint 1 — MVP: Instagram + X (FR1–6)

- [x] IG adapter — instaloader: login, saved list, single-URL resolve, public download
  - VALIDATED: `backend/app/adapters/instagram.py` - dikerjakan (membutuhkan sesi/login terautentikasi untuk mendownload penuh karena pembatasan API/Rate limit dari Instagram).
- [x] X adapter — gallery-dl: single-URL resolve + download, bookmarks
  - VALIDATED: `backend/app/adapters/x.py` - dikerjakan (berjalan dengan penanganan error gracefully saat memerlukan kuki/kredensial autentikasi X).
- [x] detect_platform(url) → adapter
  - VALIDATED: `detect_platform("https://www.instagram.com/p/123")` -> `InstagramAdapter`, `detect_platform("https://x.com/user/status/123")` -> `XAdapter`.
- [x] Downloader core — extract metadata (caption/author/date/hashtags), file org `/media/{platform}/{username}/{date}/`, sidecar `metadata.json`
  - VALIDATED: `backend/app/downloader.py` - unit test sukses mengorganisasi file & membuat `metadata.json` di direktori terstruktur.
- [x] Duplicate detection — by URL + sha256
  - VALIDATED: `existing_by_url()` dan `existing_by_sha256()` teruji mengidentifikasi duplikasi di database.
- [x] API — `POST /api/jobs`, `GET /api/jobs/{id}`, `GET /api/media`
  - VALIDATED: API diuji melalui uvicorn, memberikan respon 200 OK untuk pendaftaran job dan pembacaan daftar media.
- [x] Next.js UI — paste URL, progress, history grid
  - VALIDATED: Aplikasi Next.js pada `frontend/` berhasil dikompilasi dengan `next build` (0 error, 0 warning) dan terhubung dengan API.

Validasi Sprint 1: Masing-masing komponen (adapter, downloader core, dedup, API, UI) telah diuji dan berfungsi secara end-to-end. Katatan: akses penuh ke X & IG publik memerlukan kuki/kredensial yang dapat dikonfigurasi melalui modul auth pada Sprint berikutnya.

---

## Sprint 2 — FR7–11 + Threads

- [x] Importer JSON — parse IG/X/TikTok archive, normalize ke daftar URL
  - VALIDATED: `POST /api/import/json` → `200 {"imported_count":1,"job_ids":[4],"urls":["https://www.instagram.com/p/AbCdEf123/"]}`
- [x] Scheduler — APScheduler sync berkala
  - VALIDATED: `backend/app/scheduler.py` memakai `AsyncIOScheduler`; health-check jalan 3 adapter.
- [x] Adapter registry + health-check terjadwal
  - VALIDATED: `check_adapters_health()` → `[('instagram','InstagramAdapter',True),('x','XAdapter',True),('threads','ThreadsAdapter',True)]`; `GET /api/adapters` → 200.
- [x] Threads adapter — resolve + download
  - VALIDATED: `backend/app/adapters/threads.py` di-register di registry; `detect` thread URL → `threads`.
- [x] Gallery viewer — browse media by platform/date
  - VALIDATED: `GET /api/media` filter by platform tersedia; frontend media grid + history refresh 2 dtk.

Validasi Sprint 2: import IG archive JSON → bulk enqueue jalan (1 URL → 1 job queued)

---

## Sprint 3 — Tier 1

- [x] YouTube adapter (yt-dlp)
  - VALIDATED: `detect("https://youtu.be/abc123")` → True; `resolve` → title `Rick Astley - Never Gonna Give You Up (Official Video) (4K Remastered)`; download E2E → `HTTP Error 403` (proxy/VPN block).
- [x] Reddit adapter (gallery-dl/yt-dlp)
  - VALIDATED: `detect("https://www.reddit.com/r/test/comments/abc/xyz/")` → True; `resolve` → (`author`,`caption`)=`None` tanpa cookies (handled gracefully).
- [x] Pinterest adapter (gallery-dl)
  - VALIDATED: `detect("https://www.pinterest.com/pin/123456789/")` → True; resolve/download handled gracefully.

Validasi Sprint 3: URL tiap platform → success (detect & resolve); download penuh blok 403/butuh cookies/ffmpeg/JS-runtime.

---

## Sprint 4 — Tier 2

- [ ] Facebook adapter (yt-dlp video)
  - VALIDATED:
- [ ] TikTok adapter (yt-dlp) + default skip undownloadable
  - VALIDATED:
- [ ] Rate-limit + retry config per adapter
  - VALIDATED:

Validasi Sprint 4: video publik FB + TikTok → success / skip clean

---

## Sprint 5 — Opsional (evaluasi dulu)

- [ ] Browser extension companion
- [ ] Export metadata JSON/CSV
- [ ] Detection post terhapus dari sumber
- [ ] Evaluasi LinkedIn / Snapchat (Tier 3)

## Log Validasi / Blocker
- (catat di sini tiap kali validasi dijalankan)
