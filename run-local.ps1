param(
    [switch]$SkipInstall,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Venv = Join-Path $Root ".venv"
$Python = Join-Path $Venv "Scripts\python.exe"
$Frontend = Join-Path $Root "frontend"
$Logs = Join-Path $Root "logs"

function Stop-ChildProcess($Process) {
    if ($null -ne $Process -and -not $Process.HasExited) {
        & taskkill.exe /PID $Process.Id /T /F 2>$null | Out-Null
    }
}

Set-Location $Root
New-Item -ItemType Directory -Force -Path (Join-Path $Root "data"), (Join-Path $Root "media"), $Logs | Out-Null

foreach ($PortNumber in 3000, 8000) {
    $Listener = Get-NetTCPConnection -LocalPort $PortNumber -State Listen -ErrorAction SilentlyContinue
    if ($null -ne $Listener) {
        $ProcessIds = ($Listener | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
        throw "Port $PortNumber is already used by process $ProcessIds. Stop it before running MediaVault."
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $Root ".env"))) {
    Copy-Item -LiteralPath (Join-Path $Root ".env.example") -Destination (Join-Path $Root ".env")
    Write-Host ".env created from .env.example. Review VAULT_KEY before production use."
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python 3.11+ not found in PATH."
}

if (-not (Test-Path -LiteralPath $Python)) {
    Write-Host "Creating Python virtual environment..."
    & python -m venv $Venv
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "Node.js/npm not found in PATH."
}

$Node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $Node) {
    throw "Node.js executable not found in PATH."
}

if (-not $SkipInstall) {
    Write-Host "Installing backend dependencies..."
    & $Python -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) { throw "Backend dependency installation failed." }
    & $Python -m pip install -e ".[engines]"
    if ($LASTEXITCODE -ne 0) { throw "Backend dependency installation failed." }

    Write-Host "Installing frontend dependencies..."
    Push-Location $Frontend
    try {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend dependency installation failed. Stop running Node.js processes, then retry."
        }
    }
    finally {
        Pop-Location
    }
}

& $Python -m backend.init_db

$BackendLog = Join-Path $Logs "backend.log"
$FrontendLog = Join-Path $Logs "frontend.log"
$BackendErrorLog = Join-Path $Logs "backend-error.log"
$FrontendErrorLog = Join-Path $Logs "frontend-error.log"
$Backend = Start-Process -FilePath $Python `
    -ArgumentList @("-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000") `
    -WorkingDirectory $Root `
    -RedirectStandardOutput $BackendLog `
    -RedirectStandardError $BackendErrorLog `
    -PassThru

$FrontendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList @("/d", "/c", "npm.cmd run dev") `
    -WorkingDirectory $Frontend `
    -RedirectStandardOutput $FrontendLog `
    -RedirectStandardError $FrontendErrorLog `
    -PassThru

try {
    if ($FrontendProcess.HasExited) {
        throw "Frontend launcher stopped. Read logs\frontend.log and logs\frontend-error.log."
    }
    $Ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $Health = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/health" -UseBasicParsing
            if ($Health.StatusCode -eq 200) {
                $Ready = $true
                break
            }
        }
        catch {
            if ($Backend.HasExited) {
                throw "Backend stopped. Read logs\backend.log."
            }
        }
    }

    if (-not $Ready) {
        throw "Backend health check timed out. Read logs\backend.log."
    }

    $FrontendReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if ($null -ne (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) {
            $FrontendReady = $true
            break
        }
    }

    if (-not $FrontendReady) {
        throw "Frontend failed to listen on port 3000. Read logs\frontend.log and logs\frontend-error.log."
    }

    Write-Host "MediaVault running: http://127.0.0.1:3000"
    Write-Host "API running: http://127.0.0.1:8000/docs"
    Write-Host "Logs: logs\backend.log and logs\frontend.log"

    if (-not $NoBrowser) {
        Start-Process "http://127.0.0.1:3000"
    }

    Write-Host "Press Ctrl+C to stop."
    while ($true) {
        Start-Sleep -Seconds 2
        if ($Backend.HasExited) {
            throw "Backend stopped. Read logs\backend.log and logs\backend-error.log."
        }
        if ($null -eq (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) {
            throw "Frontend stopped listening on port 3000. Read logs\frontend.log and logs\frontend-error.log."
        }
    }
}
finally {
    Stop-ChildProcess $FrontendProcess
    Stop-ChildProcess $Backend
}
