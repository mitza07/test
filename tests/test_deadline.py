from datetime import date

from app.core.validation.deadline import transmission_deadline
from app.core.validation.holidays import (
    add_working_days,
    is_working_day,
    legal_holidays,
    orthodox_easter,
)


def test_paste_ortodox_2026():
    assert orthodox_easter(2026) == date(2026, 4, 12)


def test_sarbatori_2026_includ_zilele_fixe():
    h = legal_holidays(2026)
    for d in (date(2026, 1, 1), date(2026, 1, 2), date(2026, 1, 6), date(2026, 1, 7),
              date(2026, 1, 24), date(2026, 5, 1), date(2026, 6, 1),
              date(2026, 8, 15), date(2026, 11, 30), date(2026, 12, 1),
              date(2026, 12, 25), date(2026, 12, 26)):
        assert d in h


def test_weekend_nu_e_zi_lucratoare():
    assert not is_working_day(date(2026, 9, 12))  # sambata
    assert not is_working_day(date(2026, 9, 13))  # duminica
    assert is_working_day(date(2026, 9, 11))      # vineri


def test_factura_de_vineri_are_termen_vinerea_urmatoare():
    """Vineri 11.09.2026 + 5 zile lucratoare = vineri 18.09.2026.

    Cu 5 zile calendaristice ar fi fost miercuri 16.09.
    """
    assert transmission_deadline(date(2026, 9, 11)) == date(2026, 9, 18)


def test_termenul_sare_sarbatorile():
    """Emisa vineri 27.11.2026. 30.11 si 01.12 sunt sarbatori legale.

    Cu 5 zile calendaristice termenul ar fi fost 02.12. Cu 5 zile lucratoare,
    sarind weekendul si cele doua sarbatori, ajunge pe 08.12.
    """
    assert transmission_deadline(date(2026, 11, 27)) == date(2026, 12, 8)


def test_regula_veche_pentru_facturi_din_2025():
    assert transmission_deadline(date(2025, 12, 31)) == date(2026, 1, 5)


def test_add_working_days_zero():
    assert add_working_days(date(2026, 9, 9), 0) == date(2026, 9, 9)
