from __future__ import annotations

import socket
import unittest
from unittest.mock import patch

from starlette.testclient import TestClient

from backend.app.main import app
from backend.app.url_validation import validate_url


PUBLIC_DNS = [
    (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443)),
]


class UrlValidationTestCase(unittest.TestCase):
    @patch("backend.app.url_validation.socket.getaddrinfo", return_value=PUBLIC_DNS)
    def test_canonicalizes_approved_url(self, getaddrinfo):
        url = validate_url("https://WWW.YouTube.com:443/watch?v=test#fragment")

        self.assertEqual(url, "https://www.youtube.com/watch?v=test")
        getaddrinfo.assert_called_once_with("www.youtube.com", 443, type=socket.SOCK_STREAM)

    @patch("backend.app.url_validation.socket.getaddrinfo")
    def test_rejects_scheme_credentials_port_and_unapproved_subdomain(self, getaddrinfo):
        invalid_urls = [
            "http://www.youtube.com/watch?v=test",
            "https://user:pass@www.youtube.com/watch?v=test",
            "https://www.youtube.com:8443/watch?v=test",
            "https://evil.youtube.com/watch?v=test",
            "https://youtube.com.evil.example/watch?v=test",
        ]

        for url in invalid_urls:
            with self.subTest(url=url), self.assertRaises(ValueError):
                validate_url(url)
        getaddrinfo.assert_not_called()

    @patch(
        "backend.app.url_validation.socket.getaddrinfo",
        return_value=[
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443)),
        ],
    )
    def test_rejects_non_public_dns_address(self, getaddrinfo):
        with self.assertRaisesRegex(ValueError, "non-public"):
            validate_url("https://www.instagram.com/p/test/")

    @patch("backend.app.url_validation.socket.getaddrinfo", side_effect=socket.gaierror)
    def test_rejects_unresolved_host(self, getaddrinfo):
        with self.assertRaisesRegex(ValueError, "could not be resolved"):
            validate_url("https://www.reddit.com/r/test/")

    @patch("backend.app.service.enqueue", side_effect=ValueError("unsupported URL host"))
    def test_job_endpoint_returns_validation_error(self, enqueue):
        response = TestClient(app).post(
            "/api/jobs",
            json={"url": "https://example.invalid/post"},
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"], "unsupported URL host")


if __name__ == "__main__":
    unittest.main()
