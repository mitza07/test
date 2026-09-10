"""Dependintele comune ale API-ului: firma si tranzactia.

**Fiecare cerere care atinge date de tenant trece prin `tenant_session`.** Nu
exista interogare fara `company_id` in context. Politicile RLS ar prinde
scaparea, dar `docs/decizii.md` spune explicit sa nu ne bazam pe ele: un rol
prost configurat le face inerte, iar atunci filtrarea ramane singura aparare.

Firma vine acum din antetul `X-Company-Id`. Cand apare autentificarea, tot aici
se schimba — se citeste din sesiunea utilizatorului si se verifica in
`company_user`. Endpointurile nu afla niciodata firma altfel decat prin
`current_company`, deci punctul de schimbare ramane unul singur.

Antetul lipsa e **400, nu firma implicita**. O valoare implicita ar face ca o
greseala de configurare din frontend sa scrie linistit in firma gresita.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db import tenant_session


def current_company(
    x_company_id: Annotated[str | None, Header(alias="X-Company-Id")] = None,
) -> UUID:
    if not x_company_id:
        raise HTTPException(
            status_code=400,
            detail="Lipseste antetul X-Company-Id. Nicio interogare nu ruleaza "
                   "fara context de firma.",
        )
    try:
        return UUID(x_company_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"X-Company-Id nu e un UUID valid: {x_company_id!r}.",
        ) from None


CompanyId = Annotated[UUID, Depends(current_company)]


@contextmanager
def tenant(company_id: UUID) -> Iterator[Session]:
    """Tranzactia cererii, cu firma fixata.

    Deschisa explicit in corpul endpointului, nu ca dependinta cu `yield`:
    asa granita tranzactiei e vizibila in cod, iar un `HTTPException` ridicat la
    jumatate face rollback prin context manager, nu prin ordinea in care
    framework-ul isi inchide dependintele.
    """
    with tenant_session(company_id) as session:
        yield session


def not_found(what: str, identifier: object) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{what} {identifier} nu exista.")
