from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    vault_key: str = "change-me-generate-via-keygen"
    database_url: str = "sqlite:///./data/mediavault.db"
    media_root: str = "./media"
    cookies_file: str = ""
    instagram_session_file: str = ""
    instagram_username: str = ""
    job_cooldown_seconds: int = 3
    import_url_limit: int = 500

    class Config:
        env_file = ROOT / ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
