# MediaVault Documentation Portal

> Document Type: Portal  
> Status: Draft  
> Owner: [TBD — confirm with team]  
> Last Updated: 2026-08-28

MediaVault is a self-hosted media downloader and vault. This portal maps current source code to requirements, architecture, operations, and API references.

Vidara support: public `https://vidara.to/v/{id}` URLs resolve through validated `kitchenstories.ink/e/{id}` embeds and `/api/stream`; direct MP4 downloads are byte-capped, while HLS requires an existing `yt-dlp` executable. DRM and missing streams fail clearly. No login or cookies used.

## Start here

1. [Glossary](docs/glossary.md)
2. [Requirements index](docs/01-requirements/README.md)
3. [Architecture index](docs/02-architecture/README.md)
4. [Technical index](docs/03-technical/README.md)

## Source-of-truth notes

Documentation reconstructed from `backend/`, `frontend/`, `pyproject.toml`, `frontend/package.json`, `.env.example`, migrations in `backend/app/db.py`, CI, and launch scripts. Business goals, stakeholders, retention, and production topology are `[TBD — confirm with team]`.

## Local setup

### Requirements

- Python 3.11–3.14
- Node.js 20.9–24
- npm
- Git

### Windows

PowerShell dari root project:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\run-local.ps1
```

Launcher membuat `.env`, menghasilkan `API_TOKEN` dan `VAULT_KEY`, membuat virtual environment, memasang backend/frontend dependencies, menginisialisasi database, lalu menjalankan backend di `http://127.0.0.1:8000` dan frontend di `http://127.0.0.1:3000`.

### Linux/macOS

```bash
chmod +x run-local.sh
./run-local.sh
```

Untuk install ulang dependencies:

```bash
./run-local.sh --install
```

### Manual local setup

```bash
python -m venv .venv
.venv\\Scripts\\activate
python -m pip install -e ".[engines,test]"
python -m backend.init_db
```

Windows:

```powershell
.\\.venv\\Scripts\\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Linux/macOS:

```bash
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Terminal kedua:

```bash
cd frontend
npm ci
npm run dev
```

Jika `.env` sudah ada, pastikan `API_TOKEN` bukan placeholder. Launcher menyinkronkan token backend ke `frontend/.env.local`; restart launcher setelah token berubah. Jangan commit `.env`, `frontend/.env.local`, cookie, atau session files.

### Local adapter setup

#### 1. Configure base environment

Edit `.env` di root project:

```env
API_TOKEN=<strong-random-token>
VAULT_KEY=<valid-Fernet-key>
COOKIES_FILE=config/cookies.txt
INSTAGRAM_SESSION_FILE=
INSTAGRAM_USERNAME=
```

Generate values when needed:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
.\.venv\Scripts\python.exe -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Linux/macOS:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
.venv/bin/python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Do not paste secrets into Git, chat, or logs. Keep cookie/session files under `config/`; these paths are ignored by Git.

#### 1.1 Configure password authentication

MediaVault supports single-user password authentication through a signed `HttpOnly` session cookie. Password authentication protects the API and dashboard without storing the original password. The application stores only a PBKDF2-HMAC password hash; `AUTH_SESSION_SECRET` signs session cookies and must remain private.

Generate `AUTH_PASSWORD_HASH` using a password you choose. The command prompts for the password, so the password is not exposed in shell history:

Linux/macOS:

