"""Produse si servicii.

`unit_code` e cod UN/ECE Rec 20 si e cheie straina catre `measuring_unit`, deci
o eticheta locala („buc", „ora") e respinsa de baza, nu de un `if` din Python.
Eticheta de afisare e camp separat pe linia de document (`unit_translation`).
"""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api.deps import CompanyId, not_found, tenant
from app.api.schemas import ProductIn, ProductOut

router = APIRouter(prefix="/api/products", tags=["produse"])

COLUMNS = """
    id, bt153_name AS name, bt154_description AS description, unit_code,
    product_type, price, currency, bt155_seller_code AS seller_code,
    bt156_buyer_code AS buyer_code, bt157_gtin AS gtin,
    bt158_class_code AS class_code, bt158_class_scheme AS class_scheme,
    bt159_origin_country AS origin_country, vat_included, is_salable
"""

FIELDS = ("name", "description", "unit_code", "product_type", "price", "currency",
          "seller_code", "buyer_code", "gtin", "class_code", "class_scheme",
          "origin_country", "vat_included", "is_salable")


def _integrity(error: IntegrityError) -> HTTPException:
    detail = str(error.orig)
    if "measuring_unit" in detail:
        return HTTPException(
            status_code=422,
            detail="Unitatea de masura trebuie sa fie cod UN/ECE Rec 20 "
                   "(H87 bucata, HUR ora, MON luna), nu eticheta locala.",
        )
    return HTTPException(status_code=422, detail=detail)


@router.get("", response_model=list[ProductOut])
def list_products(company_id: CompanyId,
                  search: str | None = Query(default=None, max_length=100),
                  salable_only: bool = True,
                  limit: int = Query(default=50, ge=1, le=200),
                  offset: int = Query(default=0, ge=0)) -> list[Any]:
    clauses = []
    params: dict[str, Any] = {"limit": limit, "offset": offset}
    if salable_only:
        clauses.append("is_salable")
    if search:
        clauses.append("(bt153_name ILIKE :search OR bt155_seller_code ILIKE :search)")
        params["search"] = f"%{search}%"
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with tenant(company_id) as session:
        return list(session.execute(text(
            f"SELECT {COLUMNS} FROM product {where} ORDER BY bt153_name "
            "LIMIT :limit OFFSET :offset"), params).mappings().all())


@router.post("", response_model=ProductOut, status_code=201)
def create_product(company_id: CompanyId, payload: ProductIn) -> Any:
    params = payload.model_dump()
    params.update(id=uuid4(), company_id=company_id)
    with tenant(company_id) as session:
        try:
            return session.execute(text("""
                INSERT INTO product (id, company_id, bt153_name, bt154_description,
                    unit_code, product_type, price, currency, bt155_seller_code,
                    bt156_buyer_code, bt157_gtin, bt158_class_code, bt158_class_scheme,
                    bt159_origin_country, vat_included, is_salable)
                VALUES (:id, :company_id, :name, :description, :unit_code,
                    :product_type, :price, :currency, :seller_code, :buyer_code,
                    :gtin, :class_code, :class_scheme, :origin_country,
                    :vat_included, :is_salable)
                RETURNING """ + COLUMNS), params).mappings().one()
        except IntegrityError as error:
            raise _integrity(error) from error


@router.get("/{product_id}", response_model=ProductOut)
def get_product(company_id: CompanyId, product_id: UUID) -> Any:
    with tenant(company_id) as session:
        row = session.execute(
            text(f"SELECT {COLUMNS} FROM product WHERE id = :id"),
            {"id": str(product_id)}).mappings().one_or_none()
    if row is None:
        raise not_found("Produsul", product_id)
    return row


@router.put("/{product_id}", response_model=ProductOut)
def update_product(company_id: CompanyId, product_id: UUID, payload: ProductIn) -> Any:
    params = payload.model_dump()
    params["id"] = str(product_id)
    with tenant(company_id) as session:
        try:
            row = session.execute(text("""
                UPDATE product SET bt153_name = :name, bt154_description = :description,
                    unit_code = :unit_code, product_type = :product_type, price = :price,
                    currency = :currency, bt155_seller_code = :seller_code,
                    bt156_buyer_code = :buyer_code, bt157_gtin = :gtin,
                    bt158_class_code = :class_code, bt158_class_scheme = :class_scheme,
                    bt159_origin_country = :origin_country, vat_included = :vat_included,
                    is_salable = :is_salable
                WHERE id = :id
                RETURNING """ + COLUMNS), params).mappings().one_or_none()
        except IntegrityError as error:
            raise _integrity(error) from error
    if row is None:
        raise not_found("Produsul", product_id)
    return row


@router.delete("/{product_id}", status_code=204, response_model=None)
def delete_product(company_id: CompanyId, product_id: UUID) -> None:
    """Nu sterge un produs folosit pe documente: il scoate din vanzare.

    Liniile emise pastreaza numele si pretul lor proprii, deci istoricul nu se
    schimba — dar referinta `product_id` de pe ele trebuie sa ramana valida.
    """
    with tenant(company_id) as session:
        used = session.execute(
            text("SELECT count(*) FROM document_line WHERE product_id = :id"),
            {"id": str(product_id)}).scalar_one()
        if used:
            raise HTTPException(
                status_code=409,
                detail=f"Produsul apare pe {used} linii de document. Marcheaza-l "
                       "`is_salable = false` in loc sa-l stergi.",
            )
        deleted = session.execute(
            text("DELETE FROM product WHERE id = :id RETURNING id"),
            {"id": str(product_id)}).one_or_none()
    if deleted is None:
        raise not_found("Produsul", product_id)
