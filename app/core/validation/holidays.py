"""Sarbatori legale din Romania si aritmetica zilelor lucratoare.

Necesare pentru termenul de 5 ZILE LUCRATOARE de transmitere in SPV
(art. 10 alin. 7 OUG 120/2021, modificat prin OUG 89/2025, din 01.01.2026).
Calculul urmeaza Regulamentul (CEE, Euratom) 1182/71.

ATENTIE: lista de sarbatori se verifica anual. Guvernul mai adauga zile libere
punctuale, care nu sunt sarbatori legale permanente si NU intra aici decat daca
actul normativ le declara ca atare.
"""

from __future__ import annotations

from datetime import date, timedelta
from functools import lru_cache


def orthodox_easter(year: int) -> date:
    """Pastele ortodox, calculat pe calendarul iulian si convertit la gregorian."""
    a = year % 4
    b = year % 7
    c = year % 19
    d = (19 * c + 15) % 30
    e = (2 * a + 4 * b - d + 34) % 7
    month = (d + e + 114) // 31
    day = ((d + e + 114) % 31) + 1
    julian = date(year, month, day)
    offset = 13 if 1900 <= year <= 2099 else 14
    return julian + timedelta(days=offset)


@lru_cache(maxsize=64)
def legal_holidays(year: int) -> frozenset[date]:
    """Sarbatorile legale conform art. 139 din Codul muncii."""
    easter = orthodox_easter(year)
    days = {
        date(year, 1, 1),
        date(year, 1, 2),
        date(year, 1, 6),    # Boboteaza
        date(year, 1, 7),    # Sfantul Ioan Botezatorul
        date(year, 1, 24),   # Unirea Principatelor
        easter - timedelta(days=2),   # Vinerea Mare
        easter,
        easter + timedelta(days=1),
        date(year, 5, 1),
        date(year, 6, 1),    # Ziua Copilului
        easter + timedelta(days=49),  # Rusalii
        easter + timedelta(days=50),
        date(year, 8, 15),   # Adormirea Maicii Domnului
        date(year, 11, 30),  # Sfantul Andrei
        date(year, 12, 1),   # Ziua Nationala
        date(year, 12, 25),
        date(year, 12, 26),
    }
    return frozenset(days)


def is_working_day(day: date) -> bool:
    return day.weekday() < 5 and day not in legal_holidays(day.year)


def add_working_days(start: date, count: int) -> date:
    """Adauga `count` zile lucratoare, sarind weekendurile si sarbatorile legale.

    Ziua de start nu se numara: termenul curge de la inceputul primei zile a
    termenului si se incheie la expirarea ultimei ore a ultimei zile.
    """
    if count < 0:
        raise ValueError("count trebuie sa fie pozitiv")
    current = start
    remaining = count
    while remaining > 0:
        current += timedelta(days=1)
        if is_working_day(current):
            remaining -= 1
    return current


def working_days_between(start: date, end: date) -> int:
    """Cate zile lucratoare mai sunt pana la `end`. Negativ daca termenul a trecut."""
    if end == start:
        return 0
    step = 1 if end > start else -1
    current, count = start, 0
    while current != end:
        current += timedelta(days=step)
        if is_working_day(current):
            count += step
    return count
