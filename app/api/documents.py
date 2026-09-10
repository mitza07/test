"""Documente: ciorne, verificare, emitere, storno, stergere.

Endpointurile sunt subtiri. Toata logica sensibila e in `app.core.issue`,
`app.core.numbering` si `app.core.documents`, unde e deja testata pe Postgres
real. Ce adauga stratul asta sunt granitele:

  - **`PUT` pe un document emis intoarce 409.** Constrangerea 6: o factura emisa
    nu se modifica sub nicio forma. Corectia e storno, nu editare.
  - **`/check` nu aloca numar.** E ce trebuie legat pe Ctrl+Enter in editor.
    Constrangerea 9 cere ca numarul sa se consume doar dupa validare, iar o
    verificare care ar consuma unul ar lasa gauri in serie la fiecare tastare.
  - **`/issue` care pica validarea intoarce 422 cu raportul**, nu 500. Ciorna
    ramane ciorna si `next_number` ramane neatins.
  - **Cele trei axe de stare se filtreaza separat.** Nu exista o „stare a
    facturii": `doc_status`, `payment_status` si `spv_status` sunt ortogonale.
"""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CompanyId, not_found, tenant
from app.api.schemas import (
    DocumentSummary,
    DraftIn,
    DraftUpdate,
    IssueOut,
    ReportOut,
    StornoIn,
)
from app.core import documents as core_documents
from app.core import issue as core_issue
from app.core import recurring
from app.core.validation.br_ro import Report

router = APIRouter(prefix="/api/documents", tags=["documente"])

SUMMARY = """
    d.id, d.doc_type, d.series_name, d.number, d.bt1_invoice_id AS invoice_id,
    d.bt2_issue_date AS issue_date, d.bt9_due_date AS due_date,
    coalesce(c.bt44_name, d.client_snapshot->>'name') AS client_name,
    d.bt5_currency AS currency, d.bt115_payable AS payable, d.total_collected,
    d.doc_status, d.payment_status, d.spv_status
"""


def _report_out(report: Report) -> ReportOut:
    return ReportOut(
        ok=report.ok,
        findings=[{  # type: ignore[list-item]
            "rule": f.rule, "severity": f.severity, "field_path": f.field_path,
            "message": f.message, "bt_ref": f.bt_ref,
        } for f in report.findings],
    )


def _series(session: Session, series_id: UUID) -> Any:
    row = session.execute(text(
        "SELECT id, name, doc_type, is_active FROM doc_series WHERE id = :id"),
        {"id": str(series_id)}).one_or_none()
    if row is None:
        raise not_found("Seria", series_id)
    if not row.is_active:
        raise HTTPException(status_code=409,
                            detail=f"Seria '{row.name}' este inactiva.")
    return row


def _saft_code(session: Session, company_id: UUID, category: str,
               percent: Any, on_date: date) -> str:
    """`TaxCode` din `vat_rate`. Constrangerea 10: obligatoriu pe FIECARE linie.

    Se rezolva la scrierea ciornei, nu la export. Lipsa lui e eroarea numarul
    unu la validarea D406, iar D406 se depune lunar — cu mult dupa ce factura a
    plecat la ANAF si nu mai poate fi corectata decat prin storno.
    """
    row = session.execute(text("""
        SELECT saft_tax_code FROM vat_rate
        WHERE company_id = :c AND category_code = :cat
          AND percent = coalesce(:pct, 0)
          AND valid_from <= :on_date AND (valid_to IS NULL OR valid_to >= :on_date)
        ORDER BY valid_from DESC LIMIT 1
    """), {"c": str(company_id), "cat": category, "pct": percent,
           "on_date": on_date}).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=422,
            detail=f"Nu exista o cota de TVA definita pentru categoria {category} "
                   f"cu {percent or 0}% valabila la {on_date}. `TaxCode` (SAF-T) "
                   "e obligatoriu pe fiecare linie, iar el vine din `vat_rate`.",
        )
    return str(row)


