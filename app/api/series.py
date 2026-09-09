"""Serii de documente.

`next_number` nu se poate scrie prin API. Se misca doar prin `issue()`, sub lock,
dupa ce validatorul trece — constrangerea 9. Un endpoint care l-ar seta liber ar
permite exact cele doua lucruri pe care numerotarea trebuie sa le excluda: gauri
in serie si doua documente cu acelasi numar.

Seria nu se sterge daca s-a emis din ea. Numerele emise trebuie sa ramana
explicabile, iar `numbering.can_delete` se uita la documentele seriei ca sa
decida daca ultimul document mai poate fi sters.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api.deps import CompanyId, not_found, tenant
from app.api.schemas import SeriesIn, SeriesOut, SeriesUpdate

router = APIRouter(prefix="/api/series", tags=["serii"])

COLUMNS = ("id, doc_type, name, start_number, next_number, padding, description, "
           "is_default, is_active")


@router.get("", response_model=list[SeriesOut])
def list_series(company_id: CompanyId, doc_type: str | None = None,
                active_only: bool = False) -> list[Any]:
    clauses = []
    params: dict[str, Any] = {}
    if doc_type:
        clauses.append("doc_type = :doc_type")
        params["doc_type"] = doc_type
    if active_only:
        clauses.append("is_active")
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with tenant(company_id) as session:
        return list(session.execute(text(
            f"SELECT {COLUMNS} FROM doc_series {where} ORDER BY doc_type, name"),
            params).mappings().all())


@router.post("", response_model=SeriesOut, status_code=201)
def create_series(company_id: CompanyId, payload: SeriesIn) -> Any:
    """`next_number` porneste de la `start_number`, si numai la creare."""
    params = payload.model_dump()
    params.update(id=uuid4(), company_id=company_id, next_number=payload.start_number)
    with tenant(company_id) as session:
        try:
            row = session.execute(text(f"""
                INSERT INTO doc_series (id, company_id, doc_type, name, start_number,
                                        next_number, padding, description,
                                        is_default, is_active)
                VALUES (:id, :company_id, :doc_type, :name, :start_number,
                        :next_number, :padding, :description, :is_default, :is_active)
                RETURNING {COLUMNS}"""), params).mappings().one()
        except IntegrityError as error:
            raise HTTPException(
                status_code=409,
                detail=f"Exista deja o serie '{payload.name}' pentru "
                       f"{payload.doc_type}.",
            ) from error
        if payload.is_default:
            _clear_other_defaults(session, company_id, payload.doc_type, row["id"])
    return row


def _clear_other_defaults(session: Any, company_id: UUID, doc_type: str,
                          keep: UUID) -> None:
    session.execute(text("""
        UPDATE doc_series SET is_default = false
        WHERE company_id = :c AND doc_type = :t AND id <> :keep
    """), {"c": str(company_id), "t": doc_type, "keep": str(keep)})


@router.get("/{series_id}", response_model=SeriesOut)
def get_series(company_id: CompanyId, series_id: UUID) -> Any:
    with tenant(company_id) as session:
        row = session.execute(
            text(f"SELECT {COLUMNS} FROM doc_series WHERE id = :id"),
            {"id": str(series_id)}).mappings().one_or_none()
    if row is None:
        raise not_found("Seria", series_id)
    return row


@router.patch("/{series_id}", response_model=SeriesOut)
def update_series(company_id: CompanyId, series_id: UUID,
                  payload: SeriesUpdate) -> Any:
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return get_series(company_id, series_id)

    assignments = ", ".join(f"{key} = :{key}" for key in changes)
    params = dict(changes, id=str(series_id))
    with tenant(company_id) as session:
        row = session.execute(text(
            f"UPDATE doc_series SET {assignments} WHERE id = :id RETURNING {COLUMNS}"),
            params).mappings().one_or_none()
        if row is None:
            raise not_found("Seria", series_id)
        if changes.get("is_default"):
            _clear_other_defaults(session, company_id, row["doc_type"], series_id)
    return row


@router.delete("/{series_id}", status_code=204, response_model=None)
def delete_series(company_id: CompanyId, series_id: UUID) -> None:
    with tenant(company_id) as session:
        used = session.execute(
            text("SELECT count(*) FROM document WHERE series_id = :id"),
            {"id": str(series_id)}).scalar_one()
        if used:
            raise HTTPException(
                status_code=409,
                detail=f"Seria are {used} documente. Dezactiveaz-o "
                       "(`is_active = false`) in loc sa o stergi.",
            )
        deleted = session.execute(
            text("DELETE FROM doc_series WHERE id = :id RETURNING id"),
            {"id": str(series_id)}).one_or_none()
    if deleted is None:
        raise not_found("Seria", series_id)