```bash
.venv/bin/python -c 'import base64,hashlib,secrets; p=input("Password: ").encode(); s=secrets.token_urlsafe(16); h=hashlib.pbkdf2_hmac("sha256",p,s.encode(),310000); print(f"pbkdf2_sha256$310000${s}${base64.urlsafe_b64encode(h).decode()}")'
```

Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -c 'import base64,hashlib,secrets; p=input("Password: ").encode(); s=secrets.token_urlsafe(16); h=hashlib.pbkdf2_hmac("sha256",p,s.encode(),310000); print(f"pbkdf2_sha256$310000${s}${base64.urlsafe_b64encode(h).decode()}")'
```

Generate `AUTH_SESSION_SECRET` independently:

```bash
.venv/bin/python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(64))"
```

Add both generated values to root `.env`:

```env
AUTH_PASSWORD_HASH=pbkdf2_sha256$310000$...
AUTH_SESSION_SECRET=...
```

Usage:

1. Stop the backend before changing `.env`.
2. Generate the password hash and session secret.
3. Copy generated values into `.env`; never enter the original password into `.env`.
4. Restart the backend and frontend.
5. Open `/login`, enter the password you selected, and select `Continue`.
6. Confirm dashboard access, then use `Logout` when finished if available.

Security requirements:

- Use a unique, strong password; do not reuse a social-media password.
- Do not commit `.env`, paste either value into chat, or print secrets in logs.
- `AUTH_SESSION_SECRET` invalidates existing sessions when rotated; users must log in again.
- Keep `API_TOKEN` configured during migration if scripts or internal clients still use Bearer authentication.
- Use HTTPS when accessing MediaVault beyond loopback; session cookies become `Secure` automatically on HTTPS requests.
- Password authentication is single-user authentication, not multi-user authorization or tenant isolation.

#### 2. Setup Netscape cookies

`COOKIES_FILE` is used by `yt-dlp` and `gallery-dl`. It must be a Netscape-format cookie export, not a browser SQLite database and not an Instaloader session.

Options:

1. Export cookies from browser using a trusted Netscape cookie-export extension.
2. Save export as `config/cookies.txt`.
3. Set `COOKIES_FILE=config/cookies.txt` in `.env`.
4. Restart backend after changing `.env`.

For platform-specific exports, use separate files only when adapter configuration supports them; current global setting accepts one cookie file. Cookies must contain only domains needed by your own accounts. Rotate them after exposure.

#### 3. Setup Instaloader session

Recommended: open Settings, enter Instagram username/password, complete 2FA if requested. MediaVault logs in through Instaloader and saves session automatically under protected local storage. Password is never stored. A cookies file cannot replace an Instaloader session.

Windows:

```powershell
.\.venv\Scripts\instaloader.exe --login=YOUR_INSTAGRAM_USERNAME
```

Linux/macOS:

```bash
.venv/bin/instaloader --login=YOUR_INSTAGRAM_USERNAME
```

Enter password and 2FA when prompted. Instaloader normally saves session under the user configuration directory. Locate it without printing its contents:

```powershell
Get-ChildItem "$env:USERPROFILE\.config\instaloader" -Filter "session-*"
```

```bash
find "$HOME/.config/instaloader" -maxdepth 1 -type f -name 'session-*'
```

Manual CLI login remains available for recovery, but UI login is preferred. Session path is managed automatically; do not configure `INSTAGRAM_SESSION_FILE` or `INSTAGRAM_USERNAME` in `.env`. Invalid or expired sessions require reconnecting Instagram from Settings; they do not replace `COOKIES_FILE`.

#### 4. Adapter readiness

| Adapter | Public download | Authenticated setup | Notes |
|---|---|---|---|
| Instagram | Usually | Instaloader session and/or Netscape cookies | Saved/private autosync requires valid Instaloader session. |
| X/Twitter | Depends on engine | Netscape cookies if required | Platform access changes over time. |
| Threads | Depends on engine | Netscape cookies if required | Test with a public URL first. |
| YouTube | Yes for public URLs | Netscape cookies if required | Uses `yt-dlp`. |
| Reddit | Usually | Netscape cookies if required | Uses `gallery-dl`. |
| Pinterest | Usually | Netscape cookies if required | Uses `gallery-dl`. |
| TikTok | Depends on engine | Netscape cookies optional | Fallback may send URL to TikWM. |
| Facebook | No current registration | Not available | Adapter exists but is disabled in `backend/app/main.py`. |

#### 5. Test all registered adapters

Run local services, then submit one approved HTTPS URL per registered adapter in Studio:

```text
Instagram: https://www.instagram.com/p/<post-id>/
X:         https://x.com/<user>/status/<status-id>
Threads:   https://www.threads.net/@<user>/post/<post-id>
YouTube:   https://www.youtube.com/watch?v=<video-id>
Reddit:    https://www.reddit.com/r/<subreddit>/comments/<post-id>/
Pinterest: https://www.pinterest.com/pin/<pin-id>/
TikTok:    https://www.tiktok.com/@<user>/video/<video-id>
```

Replace placeholders with real URLs. The URL validator accepts only HTTPS and approved hosts. Check active jobs, then confirm output in Vault. If an adapter requires login, add cookies, restart backend, and retry.

### Local verification

```bash
curl http://127.0.0.1:8000/api/health
curl -H "Authorization: Bearer $API_TOKEN" "http://127.0.0.1:8000/api/jobs?status=active&limit=20"
```

Buka `http://127.0.0.1:3000`, masukkan URL, lalu pantau antrean dan Vault.