def _write_lines(session: Session, company_id: UUID, document_id: UUID,
                 payload: DraftIn, issue_date: date) -> None:
    session.execute(text("DELETE FROM document_line WHERE document_id = :d"),
                    {"d": str(document_id)})
    for position, line in enumerate(payload.lines, start=1):
        saft = line.saft_tax_code or _saft_code(
            session, company_id, line.vat_category, line.vat_percent, issue_date)
        session.execute(text("""
            INSERT INTO document_line (document_id, bt126_line_id, position,
                product_id, bt153_name, bt154_description, bt129_quantity,
                bt130_unit_code, bt146_item_price, bt131_line_net, bt127_note,
                bt151_vat_category, bt152_vat_percent, bt155_seller_code,
                bt156_buyer_code, saft_tax_code, vat_included)
            VALUES (:d, :line_id, :position, :product_id, :name, :description,
                :quantity, :unit_code, :unit_price,
                round(:quantity * :unit_price, 2), :note, :vat_category,
                :vat_percent, :seller_code, :buyer_code, :saft, :vat_included)
        """), {
            "d": str(document_id), "line_id": str(position), "position": position,
            "product_id": line.product_id, "name": line.name,
            "description": line.description, "quantity": line.quantity,
            "unit_code": line.unit_code, "unit_price": line.unit_price,
            "note": line.note, "vat_category": line.vat_category,
            "vat_percent": line.vat_percent, "seller_code": line.seller_code,
            "buyer_code": line.buyer_code, "saft": saft,
            "vat_included": line.vat_included,
        })

    session.execute(text("DELETE FROM document_note WHERE document_id = :d"),
                    {"d": str(document_id)})
    for position, note in enumerate(payload.notes, start=1):
        session.execute(text("""
            INSERT INTO document_note (document_id, position, bt22_note)
            VALUES (:d, :p, :n)
        """), {"d": str(document_id), "p": position, "n": note})


def _due_date(session: Session, payload: DraftIn, issue_date: date) -> date | None:
    """Scadenta explicita bate termenul clientului; fara niciunul, ramane goala."""
    if payload.due_date is not None:
        return payload.due_date
    if payload.client_id is None:
        return None
    days = session.execute(
        text("SELECT payment_days FROM client WHERE id = :id"),
        {"id": str(payload.client_id)}).scalar_one_or_none()
    if not days:
        return None
    from datetime import timedelta
    return issue_date + timedelta(days=int(days))


@router.get("", response_model=list[DocumentSummary])
def list_documents(company_id: CompanyId,
                   doc_status: str | None = None,
                   payment_status: str | None = None,
                   spv_status: str | None = None,
                   client_id: UUID | None = None,
                   series_id: UUID | None = None,
                   issued_from: date | None = None,
                   issued_to: date | None = None,
                   search: str | None = Query(default=None, max_length=100),
                   limit: int = Query(default=50, ge=1, le=200),
                   offset: int = Query(default=0, ge=0)) -> list[Any]:
    clauses = ["d.doc_status <> 'deleted'"]
    params: dict[str, Any] = {"limit": limit, "offset": offset}
    for column, value in (("doc_status", doc_status),
                          ("payment_status", payment_status),
                          ("spv_status", spv_status)):
        if value:
            clauses.append(f"d.{column} = :{column}")
            params[column] = value
    if client_id:
        clauses.append("d.client_id = :client_id")
        params["client_id"] = str(client_id)
    if series_id:
        clauses.append("d.series_id = :series_id")
        params["series_id"] = str(series_id)
    if issued_from:
        clauses.append("d.bt2_issue_date >= :issued_from")
        params["issued_from"] = issued_from
    if issued_to:
        clauses.append("d.bt2_issue_date <= :issued_to")
        params["issued_to"] = issued_to
    if search:
        clauses.append("(d.bt1_invoice_id ILIKE :search "
                       "OR coalesce(c.bt44_name, d.client_snapshot->>'name') "
                       "ILIKE :search)")
        params["search"] = f"%{search}%"

    with tenant(company_id) as session:
        return list(session.execute(text(f"""
            SELECT {SUMMARY} FROM document d
            LEFT JOIN client c ON c.id = d.client_id
            WHERE {' AND '.join(clauses)}
            ORDER BY d.bt2_issue_date DESC, d.number DESC NULLS FIRST
            LIMIT :limit OFFSET :offset
        """), params).mappings().all())


