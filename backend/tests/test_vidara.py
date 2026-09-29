from unittest.mock import Mock, patch

import httpx
import pytest

from backend.app.adapters.vidara import VidaraAdapter


@pytest.fixture
def adapter():
    return VidaraAdapter()


def test_detect_requires_public_vidara_path(adapter):
    assert adapter.detect("https://vidara.to/v/abc_123")
    assert not adapter.detect("https://vidara.to/watch/abc")
    assert not adapter.detect("http://vidara.to/v/abc")


def test_resolve_validates_embed_and_stream(adapter):
    page = Mock(text='<iframe src="https://kitchenstories.ink/e/abc_123"></iframe>')
    api = Mock()
    api.json.return_value = {"streaming_url": "https://cdn.example/video.mp4", "title": "Test"}
    with patch.object(adapter, "_request", side_effect=[page, api]) as request, patch("backend.app.adapters.vidara.validate_public_url", side_effect=lambda value: value):
        result = adapter.resolve("https://vidara.to/v/abc_123")
    assert result.caption == "Test"
    assert request.call_args_list[1].kwargs["json"] == {"filecode": "abc_123", "device": "web"}


def test_resolve_data_retries_transient_timeout(adapter):
    page = Mock(text='<iframe src="https://kitchenstories.ink/e/abc"></iframe>')
    api = Mock()
    api.json.return_value = {"streaming_url": "https://cdn.example/video.mp4"}
    timeout = httpx.ReadTimeout("read timeout")
    with patch.object(adapter, "_request", side_effect=[timeout, page, api]) as request, patch("backend.app.adapters.vidara.validate_public_url", side_effect=lambda value: value), patch("backend.app.adapters.vidara.time.sleep"):
        result = adapter.resolve_data("https://vidara.to/v/abc")
    assert result["streaming_url"] == "https://cdn.example/video.mp4"
    assert request.call_count == 3


def test_resolve_rejects_drm(adapter):
    page = Mock(text='<iframe src="https://kitchenstories.ink/e/abc"></iframe>')
    api = Mock()
    # DRM is signalled by payload keys, never by the media URL path.
    api.json.return_value = {"streaming_url": "https://cdn.example/video.mp4", "widevine": "https://license"}
    with patch.object(adapter, "_request", side_effect=[page, api]), patch("backend.app.adapters.vidara.validate_public_url", side_effect=lambda value: value):
        with pytest.raises(RuntimeError, match="DRM"):
            adapter.resolve("https://vidara.to/v/abc")


def _page_and_api(stream_url="https://cdn.example/video.mp4"):
    page = Mock(text='<iframe src="https://kitchenstories.ink/e/abc"></iframe>')
    api = Mock()
    api.json.return_value = {"streaming_url": stream_url, "title": "T"}
    return page, api


def test_resolve_data_is_cached_no_second_fetch(adapter):
    page, api = _page_and_api()
    with patch.object(adapter, "_request", side_effect=[page, api]) as request, patch("backend.app.adapters.vidara.validate_public_url", side_effect=lambda value: value):
        first = adapter.resolve_data("https://vidara.to/v/abc")
        second = adapter.resolve_data("https://vidara.to/v/abc")
    assert first is second or first == second
    assert request.call_count == 2  # fetched once, second call served from cache


def test_download_without_resolved_data_reuses_cache(adapter, tmp_path):
    """Calling download(url, dest) after resolve must not re-fetch stream data."""
    page, api = _page_and_api()
    with patch.object(adapter, "_request", side_effect=[page, api]) as request, \
         patch("backend.app.adapters.vidara.validate_public_url", side_effect=lambda value: value), \
         patch.object(adapter, "_download_http", side_effect=lambda stream_url, dest_file, on_progress=None: open(dest_file, "wb").write(b"vid")):
        adapter.resolve("https://vidara.to/v/abc")          # populates the cache
        files = adapter.download("https://vidara.to/v/abc", str(tmp_path))
    assert len(files) == 1
    assert request.call_count == 2  # one fetch, not two


def test_cache_expires_and_refetches(adapter):
    """An entry older than the TTL is not reused."""
    import backend.app.adapters.vidara as vidara_mod

    page, api = _page_and_api()
    adapter._cache_put("https://vidara.to/v/abc", {"streaming_url": "https://cdn.example/old.mp4"})
    # Age the cached entry past the TTL.
    stale = adapter._cache["https://vidara.to/v/abc"]
    adapter._cache["https://vidara.to/v/abc"] = (stale[0] - vidara_mod.STREAM_CACHE_TTL_SECONDS - 1, stale[1])

    with patch.object(adapter, "_request", side_effect=[page, api]) as request, patch("backend.app.adapters.vidara.validate_public_url", side_effect=lambda value: value):
        data = adapter.resolve_data("https://vidara.to/v/abc")
    assert data["streaming_url"] == "https://cdn.example/video.mp4"
    assert request.call_count == 2  # refetched
