"""Jurnalul de vanzari, in CSV.

Formatul nu e impus de nimeni printr-o schema: e ce cere contabilul ca sa nu
reintroduca facturile de mana. De aceea are coloane pe cota de TVA, nu un singur
total — jurnalul de vanzari se totalizeaza pe cote.

Separatorul e `;` si zecimalul e virgula: asa deschide Excel-ul romanesc fisierul
fara sa strice coloanele. Cu `,` ca separator si `.` ca zecimal, un total de
1.210,00 ajunge in doua celule.

CUI-ul se scrie normalizat, fara spatii si fara prefix. Un spatiu in codul fiscal
invalideaza D406 (spec. sectiunea 4, consecinta 3), iar jurnalul e sursa din care
contabilul copiaza.
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.validation.cui import normalize_cui

DELIMITER = ";"

COLUMNS = [
    "Numar", "Data", "Client", "CUI", "Tip", "Moneda",
    "Baza 21%", "TVA 21%", "Baza 11%", "TVA 11%",
    "Baza scutit", "Baza taxare inversa",
    "Total fara TVA", "Total TVA", "Total",
    "Stare SPV", "Index incarcare",
]

# Cotele curente. 21% si 11% din 1 august 2025 (Legea 141/2025); 9% ramane
# tranzitoriu pentru locuinte, cu data-limita inca neclara (spec. sectiunea 4).
STANDARD_RATE = Decimal(21)
REDUCED_RATE = Decimal(11)
EXEMPT_CATEGORIES = ("E", "Z", "G", "K", "O")
REVERSE_CHARGE = "AE"


@dataclass(frozen=True)
class JournalRow:
    invoice_id: str
    issue_date: date
    client_name: str
    client_cui: str
    type_code: str
    currency: str
    base_by_rate: dict[Decimal, Decimal]
    vat_by_rate: dict[Decimal, Decimal]
    exempt_base: Decimal
    reverse_charge_base: Decimal
    tax_exclusive: Decimal
    tax_amount: Decimal
    total: Decimal
    spv_status: str
    index_incarcare: str | None


def _amount(value: Any) -> str:
    """Zecimalul romanesc. Excel-ul local nu intelege punctul."""
    return f"{Decimal(str(value or 0)):.2f}".replace(".", ",")


def collect(session: Session, company_id: UUID, period_start: date,
            period_end: date) -> list[JournalRow]:
    """Facturile emise din perioada, cu defalcarea pe cote.

    Ciornele nu apar: nu sunt documente. Cele sterse nici — au fost ultimele din
    serie si nu au ajuns nicaieri.
    """
    rows = session.execute(text("""
        SELECT d.id, d.bt1_invoice_id, d.bt2_issue_date, d.bt3_type_code,
               d.bt5_currency, d.bt109_tax_exclusive, d.bt110_tax_amount,
               d.bt112_tax_inclusive, d.spv_status,
               d.client_snapshot->>'name' AS client_name,
               coalesce(d.client_snapshot->>'legal_reg_id',
                        d.client_snapshot->>'vat_id', '') AS client_cui,
               (SELECT j.index_incarcare FROM efactura_job j
                 WHERE j.document_id = d.id AND j.index_incarcare IS NOT NULL
                 ORDER BY j.created_at DESC LIMIT 1) AS index_incarcare
        FROM document d
        WHERE d.company_id = :company
          AND d.doc_status = 'issued'
          AND d.bt2_issue_date BETWEEN :start AND :end
        ORDER BY d.bt2_issue_date, d.series_name, d.number
    """), {"company": str(company_id), "start": period_start,
           "end": period_end}).all()

    result: list[JournalRow] = []
    for row in rows:
        groups = session.execute(text("""
            SELECT bt118_category, bt119_percent, bt116_taxable, bt117_tax_amount
            FROM vat_breakdown WHERE document_id = :id
        """), {"id": str(row.id)}).all()

        base_by_rate: dict[Decimal, Decimal] = {}
        vat_by_rate: dict[Decimal, Decimal] = {}
        exempt = Decimal(0)
        reverse = Decimal(0)
        for group in groups:
            if group.bt118_category == REVERSE_CHARGE:
                reverse += group.bt116_taxable
            elif group.bt118_category in EXEMPT_CATEGORIES:
                exempt += group.bt116_taxable
            else:
                rate = Decimal(str(group.bt119_percent or 0))
                base_by_rate[rate] = base_by_rate.get(rate, Decimal(0)) + group.bt116_taxable
                vat_by_rate[rate] = vat_by_rate.get(rate, Decimal(0)) + group.bt117_tax_amount

        result.append(JournalRow(
            invoice_id=row.bt1_invoice_id,
            issue_date=row.bt2_issue_date,
            client_name=row.client_name or "",
            client_cui=normalize_cui(row.client_cui or ""),
            type_code=row.bt3_type_code or "380",
            currency=row.bt5_currency,
            base_by_rate=base_by_rate,
            vat_by_rate=vat_by_rate,
            exempt_base=exempt,
            reverse_charge_base=reverse,
            tax_exclusive=row.bt109_tax_exclusive,
            tax_amount=row.bt110_tax_amount,
            total=row.bt112_tax_inclusive,
            spv_status=row.spv_status,
            index_incarcare=row.index_incarcare,
        ))
    return result


def to_csv(rows: list[JournalRow]) -> str:
    """CSV cu antet si rand de total. Contabilul verifica totalul, nu randurile."""
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=DELIMITER, lineterminator="\r\n")
    writer.writerow(COLUMNS)

    totals = {"tax_exclusive": Decimal(0), "tax_amount": Decimal(0),
              "total": Decimal(0)}
    for row in rows:
        writer.writerow([
            row.invoice_id,
            row.issue_date.strftime("%d.%m.%Y"),
            row.client_name,
            row.client_cui,
            row.type_code,
            row.currency,
            _amount(row.base_by_rate.get(STANDARD_RATE, 0)),
            _amount(row.vat_by_rate.get(STANDARD_RATE, 0)),
            _amount(row.base_by_rate.get(REDUCED_RATE, 0)),
            _amount(row.vat_by_rate.get(REDUCED_RATE, 0)),
            _amount(row.exempt_base),
            _amount(row.reverse_charge_base),
            _amount(row.tax_exclusive),
            _amount(row.tax_amount),
            _amount(row.total),
            row.spv_status,
            row.index_incarcare or "",
        ])
        totals["tax_exclusive"] += row.tax_exclusive
        totals["tax_amount"] += row.tax_amount
        totals["total"] += row.total

    writer.writerow([])
    writer.writerow(["TOTAL", "", "", "", "", "", "", "", "", "", "", "",
                     _amount(totals["tax_exclusive"]),
                     _amount(totals["tax_amount"]),
                     _amount(totals["total"]), "", ""])
    return buffer.getvalue()


def export(session: Session, company_id: UUID, period_start: date,
           period_end: date) -> str:
    return to_csv(collect(session, company_id, period_start, period_end))