@router.post("", status_code=201)
def create_draft(company_id: CompanyId, payload: DraftIn) -> dict[str, Any]:
    """Ciorna, fara numar.

    `number` si `bt1_invoice_id` raman NULL pana la emitere — migratia 0004 le-a
    facut optionale exact pentru asta. Instantaneele partilor raman goale cat
    documentul e ciorna: `documents.load` citeste randurile vii pana la emitere,
    si abia atunci le ingheata.
    """
    issue_date = payload.issue_date or date.today()
    document_id = uuid4()
    with tenant(company_id) as session:
        series = _series(session, payload.series_id)
        try:
            session.execute(text("""
                INSERT INTO document (id, company_id, doc_type, bt3_type_code,
                    series_id, series_name, client_id, client_snapshot,
                    seller_snapshot, bt2_issue_date, bt9_due_date, bt5_currency,
                    bt6_tax_currency, bt20_payment_terms, bt10_buyer_reference,
                    bt12_contract_number, bt13_order_number, internal_note,
                    doc_status)
                VALUES (:id, :company_id, :doc_type, :type_code, :series_id,
                    :series_name, :client_id, '{}'::jsonb, '{}'::jsonb, :issue_date,
                    :due_date, :currency, :tax_currency, :payment_terms,
                    :buyer_reference, :contract_number, :order_number,
                    :internal_note, 'draft')
            """), {
                "id": document_id, "company_id": company_id,
                "doc_type": payload.doc_type, "type_code": payload.type_code,
                "series_id": payload.series_id, "series_name": series.name,
                "client_id": payload.client_id, "issue_date": issue_date,
                "due_date": _due_date(session, payload, issue_date),
                "currency": payload.currency, "tax_currency": payload.tax_currency,
                "payment_terms": payload.payment_terms,
                "buyer_reference": payload.buyer_reference,
                "contract_number": payload.contract_number,
                "order_number": payload.order_number,
                "internal_note": payload.internal_note,
            })
        except IntegrityError as error:
            raise HTTPException(status_code=422, detail=str(error.orig)) from error
        _write_lines(session, company_id, document_id, payload, issue_date)
    return {"id": str(document_id), "doc_status": "draft", "draft_version": 1}


@router.get("/{document_id}")
def get_document(company_id: CompanyId, document_id: UUID) -> dict[str, Any]:
    """Documentul in aceeasi forma pe care o consuma validatorul si generatorul UBL."""
    with tenant(company_id) as session:
        try:
            loaded = core_documents.load(session, document_id)
        except core_documents.DocumentNotFound as error:
            raise not_found("Documentul", document_id) from error
        state = session.execute(text(
            "SELECT doc_status, payment_status, spv_status, draft_version, "
            "total_collected FROM document WHERE id = :id"),
            {"id": str(document_id)}).mappings().one()
    return {**loaded, **state}


