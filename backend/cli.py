import argparse

from pathlib import Path

from sqlalchemy import select

from app.db import MediaFile, get_session_factory
from app.video import normalize, thumbnail
from app.vault import decrypt, encrypt, gen_key


def generate_thumbnails(missing_only: bool, limit: int | None, dry_run: bool) -> dict[str, int]:
    counts = {"processed": 0, "skipped": 0, "missing": 0, "failed": 0}
    with get_session_factory()() as session:
        stmt = select(MediaFile).where(MediaFile.kind == "video").order_by(MediaFile.id)
        if limit:
            stmt = stmt.limit(limit)
        for media_file in session.scalars(stmt):
            if media_file.thumbnail_path and Path(media_file.thumbnail_path).is_file():
                counts["skipped"] += 1
                continue
            path = Path(media_file.path)
            if not path.is_file():
                counts["missing"] += 1
                continue
            try:
                normalized = normalize(path)
                thumb, metadata = thumbnail(normalized)
                if not dry_run:
                    media_file.path = normalized
                    media_file.thumbnail_path = thumb
                    media_file.width = metadata["width"]
                    media_file.height = metadata["height"]
                    media_file.duration = metadata["duration"]
                    media_file.video_codec = metadata["video_codec"]
                    media_file.audio_codec = metadata["audio_codec"]
                counts["processed"] += 1
            except (OSError, RuntimeError, ValueError):
                counts["failed"] += 1
        if not dry_run:
            session.commit()
    return counts




def main() -> None:
    parser = argparse.ArgumentParser(prog="mediavault-keygen")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sp_gen = sub.add_parser("generate", help="generate a new Fernet key")
    sp_enc = sub.add_parser("encrypt", help="encrypt a value")
    sp_enc.add_argument("value")
    sp_dec = sub.add_parser("decrypt", help="decrypt a value")
    sp_dec.add_argument("token")
    sp_backfill = sub.add_parser("generate-thumbnails")
    sp_backfill.add_argument("--missing-only", action="store_true")
    sp_backfill.add_argument("--limit", type=int)
    sp_backfill.add_argument("--workers", type=int, default=1)
    sp_backfill.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()

    if args.cmd == "generate-thumbnails":
        print(generate_thumbnails(args.missing_only, args.limit, args.dry_run))
    elif args.cmd == "generate":
        print(gen_key())
    elif args.cmd == "encrypt":
        print(encrypt(args.value))
    elif args.cmd == "decrypt":
        print(decrypt(args.token))


if __name__ == "__main__":
    main()
