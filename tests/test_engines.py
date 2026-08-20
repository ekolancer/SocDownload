from __future__ import annotations

from pathlib import Path

import gallery_dl

from backend.app import engines


def test_gdl_download_uses_scoped_config(monkeypatch, tmp_path: Path) -> None:
    captured: dict = {}

    class FakeJob:
        def __init__(self, url: str) -> None:
            captured["url"] = url

        def run(self) -> int:
            captured["base-directory"] = gallery_dl.config.get((), "base-directory")
            captured["directory"] = gallery_dl.config.get((), "directory")
            (tmp_path / "media.jpg").write_bytes(b"media")
            return 0

    monkeypatch.setattr(gallery_dl.job, "DownloadJob", FakeJob)
    monkeypatch.setattr(engines, "_cookies", lambda: None)

    files = engines.gdl_download("https://example.com/post", str(tmp_path))

    assert captured == {
        "url": "https://example.com/post",
        "base-directory": str(tmp_path.resolve()),
        "directory": [],
    }
    assert files == [str(tmp_path / "media.jpg")]


def test_gdl_config_applies_and_restores_cookies(monkeypatch, tmp_path: Path) -> None:
    cookie_file = tmp_path / "cookies.txt"
    cookie_file.write_text("# Netscape HTTP Cookie File\n", encoding="utf-8")
    monkeypatch.setattr(engines, "_cookies", lambda: str(cookie_file))

    before = gallery_dl.config.get((), "cookies")
    with engines.gdl_config(str(tmp_path)):
        assert gallery_dl.config.get((), "cookies") == str(cookie_file)
    assert gallery_dl.config.get((), "cookies") == before


def test_gdl_first_item_uses_extractor_metadata(monkeypatch) -> None:
    from gallery_dl.extractor.message import Message

    class FakeExtractor:
        initialized = False

        def __iter__(self):
            self.initialized = True
            yield Message.Directory, "", {"author": "user"}

    extractor = FakeExtractor()
    monkeypatch.setattr(gallery_dl.extractor, "find", lambda url: extractor)
    monkeypatch.setattr(engines, "_cookies", lambda: None)

    assert engines.gdl_first_item("https://example.com/post") == {"author": "user"}
    assert extractor.initialized
