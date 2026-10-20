# Panduan Deployment

> **Document Type:** Deployment Guide<br>
> **Status:** Draft — only repository-defined setups documented<br>
> **Owner:** [TBD — confirm with team]<br>
> **Last Updated:** 2026-10-19<br>
> **Related Documents:** [HLD](../02-architecture/HLD.md), [API integration](../02-architecture/api-integration.md), [SOP](./sop.md), [README](../../README.md)

## 1. Environment yang tersedia

| Mode | Setup yang ditemukan | Status |
|---|---|---|
| Local development | `run-local.sh`: backend Uvicorn dan frontend Next.js dev server. | Didokumentasikan oleh repo; Windows-native PowerShell launch script tidak ditemukan. |
| Docker Compose | Backend dan frontend container, volume lokal, secret files, external tunnel network. | Didokumentasikan konfigurasi; run belum diverifikasi. |
| Production host | Tidak ada environment/server/CI topology lengkap di repo. | **[TBD — confirm with team]**; jangan asumsikan Ubuntu/Nginx atau proxy tertentu. |

## 2. Local development

### Prasyarat

- Python dalam rentang `>=3.11,<3.15`; script membuat `.venv` jika belum ada.
- Node.js 22 dan npm tersedia untuk frontend. Pastikan `frontend/package-lock.json` ada untuk `npm ci`.
- `ffmpeg` diperlukan untuk jalur normalisasi/probe tertentu; engine pihak ketiga bergantung fitur yang dipakai.
- Konfigurasi autentikasi valid dan direktori data/media dapat ditulis.

### Langkah

1. Salin `.env.example` ke `.env`; isi nilai secret lokal yang kuat. Jangan commit kedua file berisi rahasia.
2. Pasang dependency backend sesuai `pyproject.toml`, termasuk `.[engines]` bila memerlukan adapter optional.
3. Masuk ke `frontend` dan jalankan `npm ci` bila dependency belum tersedia.
4. Jalankan `bash run-local.sh`; script membuat virtual environment, memasang kebutuhan yang hilang, menginisialisasi DB, dan menjalankan backend `127.0.0.1:8000` serta frontend `127.0.0.1:3000`.
5. Buka frontend di `http://127.0.0.1:3000`; readiness lokal API dapat diperiksa di `http://127.0.0.1:8000/api/health/ready` setelah autentikasi atau gunakan health endpoint dasar.
6. Tekan `Ctrl+C` untuk menghentikan layanan. Script menulis log ke `logs/backend.log` dan `logs/frontend.log`.

Script yang tersedia adalah `run-local.sh`; versi PowerShell tidak ditemukan. Script menginisialisasi DB, memeriksa port 8000/3000, memulai backend/frontend, menunggu health, dan memiliki cleanup handler. Hati-hati: saat port sudah dipakai, script mencoba menghentikan proses yang mendengarkannya. Untuk Windows perlu Bash yang tersedia atau prosedur manual sesuai stack.

## 3. Docker Compose

### Konfigurasi sebelum start

1. Isi file secret bernama `api_token`, `auth_password_hash`, `auth_session_secret`, dan `vault_key` di direktori `${MEDIAVAULT_SECRETS_DIR:-./secrets}`; Compose memasangnya ke `/run/secrets:ro`. Backend perlu file `api_token` atau kedua file password hash dan session secret.
2. Siapkan data/media/config host dirs (`./data`, `./media`, `./config` default), writable oleh container sesuai kebutuhan.
3. Buat/join external Docker network bernama `${CLOUDFLARED_NETWORK:-mediavault_tunnel}` sebelum start. Service/tunnel pembuat jaringan tidak terdapat dalam konfigurasi repo ini.
4. Compose menetapkan `COOKIES_FILE=/app/config/cookies.txt` dan `INSTAGRAM_SESSION_FILE=/app/config/instagram-session`; pengaturan DB/UI dapat menyimpan path lain dan beberapa adapter membaca path dari DB/config fallback.
5. Tinjau `.env.compose.example` untuk direktori data/media/config/secrets, DNS opsional, dan nama network. Pastikan container dapat membaca file secret. Backend perlu file `api_token` atau kedua file `auth_password_hash` dan `auth_session_secret`; secret names lowercase here match Compose file paths.

