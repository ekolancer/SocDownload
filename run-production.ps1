param(
    [switch]$InstallTask,
    [switch]$UninstallTask,
    [switch]$SkipInstall,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Venv = Join-Path $Root ".venv"
$Python = Join-Path $Venv "Scripts\python.exe"
$FrontendDir = Join-Path $Root "frontend"
$Logs = Join-Path $Root "logs"
$TaskName = "MediaVault Production"
$TaskScript = Join-Path $Root "run-production.ps1"
$CaddyExe = Join-Path $Root "caddy\caddy.exe"
$CaddyConfig = Join-Path $Root "caddy\Caddyfile"

function Stop-ProcessTree($Process) {
    if ($null -ne $Process -and -not $Process.HasExited) {
        & taskkill.exe /PID $Process.Id /T /F 2>$null | Out-Null
    }
}

if ($UninstallTask) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Scheduled task removed: $TaskName"
    exit 0
}

Set-Location $Root
New-Item -ItemType Directory -Force -Path (Join-Path $Root "data"), (Join-Path $Root "media"), $Logs | Out-Null

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python 3.11+ not found in PATH."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "Node.js/npm not found in PATH."
}
if (-not (Test-Path -LiteralPath $CaddyExe)) {
    throw "Caddy not found at $CaddyExe. Download caddy.exe into caddy\ first."
}
if (-not (Test-Path -LiteralPath $CaddyConfig)) {
    throw "Caddyfile not found at $CaddyConfig."
}
if (-not (Test-Path -LiteralPath (Join-Path $Root ".env"))) {
    throw ".env not found. Run run-local.ps1 once or create .env from .env.example."
}

$Port80 = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
if ($null -ne $Port80) {
    $ProcessIds = ($Port80 | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
    throw "Port 80 is already used by process $ProcessIds. Stop it before running Caddy."
}

$EnvPath = Join-Path $Root ".env"
$EnvContent = Get-Content -LiteralPath $EnvPath -Raw
if ($EnvContent -match "(?m)^API_TOKEN=(?:$|generate-a-long-random-token|change-me.*)$") {
    throw "API_TOKEN is empty or placeholder."
}
if ($EnvContent -match "(?m)^VAULT_KEY=(?:$|change-me-generate-via-keygen)$") {
    throw "VAULT_KEY is empty or placeholder."
}

if (-not (Test-Path -LiteralPath $Python)) {
    & python -m venv $Venv
}

if (-not $SkipInstall) {
    & $Python -m pip install -e ".[engines]"
    if ($LASTEXITCODE -ne 0) { throw "Backend dependency installation failed." }
    Push-Location $FrontendDir
    try {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed." }
    }
    finally {
        Pop-Location
    }
}

& $Python -m backend.init_db
if ($LASTEXITCODE -ne 0) { throw "Database initialization failed." }

$ApiToken = ((Get-Content -LiteralPath $EnvPath | Where-Object { $_ -match '^API_TOKEN=' }) -replace '^API_TOKEN=', '')
Set-Content -LiteralPath (Join-Path $FrontendDir ".env.local") -Value "NEXT_PUBLIC_API_TOKEN=$ApiToken"

if (-not $SkipBuild) {
    Push-Location $FrontendDir
    try {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend production build failed." }
    }
    finally {
        Pop-Location
    }
}

if ($InstallTask) {
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$TaskScript`" -SkipInstall -SkipBuild"
    $Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
    $Settings = New-ScheduledTaskSettingsSet -Hidden -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 3650)
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null
    Write-Host "Scheduled task installed: $TaskName"
    Start-ScheduledTask -TaskName $TaskName
    exit 0
}

$BackendLog = Join-Path $Logs "backend-production.log"
$BackendErrorLog = Join-Path $Logs "backend-production-error.log"
$FrontendLog = Join-Path $Logs "frontend-production.log"
$FrontendErrorLog = Join-Path $Logs "frontend-production-error.log"
$CaddyLog = Join-Path $Logs "caddy-production.log"
$CaddyErrorLog = Join-Path $Logs "caddy-production-error.log"

while ($true) {
    $Backend = Start-Process -FilePath $Python -ArgumentList @("-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000") -WorkingDirectory $Root -RedirectStandardOutput $BackendLog -RedirectStandardError $BackendErrorLog -WindowStyle Hidden -PassThru
    $CaddyProcess = Start-Process -FilePath $CaddyExe -ArgumentList @("run", "--config", $CaddyConfig) -WorkingDirectory (Join-Path $Root "caddy") -RedirectStandardOutput $CaddyLog -RedirectStandardError $CaddyErrorLog -WindowStyle Hidden -PassThru
    $FrontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList @("/d", "/c", "npm.cmd run start -- -H 127.0.0.1 -p 3000") -WorkingDirectory $FrontendDir -RedirectStandardOutput $FrontendLog -RedirectStandardError $FrontendErrorLog -WindowStyle Hidden -PassThru

    try {
        Start-Sleep -Seconds 5
        if ($Backend.HasExited) { throw "Backend stopped. Read $BackendErrorLog" }
        if ($FrontendProcess.HasExited) { throw "Frontend stopped. Read $FrontendErrorLog" }
        if ($CaddyProcess.HasExited) { throw "Caddy stopped. Read $CaddyErrorLog" }
        while (-not $Backend.HasExited -and -not $FrontendProcess.HasExited -and -not $CaddyProcess.HasExited) {
            Start-Sleep -Seconds 5
        }
    }
    finally {
        Stop-ProcessTree $CaddyProcess
        Stop-ProcessTree $FrontendProcess
        Stop-ProcessTree $Backend
    }

    Start-Sleep -Seconds 5
}
