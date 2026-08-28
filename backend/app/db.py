from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

UTC = timezone.utc
WIB = UTC


def now_wib() -> datetime:
    return datetime.now(UTC)

from sqlalchemy import (
    Boolean,
    Index,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .config import ROOT, get_settings


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    DUP = "dup"


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypted_session: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="queued")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    lease_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class MediaItem(Base):
    __tablename__ = "media_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int | None] = mapped_column(ForeignKey("jobs.id"), nullable=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    hashtags: Mapped[str | None] = mapped_column(Text, nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    __table_args__ = (
        UniqueConstraint("source_url", "sha256", name="uq_source_sha256"),
        Index("ix_media_items_source_url", "source_url"),
        Index("ix_media_items_sha256", "sha256"),
    )


Index("ix_jobs_status", Job.status)
Index("ix_jobs_url", Job.url)


class MediaFile(Base):
    __tablename__ = "media_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    media_item_id: Mapped[int] = mapped_column(ForeignKey("media_items.id"), nullable=False)
    path: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)


class Album(Base):
    __tablename__ = "albums"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_media_id: Mapped[int | None] = mapped_column(ForeignKey("media_items.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class AlbumMediaItem(Base):
    __tablename__ = "album_media_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    album_id: Mapped[int] = mapped_column(ForeignKey("albums.id", ondelete="CASCADE"), nullable=False)
    media_item_id: Mapped[int] = mapped_column(ForeignKey("media_items.id", ondelete="CASCADE"), nullable=False)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    __table_args__ = (
        UniqueConstraint("album_id", "media_item_id", name="uq_album_media"),
    )


class PlatformAdapter(Base):
    __tablename__ = "platform_adapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    adapter_name: Mapped[str] = mapped_column(String(255), nullable=False)
    engine: Mapped[str] = mapped_column(String(32), nullable=True)
    engine_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    enabled: Mapped[bool] = mapped_column(default=True)
    last_health_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    health_ok: Mapped[bool | None] = mapped_column(nullable=True)


class AppSettings(Base):
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cookies_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    instagram_session_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    instagram_username: Mapped[str] = mapped_column(String(255), default="")
    job_cooldown_seconds: Mapped[int] = mapped_column(Integer, default=2)
    default_engine: Mapped[str] = mapped_column(String(32), default="auto")


class AutoSyncConfig(Base):
    __tablename__ = "auto_sync_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    sync_saved: Mapped[bool] = mapped_column(Boolean, default=True)
    sync_liked: Mapped[bool] = mapped_column(Boolean, default=False)
    interval_minutes: Mapped[int] = mapped_column(Integer, default=15)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_sync_status: Mapped[str | None] = mapped_column(String(32), nullable=True)  # "ok" | "error" | "session_expired"
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    items_synced_total: Mapped[int] = mapped_column(Integer, default=0)
    last_discovered_count: Mapped[int] = mapped_column(Integer, default=0)
    last_enqueued_count: Mapped[int] = mapped_column(Integer, default=0)
    last_skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    last_failed_count: Mapped[int] = mapped_column(Integer, default=0)



_engine = None
_session_factory = None

MIGRATIONS = {
    1: (
        "CREATE INDEX IF NOT EXISTS ix_jobs_status ON jobs (status)",
        "CREATE INDEX IF NOT EXISTS ix_jobs_url ON jobs (url)",
        "CREATE INDEX IF NOT EXISTS ix_media_items_source_url ON media_items (source_url)",
        "CREATE INDEX IF NOT EXISTS ix_media_items_sha256 ON media_items (sha256)",
    ),
    2: (
        "ALTER TABLE media_items ADD COLUMN is_favorite BOOLEAN DEFAULT 0",
    ),
    3: (
        "ALTER TABLE jobs ADD COLUMN lease_until DATETIME",
        "ALTER TABLE jobs ADD COLUMN lease_token VARCHAR(64)",
    ),
    4: (
        "ALTER TABLE auto_sync_config ADD COLUMN last_discovered_count INTEGER DEFAULT 0",
        "ALTER TABLE auto_sync_config ADD COLUMN last_enqueued_count INTEGER DEFAULT 0",
        "ALTER TABLE auto_sync_config ADD COLUMN last_skipped_count INTEGER DEFAULT 0",
        "ALTER TABLE auto_sync_config ADD COLUMN last_failed_count INTEGER DEFAULT 0",
    ),
    5: (
        "ALTER TABLE jobs ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0",
    ),
    6: (
         "CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY, cookies_file TEXT, instagram_session_file TEXT, instagram_username VARCHAR(255) NOT NULL DEFAULT '', job_cooldown_seconds INTEGER NOT NULL DEFAULT 2, default_engine VARCHAR(32) NOT NULL DEFAULT 'auto')",
     ),
    7: (
        "ALTER TABLE app_settings ADD COLUMN job_cooldown_seconds INTEGER NOT NULL DEFAULT 2",
        "ALTER TABLE app_settings ADD COLUMN default_engine VARCHAR(32) NOT NULL DEFAULT 'auto'",
    ),

}


def _migration_applied(conn, version: int) -> bool:
    return conn.execute(text("SELECT 1 FROM schema_migrations WHERE version = :version"), {"version": version}).first() is not None


def _apply_migrations(eng) -> None:
    with eng.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at DATETIME NOT NULL)"))
        for version, statements in MIGRATIONS.items():
            if _migration_applied(conn, version):
                continue
            for statement in statements:
                try:
                    conn.execute(text(statement))
                except Exception as exc:
                    if not ("duplicate column" in str(exc).lower() or "already exists" in str(exc).lower()):
                        raise
            conn.execute(text("INSERT INTO schema_migrations(version, applied_at) VALUES (:version, :applied_at)"), {"version": version, "applied_at": utcnow()})


def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    if dbapi_connection.__class__.__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        url = settings.database_url
        if url.startswith("sqlite:///./"):
            rel = url[len("sqlite:///./"):]
            url = f"sqlite:///{(ROOT / rel).as_posix()}"
        _engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
        )
        from sqlalchemy import event
        event.listen(_engine, "connect", _enable_sqlite_foreign_keys)
    return _engine


def get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(bind=get_engine(), expire_on_commit=False)
    return _session_factory


def init_db() -> None:
    eng = get_engine()
    Base.metadata.create_all(eng)
    _apply_migrations(eng)


