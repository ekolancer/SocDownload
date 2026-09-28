from __future__ import annotations

import socket
from pathlib import Path

import pytest

from backend.app.adapters.vidara import VidaraAdapter
from backend.app.downloader import _move_file, organize
from backend.app.instagram_errors import InstagramErrorCategory, classify_instagram_error
from backend.app.url_validation import HostResolutionError, validate_public_url


def test_transient_dns_failure_raises_host_resolution_error(monkeypatch):
    def fake_getaddrinfo(*args, **kwargs):
        raise socket.gaierror(-3, "Temporary failure in name resolution")

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    with pytest.raises(HostResolutionError):
        validate_public_url("https://vidara.to/v/abc123")


def test_host_resolution_error_is_network_error_and_retryable():
    error = HostResolutionError("URL host could not be resolved")
    assert classify_instagram_error(error) == InstagramErrorCategory.NETWORK_ERROR


def test_resolved_but_non_public_address_is_not_retryable(monkeypatch):
    def fake_getaddrinfo(*args, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    with pytest.raises(ValueError) as excinfo:
        validate_public_url("https://vidara.to/v/abc123")
    assert not isinstance(excinfo.value, HostResolutionError)
    assert classify_instagram_error(excinfo.value) != InstagramErrorCategory.NETWORK_ERROR


def test_drm_detected_from_payload_fields_not_url():
    # A legitimate CDN hostname containing "drm" must NOT be treated as DRM.
    assert not VidaraAdapter._is_drm_payload({"streaming_url": "https://drm-cdn.example.com/x.mp4"})
    # Real DRM signalling in payload keys must be detected.
    assert VidaraAdapter._is_drm_payload({"streaming_url": "https://cdn.example.com/x.mp4", "drm": {"widevine": "..."}})
    assert VidaraAdapter._is_drm_payload({"streaming_url": "https://cdn.example.com/x.mp4", "license_url": "https://x"})


def test_drm_error_is_not_retryable():
    assert classify_instagram_error(RuntimeError("Vidara DRM stream unsupported")) == InstagramErrorCategory.DOWNLOAD_FAILURE


def test_drm_error_does_not_falsely_match_plain_download():
    # Guard: DRM must be classified before the generic "download" rule.
    assert classify_instagram_error(RuntimeError("DRM protected stream")) == InstagramErrorCategory.DOWNLOAD_FAILURE


def test_move_file_survives_copystat_permission_error(tmp_path, monkeypatch):
    """Cross-device move onto a mount that rejects utime must still succeed."""
    source = tmp_path / "stage" / "clip.mp4"
    source.parent.mkdir()
    source.write_bytes(b"video-bytes")
    target = tmp_path / "media" / "clip.mp4"
    target.parent.mkdir()

    real_move = __import__("shutil").move

    def failing_move(src, dst):
        real_move(src, dst)
        raise PermissionError(1, "Operation not permitted")

    monkeypatch.setattr("backend.app.downloader.shutil.move", failing_move)
    _move_file(str(source), str(target))

    assert target.read_bytes() == b"video-bytes"


def test_organize_moves_files_and_returns_targets(tmp_path, monkeypatch):
    media_root = tmp_path / "media"
    media_root.mkdir()
    staged = media_root / ".mv_dl_stage"
    staged.mkdir()
    file_a = staged / "a.mp4"
    file_a.write_bytes(b"a")

    real_move = __import__("shutil").move

    def failing_move(src, dst):
        real_move(src, dst)
        raise PermissionError(1, "Operation not permitted")

    monkeypatch.setattr("backend.app.downloader.shutil.move", failing_move)
    moved = organize(str(media_root), "vidara", "user", "2026-01-01T00:00:00Z", [str(file_a)])

    assert len(moved) == 1
    assert Path(moved[0]).read_bytes() == b"a"
