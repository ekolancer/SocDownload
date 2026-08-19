# MediaVault backend
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY pyproject.toml ./
COPY backend/ ./backend/
COPY backend/app ./backend/app

RUN pip install --no-cache-dir \
    fastapi "uvicorn[standard]" sqlalchemy cryptography httpx apscheduler pydantic-settings \
    yt-dlp gallery-dl instaloader

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
