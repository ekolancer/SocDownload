from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    api_token: str = ""
    auth_password_hash: str = ""
    auth_session_secret: str = ""
    auth_session_ttl_seconds: int = Field(default=86400, ge=300, le=2592000)
    auth_idle_timeout_seconds: int = Field(default=1800, ge=300, le=86400)
    vault_key: str = "change-me-generate-via-keygen"
    database_url: str = "sqlite:///./data/mediavault.db"
    media_root: str = "./media"
    cookies_file: str = ""
    instagram_session_file: str = ""
    instagram_username: str = ""
    job_cooldown_seconds: int = 3
    import_url_limit: int = Field(default=500, ge=1, le=10_000)
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1, le=100 * 1024 * 1024)
    list_limit: int = Field(default=1_000, ge=1, le=10_000)
    batch_ids_limit: int = Field(default=500, ge=1, le=5_000)
    export_items_limit: int = Field(default=500, ge=1, le=5_000)
    export_bytes_limit: int = Field(default=500 * 1024 * 1024, ge=1, le=5 * 1024 * 1024 * 1024)
    parser_depth_limit: int = Field(default=32, ge=1, le=128)
    parser_url_limit: int = Field(default=10_000, ge=1, le=100_000)
    vidara_max_download_bytes: int = Field(default=2 * 1024 * 1024 * 1024, ge=1, le=10 * 1024 * 1024 * 1024)
    ffmpeg_path: str = "ffmpeg"
    ffprobe_path: str = "ffprobe"
    thumbnail_offset_seconds: float = Field(default=2, ge=0)
    thumbnail_width: int = Field(default=480, ge=1, le=4096)
    thumbnail_quality: int = Field(default=75, ge=1, le=100)
    video_process_timeout_seconds: int = Field(default=300, ge=1, le=3600)

    class Config:
        env_file = ROOT / ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
