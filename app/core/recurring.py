"""Recurentele: sabloane, generarea ciornelor si aprobarea in bloc.

Fluxul, din TODO.md punctul 7:

    noaptea:    se genereaza ciornele lunii SI se trec prin validator
    dimineata:  se aproba in bloc, dar numai documentele pre-verificate
    emiterea:   in lot, cu tranzactie per document

Ordinea are un scop. Validarea noaptea, nu dimineata, inseamna ca omul care
aproba vede o lista deja curatata: ce a picat e separat, cu motivul scris. Fara
asta, aprobarea in bloc devine un buton care produce erori in bloc.

Idempotenta e in schema, nu in cod: `UNIQUE (template_id, period)` pe
`recurring_run`. Jobul de noapte poate rula de doua ori — dupa o repornire, dupa
o restaurare din backup — si a doua rulare nu mai are ce insera.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import documents
from app.core.validation.br_ro import Report, validate

FREQUENCY_MONTHS = {"monthly": 1, "quarterly": 3, "yearly": 12}


class RecurringError(RuntimeError):
    pass


@dataclass(frozen=True)
class GeneratedDraft:
    template_id: UUID
    period: date
    document_id: UUID | None
    status: str
    report: Report

    @property
    def ok(self) -> bool:
        return self.status == "validated"


def period_start(reference: date, frequency: str) -> date:
    """Prima zi a perioadei care contine `reference`.

    E cheia de idempotenta, deci trebuie sa fie stabila: aceeasi zi din aceeasi
    luna da mereu aceeasi perioada, indiferent cand ruleaza jobul.
    """
    months = FREQUENCY_MONTHS.get(frequency)
    if months is None:
        raise RecurringError(f"Frecventa '{frequency}' nu exista.")
    if months == 1:
        return date(reference.year, reference.month, 1)
    if months == 3:
        return date(reference.year, ((reference.month - 1) // 3) * 3 + 1, 1)
    return date(reference.year, 1, 1)


def add_months(day: date, months: int) -> date:
    """Aduna luni pastrand ziua. Ziua e limitata la 28 in schema, deci nu se pierde."""
    total = day.month - 1 + months
    year = day.year + total // 12
    month = total % 12 + 1
    return date(year, month, day.day)


def next_issue_date(template: Any, after: date) -> date:
    """Prima data de facturare strict dupa `after`."""
    candidate = date(after.year, after.month, template.day_of_month)
    if candidate <= after:
        candidate = add_months(candidate, FREQUENCY_MONTHS[template.frequency])
    return candidate


def due(session: Session, on_date: date) -> list[Any]:
    """Sabloanele pentru care trebuie generata o ciorna azi.

    Se genereaza cu `lead_days` inainte de data facturii, ca dimineata sa existe
    ce aproba. Sabloanele fara ciorna pentru perioada curenta apar aici; cele cu
    ciorna deja generata, nu — dar filtrarea finala o face constrangerea unica,
    nu interogarea asta.
    """
    return list(session.execute(text("""
        SELECT * FROM recurring_template
        WHERE is_active
          AND start_date <= :today
          AND (end_date IS NULL OR end_date >= :today)
        ORDER BY name
    """), {"today": on_date}).all())


def _is_due(template: Any, on_date: date) -> tuple[bool, date, date]:
    """(trebuie generat azi, data facturii, perioada facturata)."""
    issue_date = date(on_date.year, on_date.month, template.day_of_month)
    if issue_date < on_date:
        issue_date = add_months(issue_date, FREQUENCY_MONTHS[template.frequency])
    generate_from = issue_date - timedelta(days=template.lead_days)
    return (generate_from <= on_date <= issue_date,
            issue_date,
            period_start(issue_date, template.frequency))


def generate(session: Session, template: Any, *, on_date: date) -> GeneratedDraft | None:
    """Creeaza ciorna pentru perioada curenta si o trece prin validator.

    Intoarce None cand sablonul nu e scadent azi sau cand ciorna exista deja.
    Nu ridica exceptie in niciunul din cele doua cazuri: jobul de noapte trece
    prin toate sabloanele si nu are ce sa raporteze pentru cele fara treaba.
    """
    is_due, issue_date, period = _is_due(template, on_date)
    if not is_due:
        return None

    existing = session.execute(text("""
        SELECT id FROM recurring_run WHERE template_id = :t AND period = :p
    """), {"t": str(template.id), "p": period}).one_or_none()
    if existing is not None:
        return None

    document_id = uuid4()
    due_date = (issue_date + timedelta(days=template.payment_days)
                if template.payment_days else None)

    session.execute(text("""
        INSERT INTO document (id, company_id, doc_type, bt3_type_code,
                              series_id, series_name, client_id,
                              client_snapshot, seller_snapshot,
                              bt2_issue_date, bt9_due_date,
                              bt5_currency, bt20_payment_terms,
                              bt73_period_start, bt74_period_end,
                              doc_status)
        SELECT :doc, :company, 'factura', '380', s.id, s.name, :client,
               '{}', '{}', :issue_date, :due_date, :currency, :terms,
               :period_start, :period_end, 'draft'
        FROM doc_series s WHERE s.id = :series
    """), {
        "doc": str(document_id),
        "company": str(template.company_id),
        "client": str(template.client_id),
        "series": str(template.series_id),
        "issue_date": issue_date,
        "due_date": due_date,
        "currency": template.bt5_currency,
        "terms": template.bt20_payment_terms,
        "period_start": period,
        "period_end": add_months(period, FREQUENCY_MONTHS[template.frequency])
                      - timedelta(days=1),
    })

    session.execute(text("""
        INSERT INTO document_line (document_id, bt126_line_id, position, product_id,
            bt153_name, bt154_description, bt129_quantity, bt130_unit_code,
            bt146_item_price, bt131_line_net, bt151_vat_category,
            bt152_vat_percent, saft_tax_code)
        SELECT :doc, position::text, position, product_id,
               bt153_name, bt154_description, bt129_quantity, bt130_unit_code,
               bt146_item_price,
               round(bt129_quantity * bt146_item_price, 2),
               bt151_vat_category, bt152_vat_percent, saft_tax_code
        FROM recurring_template_line
        -- Calificat: intr-un `INSERT ... SELECT`, `position` e si coloana tinta,
        -- si coloana sursa, iar Postgres refuza sa ghiceasca.
        WHERE template_id = :template ORDER BY recurring_template_line.position
    """), {"doc": str(document_id), "template": str(template.id)})

    if template.note:
        session.execute(text("""
            INSERT INTO document_note (document_id, position, bt22_note)
            VALUES (:doc, 1, :note)
        """), {"doc": str(document_id), "note": template.note})

    # Validarea se face ACUM, noaptea. Dimineata se aproba doar ce a trecut.
    report = check(session, document_id)
    status = "validated" if report.ok else "rejected"

    session.execute(text("""
        INSERT INTO recurring_run (template_id, period, document_id, status, report)
        VALUES (:template, :period, :doc, :status, CAST(:report AS jsonb))
    """), {"template": str(template.id), "period": period,
           "doc": str(document_id), "status": status,
           "report": _report_json(report)})

    return GeneratedDraft(template_id=template.id, period=period,
                          document_id=document_id, status=status, report=report)


def check(session: Session, document_id: UUID) -> Report:
    """Valideaza o ciorna fara sa aloce numar si fara sa emita.

    Numarul prospectiv se citeste din serie FARA `FOR UPDATE`: e provizoriu prin
    definitie, iar validarea nu are voie sa tina un lock pe serie cat ruleaza
    peste toate sabloanele lunii.

    Asta e si ce trebuie legat pe Ctrl+Enter in editor: verificare, nu emitere.
    """
    row = session.execute(text("""
        SELECT s.name, s.next_number, s.padding
        FROM document d JOIN doc_series s ON s.id = d.series_id
        WHERE d.id = :id
    """), {"id": str(document_id)}).one_or_none()
    if row is None:
        raise documents.DocumentNotFound(f"Documentul {document_id} nu exista.")

    prospective = f"{row.name}{str(row.next_number).zfill(row.padding)}"
    loaded = documents.load(session, document_id, invoice_id=prospective)
    totals = documents.compute_document_totals(loaded["lines"], loaded["allowances"])

    # Totalurile se scriu pe ciorna: ecranul de aprobare arata sume, nu linii.
    session.execute(text("""
        UPDATE document SET
          bt106_line_total = :line_total, bt109_tax_exclusive = :tax_exclusive,
          bt110_tax_amount = :tax_amount, bt112_tax_inclusive = :tax_inclusive,
          bt115_payable = :payable, updated_at = now()
        WHERE id = :id
    """), {"id": str(document_id), "line_total": totals.line_total,
           "tax_exclusive": totals.tax_exclusive, "tax_amount": totals.tax_amount,
           "tax_inclusive": totals.tax_inclusive, "payable": totals.payable})
    session.execute(text("DELETE FROM vat_breakdown WHERE document_id = :id"),
                    {"id": str(document_id)})
    for group in totals.breakdown:
        session.execute(text("""
            INSERT INTO vat_breakdown (document_id, bt118_category, bt119_percent,
                                       bt116_taxable, bt117_tax_amount)
            VALUES (:doc, :category, :percent, :taxable, :tax)
        """), {"doc": str(document_id), "category": group.category,
               "percent": group.percent, "taxable": group.taxable,
               "tax": group.tax_amount})

    return validate(documents.load(session, document_id, invoice_id=prospective))


def _report_json(report: Report) -> str:
    return json.dumps([{
        "rule": finding.rule,
        "severity": finding.severity,
        "field": finding.field_path,
        "message": finding.message,
    } for finding in report.findings], ensure_ascii=False)


def generate_all(session: Session, on_date: date) -> list[GeneratedDraft]:
    """Jobul de noapte. Trece prin toate sabloanele active ale firmei."""
    drafts = []
    for template in due(session, on_date):
        generated = generate(session, template, on_date=on_date)
        if generated is not None:
            drafts.append(generated)
    return drafts


def pending_approval(session: Session) -> list[dict[str, Any]]:
    """Ecranul de dimineata: doar ciornele PRE-VERIFICATE.

    Cele respinse nu apar aici. Se vad separat, cu raportul lor, si se corecteaza
    manual — o aprobare in bloc care contine documente picate e un buton care
    produce erori in bloc.
    """
    rows = session.execute(text("""
        SELECT r.id AS run_id, r.template_id, r.period, r.document_id,
               t.name AS template_name,
               d.bt2_issue_date, d.bt115_payable, d.bt5_currency,
               d.client_snapshot->>'name' AS client_name
        FROM recurring_run r
        JOIN recurring_template t ON t.id = r.template_id
        JOIN document d ON d.id = r.document_id
        WHERE r.status = 'validated' AND d.doc_status = 'draft'
        ORDER BY r.period, t.name
    """)).all()
    return [dict(row._mapping) for row in rows]


def rejected(session: Session) -> list[dict[str, Any]]:
    """Ciornele care au picat validarea noaptea, cu motivul."""
    rows = session.execute(text("""
        SELECT r.id AS run_id, r.template_id, r.period, r.document_id, r.report,
               t.name AS template_name
        FROM recurring_run r
        JOIN recurring_template t ON t.id = r.template_id
        WHERE r.status = 'rejected'
        ORDER BY r.period, t.name
    """)).all()
    return [dict(row._mapping) for row in rows]


def approve(session: Session, run_ids: list[UUID]) -> dict[UUID, Any]:
    """Emite in bloc ciornele aprobate. Tranzactie per document.

    Se refuza rulele care nu sunt `validated`: aprobarea in bloc opereaza numai
    pe ce a trecut deja validatorul noaptea.
    """
    from app.core import issue

    results: dict[UUID, Any] = {}
    for run_id in run_ids:
        row = session.execute(text("""
            SELECT document_id, status FROM recurring_run WHERE id = :id
        """), {"id": str(run_id)}).one_or_none()
        if row is None:
            raise RecurringError(f"Rularea {run_id} nu exista.")
        if row.status != "validated":
            raise RecurringError(
                f"Rularea {run_id} are starea '{row.status}'. Se aproba in bloc "
                "doar ciornele pre-verificate.")

        result = issue.issue(session, row.document_id)
        results[run_id] = result
        if result.ok:
            session.execute(text("""
                UPDATE recurring_run SET status = 'issued' WHERE id = :id
            """), {"id": str(run_id)})
        else:
            # A trecut noaptea si pica acum: intre timp s-a schimbat ceva in
            # date. Se intoarce in lista de corectat, cu raportul nou.
            session.execute(text("""
                UPDATE recurring_run SET status = 'rejected',
                       report = CAST(:report AS jsonb)
                WHERE id = :id
            """), {"id": str(run_id), "report": _report_json(result.report)})
    return results
