from __future__ import annotations

import argparse
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path


def map_path(value: str | None, source_root: Path, target_root: str) -> tuple[str | None, bool]:
    if not value:
        return value, False
    normalized = value.replace("\\", "/")
    source = source_root.as_posix().rstrip("/").lower()
    if not normalized.lower().startswith(source + "/"):
        return value, False
    relative = normalized[len(source) + 1:]
    return f"{target_root.rstrip('/')}/{relative}", True


def source_file(value: str, source_root: Path) -> Path:
    normalized = value.replace("\\", "/")
    source = source_root.as_posix().rstrip("/")
    return source_root / normalized[len(source) + 1:]


def backup_database(database: Path) -> Path:
    backup = database.with_name(f"{database.stem}.backup-{datetime.now():%Y%m%d-%H%M%S}{database.suffix}")
    source = sqlite3.connect(database)
    target = sqlite3.connect(backup)
    try:
        source.backup(target)
    finally:
        target.close()
        source.close()
    return backup


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default="data/mediavault.db")
    parser.add_argument("--source-media-root", required=True)
    parser.add_argument("--target-media-root", default="/app/media")
    parser.add_argument("--source-config-root")
    parser.add_argument("--target-config-root", default="/app/config")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    database = Path(args.database).resolve()
    source_media = Path(args.source_media_root).resolve()
    source_config = Path(args.source_config_root).resolve() if args.source_config_root else None
    if not database.is_file():
        raise SystemExit(f"Database not found: {database}")
    if not source_media.is_dir():
        raise SystemExit(f"Source media root not found: {source_media}")
    if source_config and not source_config.is_dir():
        raise SystemExit(f"Source config root not found: {source_config}")

    connection = sqlite3.connect(database)
    updates: list[tuple[str, str | None, str]] = []
    missing: list[str] = []
    unmapped: list[str] = []
    try:
        rows = connection.execute("SELECT id, path, thumbnail_path FROM media_files ORDER BY id").fetchall()
        for file_id, path, thumbnail in rows:
            new_path, mapped = map_path(path, source_media, args.target_media_root)
            new_thumbnail, thumb_mapped = map_path(thumbnail, source_media, args.target_media_root)
            if path and not mapped and not str(path).startswith(args.target_media_root):
                unmapped.append(str(path))
            if thumbnail and not thumb_mapped and not str(thumbnail).startswith(args.target_media_root):
                unmapped.append(str(thumbnail))
            if mapped and not source_file(str(path), source_media).is_file():
                missing.append(str(source_file(str(path), source_media)))
            if thumb_mapped and not source_file(str(thumbnail), source_media).is_file():
                missing.append(str(source_file(str(thumbnail), source_media)))
            if mapped or thumb_mapped:
                updates.append((str(new_path or path), str(new_thumbnail) if thumb_mapped else thumbnail, str(file_id)))

        settings_update: tuple[str, str] | None = None
        row = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_settings'").fetchone()
        if source_config and row:
            columns = {item[1] for item in connection.execute("PRAGMA table_info(app_settings)").fetchall()}
            values = connection.execute("SELECT instagram_session_file, cookies_file FROM app_settings WHERE id = 1").fetchone()
            if values:
                new_values = list(values)
                for index, value in enumerate(values):
                    new_value, mapped = map_path(value, source_config, args.target_config_root)
                    if mapped:
                        if not source_file(str(value), source_config).is_file():
                            missing.append(str(source_file(str(value), source_config)))
                        new_values[index] = new_value
                if "cookies_file" in columns or "instagram_session_file" in columns:
                    settings_update = (new_values[0], new_values[1])

        print(f"database={database}")
        print(f"media_updates={len(updates)} missing={len(missing)} unmapped={len(unmapped)}")
        print(f"settings_update={bool(settings_update)}")
        if missing or unmapped:
            if missing:
                print("Missing source files:")
                for path in missing:
                    print(path)
            if unmapped:
                print("Unmapped database paths:")
                for path in unmapped:
                    print(path)
            return 2
        if not args.apply:
            print("Preview only. Re-run with --apply on a verified database copy.")
            return 0

        backup = backup_database(database)
        try:
            connection.execute("BEGIN IMMEDIATE")
            for path, thumbnail, file_id in updates:
                connection.execute("UPDATE media_files SET path = ?, thumbnail_path = ? WHERE id = ?", (path, thumbnail, file_id))
            if settings_update:
                connection.execute("UPDATE app_settings SET instagram_session_file = ?, cookies_file = ? WHERE id = 1", settings_update)
            integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
            if integrity != "ok":
                raise RuntimeError(f"Database integrity check failed: {integrity}")
            connection.commit()
            print(f"updated={len(updates)} backup={backup}")
            return 0
        except Exception:
            connection.rollback()
            with sqlite3.connect(backup) as backup_connection:
                backup_connection.backup(connection)
            raise
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
