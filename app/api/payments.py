"""Incasari.

Incasarea se inregistreaza si pe o factura emisa, si asta NU incalca
imuabilitatea. Constrangerea 6 acopera continutul documentului — sume, linii,
parti. `payment_status` e o axa separata, exact pentru ca realitatea comerciala
se schimba dupa emitere: o factura poate fi simultan emisa, respinsa de SPV si
incasata.

Ce nu se atinge de aici: `bt115_payable` si celelalte totaluri BG-22. O incasare
schimba cat s-a incasat, nu cat se datoreaza.

`overdue` nu se seteaza aici. E o stare care depinde de trecerea timpului, nu de
un eveniment de incasare; locul ei e intr-un job zilnic, cand va exista.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import CompanyId, not_found, tenant
from app.api.schemas import PaymentIn, PaymentState

router = APIRouter(prefix="/api", tags=["incasari"])

COLUMNS = ("id, document_id, payment_type, value, issue_date, document_number, "
           "series_id, mentions")


def _recompute(session: Session, document_id: UUID) -> dict[str, Any]:
    """Recalculeaza din randurile de incasare, nu incremental.

    Un `total_collected = total_collected + :value` s-ar desincroniza la prima
    stergere de incasare sau la prima rulare dubla a unui job.
    """
    # CAST, nu `::numeric` — SQLAlchemy citeste `::` ca inceput de bind parameter.
    # Fara el, `sum()` peste zero randuri intoarce un intreg si suma pleaca pe fir
    # ca "0" langa un "1210.00", desi coloana e numeric(18,2).
    collected = session.execute(text(
        "SELECT CAST(coalesce(sum(value), 0) AS numeric(18,2)) "
        "FROM payment WHERE document_id = :d"),
        {"d": str(document_id)}).scalar_one()
    payable = session.execute(text(
        "SELECT bt115_payable FROM document WHERE id = :d"),
        {"d": str(document_id)}).scalar_one()

    collected = Decimal(collected)
    payable = Decimal(payable or 0)
    if collected <= 0:
        status = "unpaid"
    elif collected < payable:
        status = "partial"
    else:
        status = "paid"

    session.execute(text("""
        UPDATE document SET total_collected = :collected, payment_status = :status,
                            updated_at = now()
        WHERE id = :d
    """), {"d": str(document_id), "collected": collected, "status": status})
    return {"total_collected": collected, "payable": payable,
            "payment_status": status}


def _state(session: Session, document_id: UUID) -> dict[str, Any]:
    payments = list(session.execute(text(
        f"SELECT {COLUMNS} FROM payment WHERE document_id = :d "
        "ORDER BY issue_date, created_at"), {"d": str(document_id)}).mappings().all())
    return {"payments": payments, **_recompute(session, document_id)}


def _document(session: Session, document_id: UUID) -> Any:
    row = session.execute(text(
        "SELECT doc_status FROM document WHERE id = :id"),
        {"id": str(document_id)}).one_or_none()
    if row is None:
        raise not_found("Documentul", document_id)
    return row


@router.get("/documents/{document_id}/payments", response_model=PaymentState)
def list_payments(company_id: CompanyId, document_id: UUID) -> Any:
    with tenant(company_id) as session:
        _document(session, document_id)
        return _state(session, document_id)


@router.post("/documents/{document_id}/payments", response_model=PaymentState,
             status_code=201)
def add_payment(company_id: CompanyId, document_id: UUID, payload: PaymentIn) -> Any:
    with tenant(company_id) as session:
        document = _document(session, document_id)
        if document.doc_status in ("deleted", "canceled"):
            raise HTTPException(
                status_code=409,
                detail=f"Documentul este '{document.doc_status}'; nu se pot "
                       "inregistra incasari pe el.",
            )
        session.execute(text("""
            INSERT INTO payment (id, document_id, payment_type, series_id,
                                 document_number, issue_date, value, mentions)
            VALUES (:id, :document_id, :payment_type, :series_id, :document_number,
                    :issue_date, :value, :mentions)
        """), {
            "id": uuid4(), "document_id": str(document_id),
            "payment_type": payload.payment_type, "series_id": payload.series_id,
            "document_number": payload.document_number,
            "issue_date": payload.issue_date or date.today(),
            "value": payload.value, "mentions": payload.mentions,
        })
        return _state(session, document_id)


@router.delete("/payments/{payment_id}", response_model=PaymentState)
def delete_payment(company_id: CompanyId, payment_id: UUID) -> Any:
    """Stergerea unei incasari gresite recalculeaza starea documentului."""
    with tenant(company_id) as session:
        document_id = session.execute(text(
            "DELETE FROM payment WHERE id = :id RETURNING document_id"),
            {"id": str(payment_id)}).scalar_one_or_none()
        if document_id is None:
            raise not_found("Incasarea", payment_id)
        return _state(session, UUID(str(document_id)))
