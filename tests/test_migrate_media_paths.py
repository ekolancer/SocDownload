from __future__ import annotations

import sqlite3
from pathlib import Path

from migrate_media_paths import main


def test_preview_maps_media_thumbnail_and_settings(tmp_path, monkeypatch, capsys):
    source_media = tmp_path / "media"
    source_config = tmp_path / "config"
    (source_media / "vidara").mkdir(parents=True)
    (source_config / "uploads").mkdir(parents=True)
    media = source_media / "vidara" / "clip.mp4"
    thumb = source_media / "vidara" / "clip.webp"
    session = source_config / "uploads" / "session.bin"
    for path in (media, thumb, session):
        path.write_bytes(b"ok")
    database = tmp_path / "test.db"
    with sqlite3.connect(database) as connection:
        connection.executescript("CREATE TABLE media_files (id INTEGER PRIMARY KEY, path TEXT, thumbnail_path TEXT); CREATE TABLE app_settings (id INTEGER PRIMARY KEY, instagram_session_file TEXT, cookies_file TEXT);")
        connection.execute("INSERT INTO media_files VALUES (1, ?, ?)", (str(media), str(thumb)))
        connection.execute("INSERT INTO app_settings VALUES (1, ?, ?)", (str(session), None))
        connection.commit()
    monkeypatch.setattr("sys.argv", ["migrate_media_paths.py", "--database", str(database), "--source-media-root", str(source_media), "--source-config-root", str(source_config)])
    assert main() == 0
    assert "missing=0 unmapped=0" in capsys.readouterr().out
