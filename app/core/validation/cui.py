"""Checksum CUI si CNP.

ANAF verifica cifra de control SEPARAT de schematron si respinge cu `ERRIdentif`
("CUI cumparator incorect", "CNP sau NIF vanzator incorect"). Deci o factura poate
trece validarea CIUS-RO si sa pice la upload. Verificarea se face local.
"""

from __future__ import annotations

import re

CUI_KEY = "753217532"
CNP_KEY = "279146358279"


def normalize_cui(raw: str) -> str:
    """Normalizare la SALVARE: fara prefix RO, fara spatii, doar cifre.

    Un singur spatiu in codul fiscal invalideaza fisierul D406.
    """
    if raw is None:
        return ""
    cleaned = re.sub(r"\s+", "", str(raw)).upper()
    if cleaned.startswith("RO"):
        cleaned = cleaned[2:]
    return re.sub(r"\D", "", cleaned)


def is_valid_cui(raw: str) -> bool:
    """Cifra de control mod-11 cu cheia 753217532. Control 10 se mapeaza la 0.

    Se aplica DOAR codurilor romanesti. Codurile de TVA straine nu au acest checksum.
    """
    digits = normalize_cui(raw)
    if not digits or not (2 <= len(digits) <= 10):
        return False
    body, control = digits[:-1], int(digits[-1])
    body = body.rjust(len(CUI_KEY), "0")
    if len(body) > len(CUI_KEY):
        return False
    total = sum(int(d) * int(k) for d, k in zip(body, CUI_KEY))
    computed = (total * 10) % 11
    if computed == 10:
        computed = 0
    return computed == control


def is_valid_cnp(raw: str) -> bool:
    """CNP: 13 cifre, cifra de control mod-11 cu cheia 279146358279."""
    digits = re.sub(r"\D", "", str(raw or ""))
    if len(digits) != 13:
        return False
    total = sum(int(d) * int(k) for d, k in zip(digits[:12], CNP_KEY))
    computed = total % 11
    if computed == 10:
        computed = 1
    return computed == int(digits[12])
