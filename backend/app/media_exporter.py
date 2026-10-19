from __future__ import annotations

import csv
import io
import json
import tempfile
import zipfile
from pathlib import Path

from sqlalchemy import select

from .db import MediaFile, MediaItem, get_session_factory
from .media_vault import MediaQuery, MediaVault, neutralize_csv_formula, sanitize_zip_component


class MediaExporter:
    """Produce CSV/JSON/ZIP artefacts from a media query.

    Uses a vault for selected items and the session factory for raw file access
    needed by the ZIP writer.
    """

    def __init__(self, vault: MediaVault | None = None, session_factory=None) -> None:
        self._session_factory = session_factory or get_session_factory()
        if vault is None:
            self._vault = MediaVault(session_factory=self._session_factory)
        else:
            self._vault = vault

    def _items(self, query: MediaQuery):
        selected = self._vault.list_items(query)
        item_ids = [item["id"] for item in selected]
        if not item_ids:
            return [], {}
        with self._session_factory() as session:
            items_by_id = {
                item.id: item
                for item in session.scalars(select(MediaItem).where(MediaItem.id.in_(item_ids))).all()
            }
            items = [items_by_id[item_id] for item_id in item_ids if item_id in items_by_id]
            files_by_item: dict[int, list[MediaFile]] = {}
            for f in session.scalars(select(MediaFile).where(MediaFile.media_item_id.in_(item_ids))).all():
                files_by_item.setdefault(f.media_item_id, []).append(f)
            return items, files_by_item

    def csv_bytes(self, query: MediaQuery) -> bytes:
        items, files_by_item = self._items(query)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Platform", "Username", "Source URL", "Caption", "Hashtags", "Posted At", "Archived At", "Files Count", "SHA256"])
        for item in items:
            writer.writerow(
                neutralize_csv_formula(value)
                for value in [
                    item.id,
                    item.platform,
                    item.username or "",
                    item.source_url,
                    (item.caption or "").replace("\n", " "),
                    item.hashtags or "",
                    item.posted_at.isoformat() if item.posted_at else "",
                    item.created_at.isoformat() if item.created_at else "",
                    len(files_by_item.get(item.id, [])),
                    item.sha256 or "",
                ]
            )
        return output.getvalue().encode("utf-8-sig")

    def json_bytes(self, query: MediaQuery) -> bytes:
        from .media_vault import serialize_item

        items, files_by_item = self._items(query)
        data = [serialize_item(item, files_by_item.get(item.id, []), full=True) for item in items]
        return json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")

    def zip_bytes(self, query: MediaQuery, *, bytes_limit: int) -> bytes:
        items, files_by_item = self._items(query)
        if not items:
            raise ValueError("No media items found for export")

        total_bytes = 0
        export_files: list[tuple[MediaItem, list[tuple[MediaFile, Path]]]] = []
        for item in items:
            item_files: list[tuple[MediaFile, Path]] = []
            for media_file in files_by_item.get(item.id, []):
                path = Path(media_file.path)
                if path.is_file():
                    total_bytes += path.stat().st_size
                    if total_bytes > bytes_limit:
                        raise ValueError("export_too_large")
                    item_files.append((media_file, path))
            export_files.append((item, item_files))

        zip_file = tempfile.SpooledTemporaryFile(max_size=8 * 1024 * 1024, mode="w+b")
        with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED) as zf:
            metadata_items = []
            csv_rows = [["ID", "Platform", "Username", "Source URL", "Caption", "Hashtags", "Posted At", "Archived At", "Files"]]
            for item, files in export_files:
                u_dir = sanitize_zip_component(item.username, "unknown")
                p_dir = sanitize_zip_component(item.platform, "general")
                folder_path = f"{p_dir}/{u_dir}"
                item_file_names = []
                for f, path in files:
                    name = sanitize_zip_component(path.name, f"file_{f.id}")
                    arcname = f"{folder_path}/{item.id}_{name}"
                    zf.write(path, arcname=arcname)
                    item_file_names.append(f"{item.id}_{name}")
                metadata_items.append({
                    "id": item.id,
                    "platform": item.platform,
                    "username": item.username,
                    "source_url": item.source_url,
                    "caption": item.caption,
                    "posted_at": item.posted_at.isoformat() if item.posted_at else None,
                    "created_at": item.created_at.isoformat() if item.created_at else None,
                    "files": item_file_names,
                })
                csv_rows.append([
                    neutralize_csv_formula(value)
                    for value in [
                        item.id,
                        item.platform,
                        item.username or "",
                        item.source_url,
                        (item.caption or "").replace("\n", " "),
                        item.hashtags or "",
                        item.posted_at.isoformat() if item.posted_at else "",
                        item.created_at.isoformat() if item.created_at else "",
                        ", ".join(item_file_names),
                    ]
                ])
            zf.writestr("metadata.json", json.dumps(metadata_items, ensure_ascii=False, indent=2))
            csv_buf = io.StringIO()
            csv.writer(csv_buf).writerows(csv_rows)
            zf.writestr("metadata.csv", csv_buf.getvalue().encode("utf-8-sig"))

        zip_file.seek(0)
        return zip_file.read()