## Migrasi media ke lokasi baru

`data/mediavault.db` menyimpan metadata dan path fisik pada tabel `media_files`. `media/` menyimpan file aktual. Jika folder media dipindahkan, path database juga harus diperbarui.

`migrate_media_paths.py` mencari seluruh path berdasarkan folder platform (`instagram`, `x`, `threads`, `youtube`, `reddit`, `pinterest`, `tiktok`, `facebook`). Script tidak bergantung pada satu `OLD_ROOT`, tidak memindahkan file fisik, dan mempertahankan struktur mulai dari folder platform.

### Prasyarat Windows

Stop aplikasi dan pastikan port bebas:

```powershell
Stop-ScheduledTask -TaskName "MediaVault Production" -ErrorAction SilentlyContinue
Get-Process python,node,caddy -ErrorAction SilentlyContinue | Stop-Process -Force
Get-NetTCPConnection -LocalPort 80,3000,8000 -State Listen -ErrorAction SilentlyContinue
```

Copy seluruh isi media lama ke target:

```powershell
robocopy `
  "C:\lokasi\media-lama" `
  "D:\NAS\Docker\Mediavault\Media" `
  /E /COPY:DAT /R:2 /W:2
```

### Preview wajib

Default hanya preview dan tidak mengubah database:

```powershell
Set-Location C:\laragon\www\Scrapper
.\.venv\Scripts\python.exe migrate_media_paths.py `
  --target-root "D:\NAS\Docker\Mediavault\Media"
```

Lanjut hanya jika output menunjukkan `missing=0`. `skipped` berarti path sudah berada di target atau tidak memiliki folder platform yang dikenal; periksa jika jumlahnya tidak sesuai.

### Apply aman

```powershell
.\.venv\Scripts\python.exe migrate_media_paths.py `
  --target-root "D:\NAS\Docker\Mediavault\Media" `
  --apply
```

`--apply` membuat backup timestamped, memvalidasi semua file tujuan, mengubah hanya `media_files.path`, menjalankan transaksi SQLite dan `PRAGMA integrity_check`, lalu memulihkan backup bila gagal. Script tidak mengubah file fisik, album, favorite, `VAULT_KEY`, cookies, atau session.

Set `.env`:

```env
MEDIA_ROOT=D:/NAS/Docker/Mediavault/Media
DATABASE_URL=sqlite:///./data/mediavault.db
```

Verifikasi:

```powershell
.\.venv\Scripts\python.exe -c "from backend.app.db import get_session_factory,MediaFile; from sqlalchemy import select; import os; s=get_session_factory()(); rows=s.scalars(select(MediaFile)).all(); root=os.path.normcase('D:\\NAS\\Docker\\Mediavault\\Media'); print('total=',len(rows),'outside_target=',sum(not os.path.normcase(f.path).startswith(root) for f in rows),'missing=',sum(not os.path.isfile(f.path) for f in rows)); s.close()"
```