@router.put("/{document_id}")
def update_draft(company_id: CompanyId, document_id: UUID,
                 payload: DraftUpdate) -> dict[str, Any]:
    """Doar ciornele. Un document emis nu se editeaza — se storneaza."""
    issue_date = payload.issue_date or date.today()
    with tenant(company_id) as session:
        current = session.execute(text(
            "SELECT doc_status, draft_version FROM document WHERE id = :id FOR UPDATE"),
            {"id": str(document_id)}).one_or_none()
        if current is None:
            raise not_found("Documentul", document_id)
        if current.doc_status != "draft":
            raise HTTPException(
                status_code=409,
                detail=f"Documentul este in starea '{current.doc_status}'. O factura "
                       "emisa nu se modifica; corectia se face prin storno.",
            )
        if (payload.draft_version is not None
                and payload.draft_version != current.draft_version):
            raise HTTPException(
                status_code=409,
                detail=f"Ciorna a fost modificata intre timp (versiunea "
                       f"{current.draft_version}, trimisa {payload.draft_version}). "
                       "Reincarca inainte sa salvezi.",
            )

        series = _series(session, payload.series_id)
        session.execute(text("""
            UPDATE document SET doc_type = :doc_type, bt3_type_code = :type_code,
                series_id = :series_id, series_name = :series_name,
                client_id = :client_id, bt2_issue_date = :issue_date,
                bt9_due_date = :due_date, bt5_currency = :currency,
                bt6_tax_currency = :tax_currency, bt20_payment_terms = :payment_terms,
                bt10_buyer_reference = :buyer_reference,
                bt12_contract_number = :contract_number,
                bt13_order_number = :order_number, internal_note = :internal_note,
                draft_version = draft_version + 1, updated_at = now()
            WHERE id = :id
        """), {
            "id": str(document_id), "doc_type": payload.doc_type,
            "type_code": payload.type_code, "series_id": payload.series_id,
            "series_name": series.name, "client_id": payload.client_id,
            "issue_date": issue_date,
            "due_date": _due_date(session, payload, issue_date),
            "currency": payload.currency, "tax_currency": payload.tax_currency,
            "payment_terms": payload.payment_terms,
            "buyer_reference": payload.buyer_reference,
            "contract_number": payload.contract_number,
            "order_number": payload.order_number,
            "internal_note": payload.internal_note,
        })
        _write_lines(session, company_id, document_id, payload, issue_date)
        version = current.draft_version + 1
    return {"id": str(document_id), "doc_status": "draft", "draft_version": version}


@router.post("/{document_id}/check", response_model=ReportOut)
def check_draft(company_id: CompanyId, document_id: UUID) -> ReportOut:
    """Verificare fara emitere. Ctrl+Enter din editor ajunge aici.

    Numarul prospectiv se citeste din serie fara lock si nu se consuma.
    """
    with tenant(company_id) as session:
        try:
            report = recurring.check(session, document_id)
        except core_documents.DocumentNotFound as error:
            raise not_found("Documentul", document_id) from error
    return _report_out(report)


@router.post("/{document_id}/issue", response_model=IssueOut)
def issue_document(company_id: CompanyId, document_id: UUID, response: Response,
                   expected_version: int | None = None) -> IssueOut:
    """Emite ciorna. 422 cand pica validarea, si atunci numarul NU se consuma."""
    with tenant(company_id) as session:
        try:
            result = core_issue.issue(session, document_id,
                                      expected_version=expected_version)
        except core_documents.DocumentNotFound as error:
            raise not_found("Documentul", document_id) from error
        except core_issue.IssueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
    if not result.ok:
        response.status_code = 422
    return IssueOut(ok=result.ok, invoice_id=result.invoice_id,
                    number=result.number, report=_report_out(result.report))


@router.post("/{document_id}/storno", status_code=201)
def create_storno(company_id: CompanyId, document_id: UUID,
                  payload: StornoIn) -> dict[str, Any]:
    """Stornarea produce o CIORNA noua; originalul ramane neatins.

    Ciorna trece prin `/issue` ca oricare alta, deci primeste numar tot dupa ce
    valideaza.
    """
    with tenant(company_id) as session:
        try:
            storno_id = core_issue.create_storno(
                session, document_id, type_code=payload.type_code,
                issue_date=payload.issue_date)
        except core_documents.DocumentNotFound as error:
            raise not_found("Documentul", document_id) from error
        except core_issue.IssueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
    return {"id": str(storno_id), "doc_status": "draft",
            "type_code": payload.type_code}


@router.delete("/{document_id}", status_code=204, response_model=None)
def delete_document(company_id: CompanyId, document_id: UUID) -> None:
    """Sterge doar ultimul document din serie, si doar daca n-a plecat la SPV.

    Verificarea si stergerea sunt in aceeasi tranzactie (constrangerea 8): intre
    afisarea butonului si click poate aparea alt document in serie.
    """
    with tenant(company_id) as session:
        exists = session.execute(text("SELECT 1 FROM document WHERE id = :id"),
                                 {"id": str(document_id)}).one_or_none()
        if exists is None:
            raise not_found("Documentul", document_id)
        allowed, reason = core_issue.delete_document(session, document_id)
        if not allowed:
            raise HTTPException(status_code=409, detail=reason)
