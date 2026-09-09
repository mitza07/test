"""Criptarea tokenurilor SPV.

Tokenurile stau in `spv_credential`, criptate, nu in variabile de mediu: modelul
ANAF suporta nativ o aplicatie inregistrata cu autorizare per client, deci fiecare
firma are perechea ei. O variabila de mediu ar tine o singura pereche si ar face
multi-tenancy-ul imposibil.

Fernet (AES-128-CBC + HMAC-SHA256, cu marcaj de timp) e suficient aici: cheia
sta in `TOKEN_ENCRYPTION_KEY`, iar valorile sunt scurte. Nu e un seif — daca
atacatorul citeste si baza, si variabilele de mediu, criptarea nu il opreste.
Ce opreste e cazul real: un dump de baza care ajunge unde nu trebuie.
"""

from __future__ import annotations

import os
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

ENV_KEY = "TOKEN_ENCRYPTION_KEY"


class EncryptionNotConfigured(RuntimeError):
    """Lipseste cheia. Aplicatia nu are voie sa porneasca fara ea."""


class DecryptionFailed(RuntimeError):
    """Valoarea nu poate fi decriptata cu cheia curenta."""


@lru_cache(maxsize=4)
def _cipher(key: str) -> Fernet:
    try:
        return Fernet(key.encode("utf-8"))
    except (ValueError, TypeError) as error:
        raise EncryptionNotConfigured(
            f"{ENV_KEY} nu e o cheie Fernet valida (32 de octeti, base64 urlsafe). "
            "Genereaza una: python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        ) from error


def _resolve(key: str | None) -> str:
    resolved = key or os.environ.get(ENV_KEY)
    if not resolved:
        raise EncryptionNotConfigured(
            f"{ENV_KEY} nu e setat. Fara el, tokenurile SPV ar ajunge in clar in "
            "baza de date si in orice dump al ei."
        )
    return resolved


def encrypt(value: str, key: str | None = None) -> str:
    return _cipher(_resolve(key)).encrypt(value.encode("utf-8")).decode("ascii")


def decrypt(value: str, key: str | None = None) -> str:
    try:
        return _cipher(_resolve(key)).decrypt(value.encode("ascii")).decode("utf-8")
    except InvalidToken as error:
        raise DecryptionFailed(
            "Tokenul nu poate fi decriptat. Cel mai probabil s-a schimbat "
            f"{ENV_KEY} de la salvare; firma trebuie reautorizata in SPV."
        ) from error


def generate_key() -> str:
    """Pentru `.env`. Nu se apeleaza la runtime — o cheie noua invalideaza tot."""
    return Fernet.generate_key().decode("ascii")