Hasil ideal: `outside_target=0` dan `missing=0`. Start ulang lalu cek Vault, Recent Download, preview, album, dan favorite:

```powershell
Start-ScheduledTask -TaskName "MediaVault Production"
Get-ScheduledTaskInfo -TaskName "MediaVault Production" | Select-Object LastRunTime,LastTaskResult
```

Simpan backup database dan media lama sampai verifikasi selesai.

## Production deployment guide

### Windows local production

Use this mode for one Windows PC without IIS. It runs compiled Next.js, Uvicorn without reload, Caddy on loopback, and restarts child processes after crashes.

Requirements:

- Python 3.11–3.14
- Node.js 20.9–24 and npm
- Valid root `.env`
- `caddy\caddy.exe` downloaded from the official Caddy release
- `caddy\Caddyfile` already included
- Administrator PowerShell for Task Scheduler and hosts-file changes

Prepare local domain once by editing `C:\Windows\System32\drivers\etc\hosts` as Administrator:

```text
127.0.0.1 mediavault.local
```

Install and start hidden Task Scheduler task:

```powershell
Set-Location C:\laragon\www\Scrapper
Set-ExecutionPolicy -Scope Process Bypass
.\run-production.ps1 -InstallTask
```

This command installs dependencies, runs DB initialization/migrations, synchronizes `API_TOKEN` to `frontend\.env.local`, builds frontend, registers hidden task `MediaVault Production`, and starts it. Open `http://mediavault.local`.

Manage task:

Start task manually jika aplikasi belum berjalan:

```powershell
Start-ScheduledTask -TaskName "MediaVault Production"
```

Menghentikan task dan proses yang dikelolanya:

```powershell
Stop-ScheduledTask -TaskName "MediaVault Production"
```

Menampilkan informasi eksekusi task, termasuk waktu mulai, jadwal berikutnya, dan exit code terakhir:

```powershell
Get-ScheduledTaskInfo -TaskName "MediaVault Production"
```

Menampilkan status task, misalnya `Running`, `Ready`, atau `Disabled`:

```powershell
Get-ScheduledTask -TaskName "MediaVault Production" | Select-Object TaskName, State
```

Menampilkan riwayat eksekusi penting: waktu eksekusi terakhir, jadwal berikutnya, hasil eksekusi, dan jumlah eksekusi yang terlewat:

```powershell
Get-ScheduledTaskInfo -TaskName "MediaVault Production" | Select-Object LastRunTime, NextRunTime, LastTaskResult, NumberOfMissedRuns
```

Memeriksa proses backend, frontend, dan Caddy yang sedang berjalan:

```powershell
Get-Process python,node,caddy -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime
```

Memeriksa apakah port Caddy `80`, frontend `3000`, dan backend `8000` sedang listen:

```powershell
Get-NetTCPConnection -LocalPort 80,3000,8000 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess, State
```

Menghapus task dari Task Scheduler. Gunakan jika tidak ingin auto-start lagi:

```powershell
.\run-production.ps1 -UninstallTask
```

### Menerapkan perubahan code atau `.env`

Setelah perubahan backend, frontend, atau `.env`, jalankan dari PowerShell:

```powershell
Set-Location C:\laragon\www\Scrapper
Set-ExecutionPolicy -Scope Process Bypass
Stop-ScheduledTask -TaskName "MediaVault Production" -ErrorAction SilentlyContinue
.\run-production.ps1 -SkipInstall -InstallTask
```

Penjelasan tiap command:

