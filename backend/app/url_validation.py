from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlsplit, urlunsplit


PLATFORM_HOSTS = {
    "instagram.com": {"instagram.com", "www.instagram.com", "m.instagram.com", "instagr.am"},
    "threads.net": {"threads.net", "www.threads.net", "threads.com", "www.threads.com"},
    "tiktok.com": {"tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"},
    "x.com": {"x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"},
    "youtube.com": {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"},
    "reddit.com": {"reddit.com", "www.reddit.com", "old.reddit.com", "new.reddit.com", "redd.it"},
    "pinterest.com": {"pinterest.com", "www.pinterest.com", "pin.it"},
}
APPROVED_HOSTS = frozenset(host for hosts in PLATFORM_HOSTS.values() for host in hosts)


def validate_url(url: str) -> str:
    if not isinstance(url, str) or not url or url != url.strip():
        raise ValueError("invalid URL")

    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError as exc:
        raise ValueError("invalid URL") from exc

    if parsed.scheme.lower() != "https":
        raise ValueError("URL must use https")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("URL credentials are not allowed")
    if port not in (None, 443):
        raise ValueError("URL must use the standard https port")

    hostname = (parsed.hostname or "").lower()
    if hostname not in APPROVED_HOSTS:
        raise ValueError("unsupported URL host")

    try:
        addresses = {
            item[4][0]
            for item in socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
        }
    except socket.gaierror as exc:
        raise ValueError("URL host could not be resolved") from exc
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError("URL host resolves to a non-public address")

    return urlunsplit(("https", hostname, parsed.path or "/", parsed.query, ""))
