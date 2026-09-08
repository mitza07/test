from datetime import date
from decimal import Decimal

import pytest

from app.core.rounding import Line, compute
from app.core.validation.br_ro import CUSTOMIZATION_ID

D = Decimal


def _doc_from(lines_spec, **overrides):
    lines = [Line(D(q), D(p), cat, D(v) if v is not None else None)
             for q, p, cat, v in lines_spec]
    totals = compute(lines)
    doc = {
        "invoice_id": "FSIT0001",
        "customization_id": CUSTOMIZATION_ID,
        "invoice_type_code": "380",
        "issue_date": date(2026, 9, 9),
        "due_date": date(2026, 10, 9),
        "currency": "RON",
        "tax_currency": "RON",
        "seller": {
            "legal_reg_id": "8609468",
            "vat_id": "RO8609468",
            "company_id": "J40/1234/2020",
            "name": "Atelier IT SRL",
            "address1": "Str. Fabricii nr. 10",
            "city": "SECTOR1",
            "county": "RO-B",
            "country": "RO",
        },
        "buyer": {
            "legal_reg_id": "8609468",
            "name": "Studio Nord SRL",
            "address1": "Str. Atelierului nr. 5",
            "city": "Cluj-Napoca",
            "county": "RO-CJ",
            "country": "RO",
        },
        "lines": [
            # cantitatea, categoria si cota sunt necesare generatorului UBL
            # (BT-129, BT-151, BT-152); validatorul nu le citeste, dar cele doua
            # consuma acelasi dict, deci fixture-ul le produce pe amandoua.
            {"line_id": str(i), "name": "Consultanta IT", "quantity": ln.quantity,
             "unit_price": ln.unit_price, "unit_code": "HUR", "net": ln.net(),
             "vat_category": ln.vat_category, "vat_percent": ln.vat_percent,
             "vat_included": ln.vat_included, "saft_tax_code": "20"}
            for i, ln in enumerate(lines, start=1)
        ],
        "line_total": totals.line_total,
        "allowance_total": totals.allowance_total,
        "charge_total": totals.charge_total,
        "tax_exclusive": totals.tax_exclusive,
        "tax_amount": totals.tax_amount,
        "tax_inclusive": totals.tax_inclusive,
        "prepaid": totals.prepaid,
        "rounding": totals.rounding,
        "payable": totals.payable,
        "vat_breakdown": [
            {"category": b.category, "percent": b.percent,
             "taxable": b.taxable, "tax_amount": b.tax_amount}
            for b in totals.breakdown
        ],
        "notes": [],
    }
    doc.update(overrides)
    return doc


@pytest.fixture
def valid_doc():
    return _doc_from([(10, "100.00", "S", 21)])


@pytest.fixture
def make_doc():
    return _doc_from