- `Set-Location C:\laragon\www\Scrapper`: pindah ke root project agar script, `.env`, database, frontend, dan path relatif ditemukan dengan benar.
- `Set-ExecutionPolicy -Scope Process Bypass`: mengizinkan script PowerShell pada sesi terminal saat ini saja. Setting kembali normal setelah terminal ditutup.
- `Stop-ScheduledTask ...`: menghentikan task production lama sebelum build/restart, mencegah dua instance memakai port atau database yang sama.
- `-SkipInstall`: melewati `pip install` dan `npm ci`. Gunakan ketika hanya code backend/frontend atau `.env` berubah dan dependency tidak berubah.
- `-InstallTask`: mendaftarkan/update hidden Task Scheduler, menjalankan build frontend, lalu start task production kembali.

Efek eksekusi:

1. Backend lama dihentikan.
2. Database initialization/migration dijalankan.
3. `API_TOKEN` root `.env` disinkronkan ke `frontend/.env.local`.
4. Frontend dibuild ulang memakai code dan environment terbaru.
5. Task Scheduler hidden diperbarui.
6. Backend, frontend, dan Caddy dijalankan kembali.
7. Backend otomatis membaca code dan `.env` terbaru saat process baru start.

Jika `pyproject.toml`, `package.json`, atau lockfile berubah, jangan gunakan `-SkipInstall`:

```powershell
Set-Location C:\laragon\www\Scrapper
Set-ExecutionPolicy -Scope Process Bypass
Stop-ScheduledTask -TaskName "MediaVault Production" -ErrorAction SilentlyContinue
.\run-production.ps1 -InstallTask
```

Jika tidak ada perubahan code/dependency/`.env` dan hanya ingin menjalankan task yang sudah terpasang:

```powershell
Start-ScheduledTask -TaskName "MediaVault Production"
```

`run-production.ps1` starts backend, frontend, and Caddy hidden with separate logs: `logs\backend-production.log`, `logs\frontend-production.log`, and `logs\caddy-production.log`. It uses ports 8000, 3000, and 80 bound to loopback. Port 80 must be free. Do not run duplicate manual services at the same time.

Remove Caddy or use `http://127.0.0.1:3000` only if local domain is unnecessary. Caddy does not change internet routing; it only proxies local port 80 to local port 3000.

### Production Linux

Production deployment requires Linux server, reverse proxy, TLS, process manager, firewall, backups, and secret management. Repository has no Dockerfile or Nginx configuration; commands below provide a minimal Ubuntu + Nginx layout.

### 1. Prepare server

```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip nodejs npm nginx
sudo adduser --system --group --home /opt/mediavault mediavault
sudo mkdir -p /opt/mediavault
sudo chown -R mediavault:mediavault /opt/mediavault
```

Copy repository to `/opt/mediavault`, then install dependencies:

```bash
sudo -u mediavault bash -lc 'cd /opt/mediavault && python3.11 -m venv .venv && .venv/bin/pip install -e ".[engines]"'
sudo -u mediavault bash -lc 'cd /opt/mediavault/frontend && npm ci && npm run build'
```

### 2. Create production secrets

Generate strong values locally or on server:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Create `/opt/mediavault/.env` with restricted permissions:

```env
API_TOKEN=<unique-long-token>
VAULT_KEY=<valid-Fernet-key>
DATABASE_URL=sqlite:////opt/mediavault/data/mediavault.db
MEDIA_ROOT=/opt/mediavault/media
COOKIES_FILE=/opt/mediavault/config/www.instagram.com_cookies.txt
INSTAGRAM_SESSION_FILE=
INSTAGRAM_USERNAME=
```

Generate a valid Fernet key:

```bash
sudo -u mediavault /opt/mediavault/.venv/bin/python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
sudo chmod 600 /opt/mediavault/.env
sudo chown mediavault:mediavault /opt/mediavault/.env
```

Never commit `.env`, cookie files, or session files.

### 3. Configure Instagram access

`COOKIES_FILE` accepts Netscape-format cookies for `yt-dlp`/`gallery-dl`. It does not replace an Instaloader session.

