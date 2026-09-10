"""Autorizarea SPV: cele doua capete HTTP ale fluxului OAuth.

Nucleul (`app.core.anaf.oauth`) stia deja sa construiasca URL-ul, sa schimbe
codul si sa stocheze perechea criptata. Ce lipsea era exact bucata prin care
trece omul: un endpoint care il trimite la ANAF si unul care prinde raspunsul.
Fara ele, `ANAF_REDIRECT_URI` arata catre o adresa care da 404, iar pasul cu
certificatul se opreste la jumatate.

**Pasul interactiv nu se poate automatiza.** Cere certificat calificat pe token
USB, prezentat de browser la handshake-ul cu `logincert.anaf.ro`. Se face o
singura data per firma, de la o masina care are tokenul in ea.

## `state` semnat, nu tinut in sesiune

Fluxul are doua cereri HTTP separate, iar intre ele omul se plimba prin ANAF.
Ca sa stim la intoarcere PENTRU CARE firma a fost autorizarea, `state` poarta
`company_id`, semnat cu HMAC. Fara semnatura, oricine ar putea chema
`/anaf/callback?code=...&state=<alta-firma>` si ar lega un token de firma
gresita — sau, mai rau, de firma lui.

Semnatura foloseste `TOKEN_ENCRYPTION_KEY`, care oricum trebuie sa existe ca sa
se poata salva tokenul. O cheie in plus ar fi inca un lucru de rotit.

`state` are si o marca de timp: codul de autorizare traieste cateva minute, deci
un `state` mai vechi de zece nu mai are ce cauta la intoarcere.
"""

from __future__ import annotations

import hmac
import logging
import time
from hashlib import sha256
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import text

from app.api.deps import tenant
from app.config import get_settings
from app.core.anaf import oauth
from app.core.crypto import ENV_KEY

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/anaf", tags=["spv"])

STATE_TTL_SECONDS = 600


def _secret() -> bytes:
    key = get_settings().token_encryption_key
    if not key:
        raise HTTPException(
            status_code=500,
            detail=f"{ENV_KEY} nu e setat; fara el nu se poate nici semna `state`, "
                   "nici salva tokenul.",
        )
    return key.encode("utf-8")


def make_state(company_id: UUID, *, issued_at: int | None = None) -> str:
    """`<company_id>.<timestamp>.<hmac>` — verificabil fara stare pe server."""
    stamp = str(issued_at if issued_at is not None else int(time.time()))
    payload = f"{company_id}.{stamp}"
    signature = hmac.new(_secret(), payload.encode("utf-8"), sha256).hexdigest()
    return f"{payload}.{signature}"


def read_state(state: str, *, now: int | None = None) -> UUID:
    """Verifica semnatura si varsta. Ridica `HTTPException` daca ceva nu bate."""
    parts = state.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=400, detail="Parametrul `state` e malformat.")
    company, stamp, signature = parts

    expected = hmac.new(_secret(), f"{company}.{stamp}".encode(), sha256).hexdigest()
    # compare_digest, nu `==`: comparatia obisnuita se opreste la primul octet
    # diferit, iar diferenta de timp spune atacatorului cat a ghicit corect.
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(
            status_code=400,
            detail="Semnatura din `state` nu corespunde. Reia autorizarea de la "
                   "`/anaf/authorize`.",
        )

    try:
        age = (now if now is not None else int(time.time())) - int(stamp)
    except ValueError:
        raise HTTPException(status_code=400, detail="`state` are marca de timp invalida.") from None
    if age > STATE_TTL_SECONDS or age < -60:
        raise HTTPException(
            status_code=400,
            detail=f"Autorizarea a expirat ({age} secunde). Reia de la "
                   "`/anaf/authorize`.",
        )

    try:
        return UUID(company)
    except ValueError:
        raise HTTPException(status_code=400, detail="`state` nu contine un UUID.") from None


