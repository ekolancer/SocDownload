from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from .config import get_settings


def encrypt(plaintext: str) -> str:
    key = get_settings().vault_key.encode()
    f = Fernet(key)
    return f.encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str:
    key = get_settings().vault_key.encode()
    f = Fernet(key)
    return f.decrypt(token.encode()).decode()


def gen_key() -> str:
    return Fernet.generate_key().decode()
