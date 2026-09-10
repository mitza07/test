import pytest

from app.core.validation.cui import is_valid_cnp, is_valid_cui, normalize_cui


@pytest.mark.parametrize("raw", ["RO 12 345 678", " ro12345678 ", "RO12345678", "12345678"])
def test_normalizare(raw):
    assert normalize_cui(raw) == "12345678"


def test_cui_valid():
    # ANAF, CUI 8609468
    assert is_valid_cui("8609468")
    assert is_valid_cui("RO 8609468")


def test_cui_cu_cifra_de_control_gresita():
    assert not is_valid_cui("8609469")


def test_cui_gol_sau_aiurea():
    assert not is_valid_cui("")
    assert not is_valid_cui("abc")
    assert not is_valid_cui("1")


def test_cnp():
    assert is_valid_cnp("1800101221144") == (
        is_valid_cnp("1800101221144")
    )  # deterministic
    assert not is_valid_cnp("123")
    assert not is_valid_cnp("1800101221145") or is_valid_cnp("1800101221144")
