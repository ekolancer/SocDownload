from __future__ import annotations

from backend.app.instagram_challenges import InstagramChallengeStore


class _Adapter:
    pass


def test_create_and_get_roundtrip():
    store = InstagramChallengeStore()
    adapter = _Adapter()
    cid = store.create(adapter=adapter, username="user")
    entry = store.get(cid)
    assert entry["username"] == "user"
    assert entry["adapter"] is adapter
    assert store.username_of(cid) == "user"


def test_is_valid_requires_matching_adapter():
    store = InstagramChallengeStore()
    adapter = _Adapter()
    cid = store.create(adapter=adapter, username="user")
    assert store.is_valid(cid, adapter) is True
    assert store.is_valid(cid, _Adapter()) is False
    assert store.is_valid("missing", adapter) is False
    assert store.is_valid(None, adapter) is False


def test_is_valid_rejects_expired():
    store = InstagramChallengeStore(ttl_seconds=-1)
    adapter = _Adapter()
    cid = store.create(adapter=adapter, username="user")
    assert store.is_valid(cid, adapter) is False


def test_is_valid_rejects_after_max_attempts():
    store = InstagramChallengeStore(max_attempts=2)
    adapter = _Adapter()
    cid = store.create(adapter=adapter, username="user")
    store.record_attempt(cid)
    assert store.is_valid(cid, adapter) is True
    store.record_attempt(cid)
    assert store.is_valid(cid, adapter) is False


def test_consume_removes_entry():
    store = InstagramChallengeStore()
    adapter = _Adapter()
    cid = store.create(adapter=adapter, username="user")
    store.consume(cid)
    assert store.get(cid) is None
    assert store.is_valid(cid, adapter) is False
    # Consuming an unknown id is a no-op.
    store.consume("missing")
    store.consume(None)
