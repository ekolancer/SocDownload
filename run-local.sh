#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$ROOT/.venv"
LOGS="$ROOT/logs"
DATA="$ROOT/data"
MEDIA="$ROOT/media"
FRONTEND="$ROOT/frontend"

mkdir -p "$DATA" "$MEDIA" "$LOGS"

# 1. Check or create .env
if [ ! -f "$ROOT/.env" ]; then
    echo "Creating .env from .env.example..."
    cp "$ROOT/.env.example" "$ROOT/.env"
    GENERATED_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || echo "default-mediavault-secret-key-32chars")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/change-me-generate-via-keygen/$GENERATED_KEY/" "$ROOT/.env"
    else
        sed -i "s/change-me-generate-via-keygen/$GENERATED_KEY/" "$ROOT/.env"
    fi
    echo ".env created with generated VAULT_KEY."
fi

# 2. Check and prepare virtualenv
if [ ! -d "$VENV" ]; then
    echo "Creating Python virtual environment at .venv..."
    python3 -m venv "$VENV"
fi

PYTHON="$VENV/bin/python"

# 3. Check and install backend dependencies if missing or requested
if ! "$PYTHON" -c "import uvicorn, fastapi, sqlalchemy" >/dev/null 2>&1 || [ "$1" == "--install" ]; then
    echo "Installing backend dependencies..."
    if ! "$PYTHON" -m pip install -e ".[engines]" -q 2>/dev/null; then
        echo "⚠️ Warning: Could not connect to PyPI to update packages. Continuing with local environment..."
    fi
fi

# 4. Initialize Database
echo "Initializing database..."
"$PYTHON" -m backend.init_db

# 5. Check ports
for PORT in 8000 3000; do
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Warning: Port $PORT is already in use. Stopping conflicting processes..."
        lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
    fi
done

# 6. Start Backend
echo "Starting Backend API on http://127.0.0.1:8000..."
"$PYTHON" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload > "$LOGS/backend.log" 2>&1 &
BACKEND_PID=$!

# 7. Start Frontend
echo "Starting Frontend on http://localhost:3000..."
(cd "$FRONTEND" && npm run dev) > "$LOGS/frontend.log" 2>&1 &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "Stopping MediaVault services..."
    if [ -n "$BACKEND_PID" ]; then
        kill -9 "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill -9 "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo "MediaVault stopped."
}

trap cleanup SIGINT SIGTERM EXIT

# Wait for backend health
echo "Waiting for services to become ready..."
READY=false
for i in {1..20}; do
    sleep 1
    if curl -s http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
        READY=true
        break
    fi
done

if [ "$READY" = false ]; then
    echo "Backend failed to start. Check logs/backend.log:"
    tail -n 20 "$LOGS/backend.log"
    exit 1
fi

echo "=================================================="
echo "  MediaVault is live!"
echo "  Frontend UI:  http://localhost:3000"
echo "  Backend API:  http://127.0.0.1:8000/docs"
echo "  Logs:         $LOGS/backend.log and $LOGS/frontend.log"
echo "=================================================="
echo "Press Ctrl+C to stop."

# Open browser if on macOS
if [[ "$OSTYPE" == "darwin"* ]] && [ "$1" != "--no-browser" ]; then
    open "http://localhost:3000" || true
fi

# Keep script running
wait "$BACKEND_PID" 2>/dev/null || wait
