from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

_test_root = Path(tempfile.mkdtemp(prefix="mediavault-tests-"))
os.environ["API_TOKEN"] = "test-token"
os.environ["DATABASE_URL"] = f"sqlite:///{(_test_root / 'test.db').as_posix()}"
os.environ["MEDIA_ROOT"] = str(_test_root / "media")


def pytest_sessionfinish(session, exitstatus):
    from backend.app import db

    if db._engine is not None:
        db._engine.dispose()
    db._engine = None
    db._session_factory = None
    shutil.rmtree(_test_root, ignore_errors=True)
