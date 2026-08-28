from __future__ import annotations

import argparse
import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

PLATFORMS = {"instagram", "x", "threads", "youtube", "reddit", "pinterest", "tiktok", "facebook"}


def relative_media_path(path: str) -> Path | None:
    parts = Path(path.replace("\\", "/")).parts
    for index, part in enumerate(parts):
        if part.lower() in PLATFORMS:
            return Path(*parts[index:])
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default="data/mediavault.db")
    parser.add_argument("--target-root", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    database = Path(args.database).resolve()
    target_root = Path(args.target_root).resolve()

    if not database.is_file():
        raise SystemExit(f"Database not found: {database}")
    if not target_root.is_dir():
        raise SystemExit(f"Target media root not found: {target_root}")

    connection = sqlite3.connect(database)
    try:
        rows = connection.execute("SELECT id, path FROM media_files ORDER BY id").fetchall()
        mappings = []
        skipped = []
        missing = []
        for file_id, old_path in rows:
            relative = relative_media_path(str(old_path))
            if relative is None:
                skipped.append((file_id, old_path))
                continue
            new_path = target_root / relative
            mappings.append((file_id, old_path, str(new_path)))
            if not new_path.is_file():
                missing.append((file_id, str(new_path)))

        print(f"database={database}")
        print(f"target_root={target_root}")
        print(f"mapped={len(mappings)} skipped={len(skipped)} missing={len(missing)}")
        for file_id, old_path, new_path in mappings:
            print(f"{file_id}: {old_path} -> {new_path}")
        if missing:
            print("Missing destination files:")
            for file_id, path in missing:
                print(f"{file_id}: {path}")
            return 2
        if not args.apply:
            print("Preview only. Re-run with --apply to update database.")
            return 0

        backup = database.with_name(f"{database.stem}.backup-{datetime.now():%Y%m%d-%H%M%S}{database.suffix}")
        shutil.copy2(database, backup)
        try:
            connection.execute("BEGIN")
            for file_id, _, new_path in mappings:
                connection.execute("UPDATE media_files SET path = ? WHERE id = ?", (new_path, file_id))
            connection.execute("COMMIT")
            integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
            if integrity != "ok":
                raise RuntimeError(f"Database integrity check failed: {integrity}")
            print(f"updated={len(mappings)} backup={backup}")
            return 0
        except Exception:
            connection.rollback()
            shutil.copy2(backup, database)
            raise
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
