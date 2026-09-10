"""Clienti.

Doua constrangeri se aplica aici, la SALVARE, nu la emitere:

  - **11. CUI-ul se normalizeaza la salvare** — fara spatii, fara prefix `RO` in
    campul numeric. Un singur spatiu invalideaza D406, iar D406 se genereaza din
    ce e in baza, nu din ce a tastat operatorul.
  - **12. Checksum-ul se verifica local** — nu e in schematron, iar ANAF il
    respinge separat, cu `ERRIdentif`, dupa ce factura a consumat deja un numar.
    Mai bine 422 acum decat un numar ars si o corectie prin storno.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api.deps import CompanyId, not_found, tenant
from app.api.schemas import ClientIn, ClientOut
from app.core.validation.cui import is_valid_cnp, is_valid_cui, normalize_cui

router = APIRouter(prefix="/api/clients", tags=["clienti"])

COLUMNS = """
    id, bt44_name AS name, bt47_legal_reg_id AS legal_reg_id, bt48_vat_id AS vat_id,
    is_person, vat_payer, bt45_trading_name AS trading_name, legal_info,
    bt50_address1 AS address1, bt51_address2 AS address2, bt52_city AS city,
    bt53_postal_code AS postal_code, bt54_county AS county, bt55_country AS country,
    bt49_electronic_addr AS electronic_addr, contact_name, contact_phone,
    contact_email, iban, bank, code, payment_days
