from unittest.mock import Mock, patch

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


def test_resolve_rejects_drm(adapter):
    page = Mock(text='<iframe src="https://kitchenstories.ink/e/abc"></iframe>')
    api = Mock()
    api.json.return_value = {"streaming_url": "https://cdn.example/drm/video.mp4"}
    with patch.object(adapter, "_request", side_effect=[page, api]), patch("backend.app.adapters.vidara.validate_public_url", side_effect=lambda value: value):
        with pytest.raises(RuntimeError, match="DRM"):
            adapter.resolve("https://vidara.to/v/abc")
