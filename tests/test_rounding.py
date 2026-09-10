from decimal import Decimal

import pytest

from app.core.rounding import Line, compute, q2

D = Decimal


def test_tva_pe_baza_agregata_nu_pe_linie():
    """Trei linii de 0,03 la 21%.

    Per linie: 3 x round(0,0063) = 3 x 0,01 = 0,03
    Pe baza agregata: round(0,09 x 0,21) = round(0,0189) = 0,02
    Corect este 0,02. Suma TVA-urilor de linie ar pica BR-CO-14.
    """
    lines = [Line(D(1), D("0.03"), "S", D(21)) for _ in range(3)]
    totals = compute(lines)
    assert totals.line_total == D("0.09")
    assert totals.tax_amount == D("0.02")
    assert len(totals.breakdown) == 1
    assert totals.breakdown[0].taxable == D("0.09")


def test_corelatiile_br_co_se_inchid():
    lines = [Line(D(40), D("75.00"), "S", D(21)),
             Line(D(1), D("1200.00"), "S", D(21))]
    t = compute(lines)
    assert t.line_total == D("4200.00")
    assert t.tax_exclusive == t.line_total - t.allowance_total + t.charge_total
    assert t.tax_inclusive == t.tax_exclusive + t.tax_amount
    assert t.payable == t.tax_inclusive - t.prepaid + t.rounding
    assert sum(b.taxable for b in t.breakdown) == t.tax_exclusive
    assert sum(b.tax_amount for b in t.breakdown) == t.tax_amount


def test_doua_cote_grupate_separat():
    lines = [Line(D(1), D("100.00"), "S", D(21)),
             Line(D(1), D("100.00"), "S", D(11)),
             Line(D(1), D("100.00"), "E", None)]
    t = compute(lines)
    assert len(t.breakdown) == 3
    assert t.tax_amount == D("32.00")
    assert sum(b.taxable for b in t.breakdown) == t.tax_exclusive


def test_deducere_document_repartizata_fara_pierdere():
    lines = [Line(D(1), D("100.00"), "S", D(21)),
             Line(D(1), D("50.00"), "S", D(11))]
    t = compute(lines, doc_allowances=D("10.00"))
    assert t.tax_exclusive == D("140.00")
    assert sum(b.taxable for b in t.breakdown) == D("140.00")


def test_pret_negativ_respins():
    with pytest.raises(ValueError, match="BR-27"):
        Line(D(1), D("-5.00"), "S", D(21)).net()


def test_tva_inclus_se_scoate_corect():
    line = Line(D(1), D("121.00"), "S", D(21), vat_included=True)
    assert line.net() == D("100.00")


def test_toate_sumele_au_maximum_doua_zecimale():
    lines = [Line(D("3.333"), D("7.777"), "S", D(21))]
    t = compute(lines)
    for value in (t.line_total, t.tax_exclusive, t.tax_amount,
                  t.tax_inclusive, t.payable):
        assert -value.as_tuple().exponent <= 2
    for b in t.breakdown:
        assert -b.taxable.as_tuple().exponent <= 2
        assert -b.tax_amount.as_tuple().exponent <= 2


def test_q2_half_up():
    assert q2(D("0.005")) == D("0.01")
    assert q2(D("2.675")) == D("2.68")