"""


def _identifiers(payload: ClientIn) -> tuple[str | None, str | None]:
    """Normalizeaza si verifica identificatorii. Intoarce (legal_reg_id, vat_id).

    `vat_id` (BT-48) pastreaza prefixul de tara — asa cere EN 16931. `legal_reg_id`
    (BT-47) e strict numeric.
    """
    legal = normalize_cui(payload.legal_reg_id) if payload.legal_reg_id else None
    if legal:
        valid = is_valid_cnp(legal) if payload.is_person else is_valid_cui(legal)
        if not valid:
            kind = "CNP" if payload.is_person else "CUI"
            raise HTTPException(
                status_code=422,
                detail=f"{kind} invalid: cifra de control nu corespunde pentru "
                       f"{payload.legal_reg_id!r}. ANAF respinge separat, cu ERRIdentif.",
            )

    vat = None
    if payload.vat_id:
        vat = "".join(payload.vat_id.split()).upper()
        digits = normalize_cui(vat)
        if vat.startswith("RO") and digits and not is_valid_cui(digits):
            raise HTTPException(
                status_code=422,
                detail=f"Codul de TVA {payload.vat_id!r} nu trece verificarea "
                       "cifrei de control.",
            )
    return legal or None, vat


def _params(payload: ClientIn) -> dict[str, Any]:
    legal, vat = _identifiers(payload)
    data = payload.model_dump()
    data.update(legal_reg_id=legal, vat_id=vat)
    return data


def _integrity(error: IntegrityError) -> HTTPException:
    text_error = str(error.orig)
    if "ck_client_bucharest" in text_error:
        return HTTPException(
            status_code=422,
            detail="Pentru judetul RO-B localitatea trebuie sa fie SECTOR1..SECTOR6, "
                   "nu 'Bucuresti' si nu 'Sector 1'.",
        )
    if "county" in text_error:
        return HTTPException(
            status_code=422,
            detail="Judetul trebuie sa fie cod ISO 3166-2:RO (RO-B, RO-CJ, ...), "
                   "nu text liber.",
        )
    return HTTPException(status_code=422, detail=text_error)


@router.get("", response_model=list[ClientOut])
def list_clients(company_id: CompanyId,
                 search: str | None = Query(default=None, max_length=100),
                 limit: int = Query(default=50, ge=1, le=200),
                 offset: int = Query(default=0, ge=0)) -> list[Any]:
    where = ""
    params: dict[str, Any] = {"limit": limit, "offset": offset}
    if search:
        where = ("WHERE bt44_name ILIKE :search OR bt47_legal_reg_id LIKE :exact "
                 "OR code ILIKE :search")
        params["search"] = f"%{search}%"
        params["exact"] = f"{normalize_cui(search)}%"
    with tenant(company_id) as session:
        return list(session.execute(text(
            f"SELECT {COLUMNS} FROM client {where} ORDER BY bt44_name "
            "LIMIT :limit OFFSET :offset"), params).mappings().all())


@router.post("", response_model=ClientOut, status_code=201)
def create_client(company_id: CompanyId, payload: ClientIn) -> Any:
    params = _params(payload)
    params.update(id=uuid4(), company_id=company_id)
    with tenant(company_id) as session:
        try:
            return session.execute(text("""
                INSERT INTO client (id, company_id, bt44_name, bt47_legal_reg_id,
                    bt48_vat_id, is_person, vat_payer, bt45_trading_name, legal_info,
                    bt50_address1, bt51_address2, bt52_city, bt53_postal_code,
                    bt54_county, bt55_country, bt49_electronic_addr, contact_name,
                    contact_phone, contact_email, iban, bank, code, payment_days)
                VALUES (:id, :company_id, :name, :legal_reg_id, :vat_id, :is_person,
                    :vat_payer, :trading_name, :legal_info, :address1, :address2,
                    :city, :postal_code, :county, :country, :electronic_addr,
                    :contact_name, :contact_phone, :contact_email, :iban, :bank,
                    :code, :payment_days)
                RETURNING """ + COLUMNS), params).mappings().one()
        except IntegrityError as error:
            raise _integrity(error) from error


@router.get("/{client_id}", response_model=ClientOut)
def get_client(company_id: CompanyId, client_id: UUID) -> Any:
    with tenant(company_id) as session:
        row = session.execute(
            text(f"SELECT {COLUMNS} FROM client WHERE id = :id"),
            {"id": str(client_id)}).mappings().one_or_none()
    if row is None:
        raise not_found("Clientul", client_id)
    return row


@router.put("/{client_id}", response_model=ClientOut)
def update_client(company_id: CompanyId, client_id: UUID, payload: ClientIn) -> Any:
    params = _params(payload)
    params["id"] = str(client_id)
    with tenant(company_id) as session:
        try:
            row = session.execute(text("""
                UPDATE client SET bt44_name = :name, bt47_legal_reg_id = :legal_reg_id,
                    bt48_vat_id = :vat_id, is_person = :is_person, vat_payer = :vat_payer,
                    bt45_trading_name = :trading_name, legal_info = :legal_info,
                    bt50_address1 = :address1, bt51_address2 = :address2,
                    bt52_city = :city, bt53_postal_code = :postal_code,
                    bt54_county = :county, bt55_country = :country,
                    bt49_electronic_addr = :electronic_addr, contact_name = :contact_name,
                    contact_phone = :contact_phone, contact_email = :contact_email,
                    iban = :iban, bank = :bank, code = :code, payment_days = :payment_days
                WHERE id = :id
                RETURNING """ + COLUMNS), params).mappings().one_or_none()
        except IntegrityError as error:
            raise _integrity(error) from error
    if row is None:
        raise not_found("Clientul", client_id)
    return row


@router.delete("/{client_id}", status_code=204, response_model=None)
def delete_client(company_id: CompanyId, client_id: UUID) -> None:
    """Refuza daca exista documente pe client.

    Instantaneele din documentele emise raman corecte si dupa stergere — ele nu
    citesc randul curent — dar ciornele si legatura din liste s-ar rupe. Mai
    onest sa spui de ce nu se poate decat sa stergi si sa lasi referinte moarte.
    """
    with tenant(company_id) as session:
        used = session.execute(
            text("SELECT count(*) FROM document WHERE client_id = :id"),
            {"id": str(client_id)}).scalar_one()
        if used:
            raise HTTPException(
                status_code=409,
                detail=f"Clientul are {used} documente si nu se poate sterge.",
            )
        deleted = session.execute(
            text("DELETE FROM client WHERE id = :id RETURNING id"),
            {"id": str(client_id)}).one_or_none()
    if deleted is None:
        raise not_found("Clientul", client_id)