For Instagram saved/private autosync, create an Instaloader session interactively as the `mediavault` user:

```bash
sudo -u mediavault bash -lc 'cd /opt/mediavault && .venv/bin/instaloader --login=INSTAGRAM_USERNAME'
```

Set resulting session path in `.env`:

```env
INSTAGRAM_USERNAME=your_username
INSTAGRAM_SESSION_FILE=/home/mediavault/.config/instaloader/session-your_username
```

Use a valid Instaloader pickle session file. Do not point `INSTAGRAM_SESSION_FILE` to `cookies.txt`.

### 4. Initialize and test backend

```bash
sudo -u mediavault bash -lc 'cd /opt/mediavault && .venv/bin/python -m backend.init_db'
sudo -u mediavault bash -lc 'cd /opt/mediavault && .venv/bin/python -m pytest'
sudo -u mediavault bash -lc 'cd /opt/mediavault && .venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000'
```

Verify `http://127.0.0.1:8000/api/health` locally. Protected API calls require `Authorization: Bearer <API_TOKEN>`.

### 5. Run services with systemd

Create `/etc/systemd/system/mediavault-backend.service`:

```ini
[Unit]
Description=MediaVault FastAPI backend
After=network.target

[Service]
User=mediavault
Group=mediavault
WorkingDirectory=/opt/mediavault
EnvironmentFile=/opt/mediavault/.env
ExecStart=/opt/mediavault/.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Run frontend production server:

```bash
sudo -u mediavault bash -lc 'cd /opt/mediavault/frontend && NEXT_PUBLIC_API_TOKEN=$(sed -n "s/^API_TOKEN=//p" ../.env) npm run start -- -H 127.0.0.1 -p 3000'
```

Use a systemd unit for this command in production; do not use `npm run dev`.

### 6. Configure Nginx and TLS

Proxy public HTTPS traffic to frontend only. Keep FastAPI bound to `127.0.0.1`.

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and TLS with Certbot:

```bash
sudo ln -s /etc/nginx/sites-available/mediavault /etc/nginx/sites-enabled/mediavault
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d example.com
```

Replace `example.com` with real domain. Do not expose port 8000 publicly. Add firewall rules allowing only SSH and HTTPS.

### 7. Configure frontend token

Because browser requests need the API token, set `NEXT_PUBLIC_API_TOKEN` in frontend service environment before `npm run build`/`npm run start`. Rebuild after token rotation. Treat this single-user token as a credential; multi-user authorization is not implemented.

### 8. Verify adapters

Current registered adapters: Instagram, X/Twitter, Threads, YouTube, Reddit, Pinterest, and TikTok. Facebook adapter exists but is disabled in `backend/app/main.py`.

Test one approved HTTPS URL per platform through Studio. Authentication is platform-specific:

- Public content: adapter engine may work without account session.
- Instagram private/saved content: valid Instaloader session required.
- `yt-dlp`/`gallery-dl` authenticated content: provide matching Netscape cookies through `COOKIES_FILE`.
- TikTok fallback may send URL to TikWM; confirm privacy/compliance before enabling production use.
- X, Threads, YouTube, Reddit, and Pinterest availability depends on current engine/platform behavior.

Check health and jobs:

```bash
curl https://example.com/api/health
curl -H "Authorization: Bearer $API_TOKEN" https://example.com/api/jobs?status=active\&limit=20
```

### 9. Operations checklist

- Rotate `API_TOKEN`, `VAULT_KEY`, cookies, and Instaloader session after compromise.
- Back up `data/mediavault.db` and `media/`; test restore.
- Monitor `logs/backend.log`, `logs/backend-error.log`, readiness, queue depth, and failed jobs.
- Keep port 8000 private; require HTTPS externally.
- Run `pytest`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm audit --omit=dev` before release.
- Configure retention, alerting, uptime, and recovery objectives with the team; values are `[TBD — confirm with team]`.