def _settings_or_400():
    settings = get_settings()
    missing = [name for name, value in (
        ("ANAF_CLIENT_ID", settings.anaf_client_id),
        ("ANAF_CLIENT_SECRET", settings.anaf_client_secret),
        ("ANAF_REDIRECT_URI", settings.anaf_redirect_uri),
    ) if not value]
    if missing:
        raise HTTPException(
            status_code=500,
            detail="Lipsesc din configurare: " + ", ".join(missing) +
                   ". Vin din profilul Oauth inregistrat pe portalul ANAF.",
        )
    return settings


@router.get("/authorize")
def start_authorization(
    company_id: Annotated[UUID, Query(description="Firma pentru care se autorizeaza")],
) -> RedirectResponse:
    """Trimite browserul la ANAF, cu tokenul USB conectat.

    Firma vine din query, nu din antetul `X-Company-Id`: pasul asta se deschide
    prin navigare directa in browser, unde nu se pot pune antete.
    """
    settings = _settings_or_400()
    url = oauth.authorize_url(
        settings.anaf_client_id,
        settings.anaf_redirect_uri,
        state=make_state(company_id),
    )
    return RedirectResponse(url, status_code=307)


@router.get("/callback")
def finish_authorization(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
) -> dict[str, str]:
    """Prinde codul de autorizare si il schimba pe tokenuri.

    Raspunsul NU contine tokenurile. Ele se salveaza criptate in `spv_credential`
    si nu mai ies de acolo — nici catre browser, nici in log.
    """
    if error:
        raise HTTPException(
            status_code=400,
            detail=f"ANAF a refuzat autorizarea: {error}"
                   + (f" — {error_description}" if error_description else ""),
        )
    if not code or not state:
        raise HTTPException(
            status_code=400,
            detail="Raspunsul nu contine `code` si `state`. Porneste fluxul de la "
                   "`/anaf/authorize?company_id=...`.",
        )

    company_id = read_state(state)
    settings = _settings_or_400()

    try:
        tokens = oauth.exchange_code(
            code,
            client_id=settings.anaf_client_id,
            client_secret=settings.anaf_client_secret,
            redirect_uri=settings.anaf_redirect_uri,
        )
    except oauth.OAuthError as failure:
        # Fara `str(failure)` in log: mesajul poate contine raspunsul ANAF.
        logger.warning("Schimbul de cod a esuat pentru firma %s.", company_id)
        raise HTTPException(status_code=400, detail=str(failure)) from failure

    with tenant(company_id) as session:
        exists = session.execute(
            text("SELECT 1 FROM company WHERE id = :id"),
            {"id": str(company_id)}).one_or_none()
        if exists is None:
            raise HTTPException(
                status_code=404,
                detail=f"Firma {company_id} nu exista. Tokenul NU a fost salvat.",
            )
        oauth.store(session, company_id, settings.anaf_environment, tokens)

    logger.info("Firma %s autorizata pe SPV /%s/.", company_id,
                settings.anaf_environment)
    return {
        "status": "autorizat",
        "company_id": str(company_id),
        "environment": settings.anaf_environment,
        "access_expires_at": tokens.access_expires_at.isoformat(),
        "refresh_expires_at": tokens.refresh_expires_at.isoformat(),
    }


@router.get("/status")
def authorization_status(company_id: Annotated[UUID, Query()]) -> dict[str, object]:
    """Cat mai tine autorizarea. Nu atinge tokenurile, doar datele."""
    settings = get_settings()
    with tenant(company_id) as session:
        row = session.execute(text("""
            SELECT access_expires_at, refresh_expires_at, last_refreshed_at
            FROM spv_credential WHERE company_id = :c AND environment = :env
        """), {"c": str(company_id), "env": settings.anaf_environment}).one_or_none()
    if row is None:
        return {"authorized": False, "environment": settings.anaf_environment}
    return {
        "authorized": True,
        "environment": settings.anaf_environment,
        "access_expires_at": row.access_expires_at.isoformat(),
        "refresh_expires_at": row.refresh_expires_at.isoformat(),
        "last_refreshed_at": (row.last_refreshed_at.isoformat()
                              if row.last_refreshed_at else None),
    }
