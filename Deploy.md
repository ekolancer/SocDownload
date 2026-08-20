# MediaVault Local Deployment

Panduan ini menjalankan MediaVault secara lokal untuk download URL publik dari Instagram, Threads, X, dan TikTok.

Login dan saved/bookmarked content belum menjadi scope utama. Fitur tersebut direncanakan untuk v2.

## Requirements

- Windows, macOS, atau Linux
- Python 3.11+
- Node.js 18+
- npm
- `ffmpeg` pada `PATH` untuk kebutuhan merge/konversi video tertentu
- Git, bila mengambil project dari repository

Docker bersifat opsional. Native setup menjadi jalur utama karena Docker belum diperlukan untuk penggunaan lokal.

## 1. Configure Environment

From project root:

```powershell
Copy-Item .env.example .env
```

Generate secret key. Do not keep default `VAULT_KEY` for real data:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Set generated value in `.env`:

```dotenv
VAULT_KEY=replace-with-generated-value
DATABASE_URL=sqlite:///./data/mediavault.db
MEDIA_ROOT=./media
```

Cookies are optional for public URLs. Configure later when a platform requires authentication or rate-limit bypass through your own browser session:

```dotenv
COOKIES_FILE=C:/absolute/path/to/cookies.txt
INSTAGRAM_SESSION_FILE=C:/absolute/path/to/instagram.session
INSTAGRAM_USERNAME=your_instagram_username
```

Never commit `.env`, `cookies.txt`, or Instagram session files.

## 2. Backend Native Setup

### One-command startup

From project root, run PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\run-local.ps1
```

Script creates `.venv`, installs backend/frontend dependencies, initializes SQLite, starts both services, checks backend health, and opens `http://localhost:3000`.

Skip dependency installation on later runs:

```powershell
.\run-local.ps1 -SkipInstall
```

Start services without opening browser:

```powershell
.\run-local.ps1 -SkipInstall -NoBrowser
```

Stop with `Ctrl+C`. Output logs are written to `logs/backend.log` and `logs/frontend.log`; error logs are written to `logs/backend-error.log` and `logs/frontend-error.log`.

From project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[engines]"
```

If PowerShell blocks activation, run once in an elevated PowerShell or use Command Prompt:

```cmd
.venv\Scripts\activate.bat
```

Initialize database (optional; API also initializes it at startup):

```powershell
python -m backend.init_db
```

Start API:

```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify API in another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod http://127.0.0.1:8000/api/adapters
```

API documentation: `http://127.0.0.1:8000/docs`.

## 3. Frontend Native Setup

Keep backend running. Open another terminal at project root:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open `http://localhost:3000`.

Frontend proxies `/api/*` to `http://localhost:8000/api/*` through `next.config.mjs`.

## 4. Smoke Test

Use one public URL per platform. Submit through UI or API:

```powershell
$body = @{ url = "https://www.instagram.com/p/VALID_PUBLIC_POST/" } | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8000/api/jobs -Method Post -ContentType "application/json" -Body $body
```

Repeat with public URLs from:

- Instagram post or reel
- Threads post
- X post
- TikTok video

Check job status:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/jobs
Invoke-RestMethod http://127.0.0.1:8000/api/media
```

Expected successful flow:

1. Job status becomes `queued`.
2. Worker changes status to `running`.
3. Downloaded files move under `media/<platform>/<username>/<date>/`.
4. `metadata.json` appears beside files.
5. Job status becomes `done`.

Platform restrictions can still produce `failed`. Read `error` in `/api/jobs` and backend console logs.

## 5. Docker Setup

Install Docker Desktop, then confirm:

```powershell
docker version
docker compose version
```

Create persistent directories:

```powershell
New-Item -ItemType Directory -Force data, media, config
```

Optional cookie files belong in `config/`:

- `config/cookies.txt`
- `config/instagram.session`

Set values in root `.env`:

```dotenv
VAULT_KEY=replace-with-generated-value
INSTAGRAM_USERNAME=your_instagram_username
```

Build and start backend:

```powershell
docker compose up --build
```

API is available at `http://localhost:8000`.

For frontend, use native setup from section 3, or run it separately with backend API available at port 8000.

Stop backend:

```powershell
docker compose down
```

Data remains in `data/` and downloaded files remain in `media/`.

## 6. Troubleshooting

### `ModuleNotFoundError`

Activate `.venv`, then reinstall:

```powershell
python -m pip install -e ".[engines]"
```

### `ffmpeg not found`

Install ffmpeg and ensure this works:

```powershell
ffmpeg -version
```

Restart backend after changing `PATH`.

### Platform returns `no media found`

Update engines:

```powershell
python -m pip install --upgrade yt-dlp gallery-dl instaloader
```

Retry with a direct public post URL, not a profile/search URL.

### Platform requires cookies

Export browser cookies in Netscape `cookies.txt` format. Set absolute `COOKIES_FILE` path in `.env`, then restart backend.

### Instagram session fails

The session file must match `INSTAGRAM_USERNAME`. Set both values, verify file path, then restart backend.

### Frontend build failure

Clean generated dependencies and reinstall:

```powershell
Remove-Item -Recurse -Force node_modules, .next
npm ci
npm run build
```

## 7. Validation Commands

Run before considering local deployment usable:

```powershell
python -m compileall -q backend
Set-Location frontend
npm run build
```

Then perform four real public URL smoke tests. Build success alone does not prove platform extractor success.

## Scope Boundary

Current release:

- Public URL enqueue and download
- Adapter support for Instagram, Threads, X, TikTok
- Metadata sidecar and SQLite history
- Optional shared cookies for yt-dlp/gallery-dl

v2 targets:

- Secure login/session management in UI
- Instagram saved posts
- X bookmarks
- Threads saved content, if supported by available tooling/API
- TikTok account/archive import and authenticated content
- Persistent job queue and retry controls