Perintah operasi Compose yang umum:

```bash
docker compose config
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend frontend
docker compose down
```

Tidak jalankan `docker compose down -v` tanpa memahami efek penghapusan persistent volumes; Compose ini memakai bind mounts, tetapi konfigurasi lokal dapat berbeda.

### Topologi terpasang

- Backend container berbasis `python:3.12-slim`, memasang FFmpeg dan dependency `.[engines]`, jalan sebagai user non-root `appuser`, dan listen `0.0.0.0:8000`.
- Frontend memakai build/runtime `node:22-bookworm-slim`, listen `0.0.0.0:3000`, dan di-publish ke host `3000:3000`.
- Backend hanya `expose` port 8000 pada network Compose; healthcheck memanggil `/api/health` tiap 30 detik.
- Frontend menunggu backend sehat dan memakai `BACKEND_INTERNAL_URL=http://backend:8000`.
- Database, media, config, dan secret dipasang ke container sebagai bind mounts; secret mount read-only.
- Frontend juga join external `cloudflared` network. Caddyfile lokal alternatif bind `127.0.0.1`, melayani `http://mediavault.local`, dan reverse-proxy ke `127.0.0.1:3000`. Compose tidak mendefinisikan service tunnel; public ingress/TLS/DNS policy **[TBD — confirm with team]**.

<a id="secrets-and-access"></a>
## 4. Environment dan secret

| Nama | Tujuan |
|---|---|
| `API_TOKEN` / `API_TOKEN_FILE` | Nilai token akses API atau file secret penggantinya. |
| `AUTH_PASSWORD_HASH` / `AUTH_PASSWORD_HASH_FILE` | Password hash untuk login vault. |
| `AUTH_SESSION_SECRET` / `AUTH_SESSION_SECRET_FILE` | Signing key untuk session cookie. |
| `VAULT_KEY` / `VAULT_KEY_FILE` | Key yang dipakai fungsi terkait vault. |
| `DATABASE_URL` | SQLAlchemy DB URL; default SQLite. |
| `MEDIA_ROOT` | Root media file. |
| `COOKIES_FILE` | Optional cookies file bagi adapter yang menggunakannya. |
| `INSTAGRAM_SESSION_FILE`, `INSTAGRAM_USERNAME` | Lokasi/identitas session Instagram. |
| `FFMPEG_PATH`, `FFPROBE_PATH` | Lokasi executables media. |
| `BACKEND_INTERNAL_URL` | Backend target pada Next proxy. |
| `MEDIAVAULT_DATA_DIR`, `MEDIAVAULT_MEDIA_DIR`, `MEDIAVAULT_CONFIG_DIR`, `MEDIAVAULT_SECRETS_DIR` | Host paths untuk Compose mounts. |
| `MEDIAVAULT_DNS_PRIMARY`, `MEDIAVAULT_DNS_SECONDARY`, `CLOUDFLARED_NETWORK` | Override optional DNS/network Compose. |

Gunakan `.env.example`/`.env.compose.example` untuk daftar aktual. Jangan menaruh secret nyata di panduan, tiket, screenshot, atau Git. Compose memuat secret dari files, berbeda dari nilai environment lokal; ikuti cara deploy yang dipakai tim.

## 5. Production readiness

Repo tidak menetapkan domain, TLS terminator, firewall, backup/restore, retention, log rotation, CI/CD, rolling deployment, recovery objective, maupun owner/on-call. Tetapkan dan verifikasi hal-hal ini sebelum expose service ke internet. Image production frontend/backend berjalan sebagai non-root; ini tidak menggantikan review konfigurasi jaringan dan credential.

## 6. Verification and rollback

- Verify: `docker compose ps`; health check container; UI; authenticated login; submit test URL yang diizinkan; verify job status, media, logs and disk path.
- Local smoke check: `GET /api/health`, `GET /api/health/ready`, authenticated request to protected API.
- Roll back an image/config change by restoring previous known-good image/config and restarting affected services. Specific release artifacts, DB migration rollback, and recovery procedure are **[TBD — confirm with team]**.
- Preserve database/media before recovery. Do not delete `data/` or `media/` as troubleshooting without an approved backup/restore plan.

See [SOP operasi lokal](./sop.md) for safe startup checks. Release deployment checklist needs team confirmation.
