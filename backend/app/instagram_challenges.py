from __future__ import annotations

import secrets
import time


class InstagramChallengeStore:
    """In-memory store for pending Instagram two-factor challenges.

    A challenge is minted when instaloader reports 2FA is required and is
    consumed on the follow-up code submission. Entries are single-use: a
    successful redemption removes them, expired or over-attempted ones are
    rejected.
    """

    def __init__(self, ttl_seconds: int = 300, max_attempts: int = 3) -> None:
        self._ttl_seconds = ttl_seconds
        self._max_attempts = max_attempts
        self._entries: dict[str, dict] = {}

    @property
    def max_attempts(self) -> int:
        return self._max_attempts

    def create(self, *, adapter, username: str) -> str:
        challenge_id = secrets.token_urlsafe(32)
        self._entries[challenge_id] = {
            "expires": time.time() + self._ttl_seconds,
            "attempts": 0,
            "adapter": adapter,
            "username": username,
        }
        return challenge_id

    def get(self, challenge_id: str | None) -> dict | None:
        if not challenge_id:
            return None
        return self._entries.get(challenge_id)

    def is_valid(self, challenge_id: str | None, adapter) -> bool:
        entry = self.get(challenge_id)
        if not entry:
            return False
        if float(entry["expires"]) < time.time():
            return False
        if int(entry["attempts"]) >= self._max_attempts:
            return False
        if entry["adapter"] is not adapter:
            return False
        return True

    def record_attempt(self, challenge_id: str) -> None:
        entry = self._entries.get(challenge_id)
        if entry is not None:
            entry["attempts"] = int(entry["attempts"]) + 1

    def username_of(self, challenge_id: str | None) -> str | None:
        entry = self.get(challenge_id)
        return str(entry["username"]) if entry else None

    def consume(self, challenge_id: str | None) -> None:
        if challenge_id:
            self._entries.pop(challenge_id, None)

    def clear(self) -> None:
        self._entries.clear()
