from __future__ import annotations

from unittest.mock import patch

import pytest

from backend.app.adapters.gallerydl import GalleryDlAdapter, PlatformSpec
from backend.app.adapters.pinterest import PinterestAdapter
from backend.app.adapters.reddit import RedditAdapter
from backend.app.adapters.x import XAdapter

SPECS = [XAdapter(), RedditAdapter(), PinterestAdapter()]


@pytest.mark.parametrize(
    ("adapter", "valid_hosts", "lookalikes"),
    [
        (XAdapter(), ("x.com", "twitter.com", "sub.x.com"), ("notx.com", "nottwitter.com", "x.com.example.org")),
        (RedditAdapter(), ("reddit.com", "redd.it", "sub.reddit.com"), ("notreddit.com", "notredd.it", "reddit.com.example.org")),
        (PinterestAdapter(), ("pinterest.com", "pin.it", "sub.pinterest.com"), ("notpinterest.com", "notpin.it", "pinterest.com.example.org")),
    ],
    ids=lambda value: value.platform if isinstance(value, GalleryDlAdapter) else None,
)
def test_detect_matches_registered_hosts_and_subdomains(adapter, valid_hosts, lookalikes):
    for host in valid_hosts:
        assert adapter.detect(f"https://{host}/post")
    for host in lookalikes:
        assert not adapter.detect(f"https://{host}/post")
    assert not adapter.detect(f"https://example.org/?next=https://{valid_hosts[0]}/post")


@pytest.mark.parametrize("adapter", SPECS, ids=lambda a: a.platform)
def test_resolve_maps_shared_fields(adapter):
    metadata = {
        "author": {"username": f"{adapter.platform}_owner"},
        "content": "hello world",
        "date": "2026-01-01",
        "tags": ["a", "b"],
    }
    with patch("backend.app.adapters.gallerydl.gdl_first_item", return_value=metadata):
        result = adapter.resolve("https://example.invalid/post")
    assert result.platform == adapter.platform
    assert result.caption == "hello world"
    assert result.posted_at == "2026-01-01"
    assert result.hashtags == ["a", "b"]


@pytest.mark.parametrize("adapter", SPECS, ids=lambda a: a.platform)
def test_resolve_falls_back_to_empty_on_error(adapter):
    """A failed resolve must not raise: error policy is uniform (best-effort)."""
    with patch("backend.app.adapters.gallerydl.gdl_first_item", side_effect=RuntimeError("boom")):
        result = adapter.resolve("https://example.invalid/post")
    assert result.platform == adapter.platform
    assert result.caption is None


@pytest.mark.parametrize("adapter", SPECS, ids=lambda a: a.platform)
def test_download_delegates_to_gallery_dl(adapter, tmp_path):
    with patch("backend.app.adapters.gallerydl.gdl_download", return_value=[str(tmp_path / "x.jpg")]) as download:
        files = adapter.download("https://example.invalid/post", str(tmp_path))
    assert files == [str(tmp_path / "x.jpg")]
    download.assert_called_once()


def test_download_lets_errors_propagate():
    """Download is fail-fast: the job must observe the failure."""
    adapter = XAdapter()
    with patch("backend.app.adapters.gallerydl.gdl_download", side_effect=RuntimeError("no files")):
        with pytest.raises(RuntimeError, match="no files"):
            adapter.download("https://x.com/user/status/1", "/tmp/x")


def test_url_username_fallback_used_when_keys_miss():
    adapter = PinterestAdapter()
    with patch("backend.app.adapters.gallerydl.gdl_first_item", return_value={}):
        result = adapter.resolve("https://www.pinterest.com/real_owner/pin/1")
    assert result.username == "real_owner"


def test_platform_spec_is_frozen_data():
    assert isinstance(XAdapter().spec, PlatformSpec)
    with pytest.raises(Exception):
        XAdapter().spec.platform = "changed"  # frozen dataclass
