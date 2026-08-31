from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.importer import parse_vidara_txt
from backend.app.routes import importer


def test_parse_vidara_txt_deduplicates_and_reports_lines():
    urls, invalid = parse_vidara_txt(b"# list\n\nhttps://www.vidara.to/v/abc_1\nhttps://vidara.to/v/abc_1\ntext https://vidara.to/v/nope\nhttp://vidara.to/v/nope\n")
    assert urls == ["https://vidara.to/v/abc_1"]
    assert invalid == [
        {"line": 5, "value": "text https://vidara.to/v/nope"},
        {"line": 6, "value": "http://vidara.to/v/nope"},
    ]


def test_parse_vidara_txt_requires_utf8():
    try:
        parse_vidara_txt(b"\xff")
    except ValueError as exc:
        assert str(exc) == "File must be valid UTF-8"
    else:
        raise AssertionError("invalid UTF-8 accepted")


def test_vidara_import_enqueues_valid_txt():
    app = FastAPI()
    app.include_router(importer.router)
    result = {"enqueued": ["https://vidara.to/v/a"], "skipped_dup": [], "skipped_limit": [], "skipped_invalid": [], "job_ids": [7]}
    with patch("backend.app.routes.importer.bulk_enqueue", return_value=result) as bulk:
        response = TestClient(app).post("/api/import/vidara", files={"file": ("vidara.txt", b"https://vidara.to/v/a\n", "text/plain")})
    assert response.status_code == 200
    assert response.json()["job_ids"] == [7]
    bulk.assert_called_once_with(["https://vidara.to/v/a"], importer.get_settings().import_url_limit)


def test_vidara_import_rejects_invalid_lines_with_details():
    app = FastAPI()
    app.include_router(importer.router)
    response = TestClient(app).post("/api/import/vidara", files={"file": ("vidara.txt", b"https://vidara.to/v/a extra\n", "text/plain")})
    assert response.status_code == 400
    assert response.json()["detail"]["invalid"] == [{"line": 1, "value": "https://vidara.to/v/a extra"}]


def test_vidara_import_requires_txt():
    app = FastAPI()
    app.include_router(importer.router)
    response = TestClient(app).post("/api/import/vidara", files={"file": ("vidara.csv", b"https://vidara.to/v/a", "text/csv")})
    assert response.status_code == 400
