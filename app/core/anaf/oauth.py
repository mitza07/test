"""OAuth 2.0 pentru SPV: authorization code, refresh, stocare criptata.

Trei lucruri care nu se deduc din documentatia ANAF si care schimba arhitectura:

1. **O singura inregistrare pentru ambele medii.** OAuth-ul e identic pentru test
   si productie; separarea e doar pe calea de API (`/test/` vs `/prod/`). Deci
   un `client_id`, un `client_secret`, o singura autorizare cu certificatul.
   Vezi `docs/efactura_spec.md`, sectiunea 1.7.

2. **Pasul interactiv nu poate fi automatizat.** Cere certificat digital calificat
   pe token USB/PKCS#11, inregistrat in SPV cu rol PJ. Se face in browser, o
   singura data, de om. Codul de aici incepe de la codul de autorizare incolo.

3. **Revocarea headless nu functioneaza.** `/f5-oauth2/v1/revoke` raspunde 302
   catre zidul de politica F5 BIG-IP. Tokenurile se termina prin expirare sau
   prin „Renuntare OAuth" din portal. Nu exista flux de revocare aici, si nu
   merita construit unul.

Valabilitati: access_token 90 de zile, refresh_token 365. Apelul de refresh
returneaza AMBELE valori noi, iar noul refresh token e emis tot pe 365 de zile.
ANAF nu precizeaza daca termenul se reseteaza sau ramane ancorat la autorizarea
initiala — punct deschis 1 din specificatie. Tratam ambele cazuri: monitorizam
`refresh_expires_at` si alertam cu 14 zile inainte.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode
from uuid import UUID

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.crypto import decrypt, encrypt

AUTHORIZE_URL = "https://logincert.anaf.ro/anaf-oauth2/v1/authorize"
TOKEN_URL = "https://logincert.anaf.ro/anaf-oauth2/v1/token"

ACCESS_TOKEN_DAYS = 90
REFRESH_TOKEN_DAYS = 365
# Alerta cu 14 zile inainte de expirarea refresh tokenului: dupa el, reautorizarea
# cere iar certificatul pe USB, adica un om, la un calculator, in timpul programului.
REFRESH_ALERT_DAYS = 14

DEFAULT_TIMEOUT = 30.0


class OAuthError(RuntimeError):
    """Autorizarea a esuat. Distinct de o problema de retea."""


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    access_expires_at: datetime
    refresh_expires_at: datetime


@dataclass(frozen=True)
class CredentialStatus:
    """Ce stim despre autorizarea unei firme, fara sa atingem tokenurile."""

    company_id: UUID
    environment: str
    access_expires_at: datetime
    refresh_expires_at: datetime
    access_expired: bool
    refresh_expires_soon: bool
    days_until_refresh_expires: int


def _now() -> datetime:
    return datetime.now(UTC)


def authorize_url(client_id: str, redirect_uri: str, state: str | None = None) -> str:
    """URL-ul pe care il deschide omul in browser, cu tokenul USB conectat.

    `token_content_type=jwt` e obligatoriu: fara el ANAF intoarce un token opac,
    din care nu se poate citi nimic.
    """
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "token_content_type": "jwt",
    }
    if state:
        params["state"] = state
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def _basic_auth(client_id: str, client_secret: str) -> str:
    raw = f"{client_id}:{client_secret}".encode()
    return "Basic " + base64.b64encode(raw).decode("ascii")


def _parse_token_response(payload: dict[str, Any]) -> TokenPair:
    access = payload.get("access_token")
    refresh = payload.get("refresh_token")
    if not access or not refresh:
        raise OAuthError(
            "Raspunsul ANAF nu contine ambele tokenuri. "
            f"Campuri primite: {sorted(payload)}"
        )
    now = _now()
    # ANAF trimite `expires_in` in secunde; cand lipseste, folosim durata
    # documentata. Nu presupunem ca lipsa lui inseamna „nu expira".
    access_seconds = int(payload.get("expires_in") or ACCESS_TOKEN_DAYS * 86400)
    refresh_seconds = int(payload.get("refresh_expires_in")
                          or REFRESH_TOKEN_DAYS * 86400)
    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        access_expires_at=now + timedelta(seconds=access_seconds),
        refresh_expires_at=now + timedelta(seconds=refresh_seconds),
    )


def _post_token(data: dict[str, str], client_id: str, client_secret: str,
                *, timeout: float, client: httpx.Client | None) -> TokenPair:
    headers = {
        "Authorization": _basic_auth(client_id, client_secret),
        "Content-Type": "application/x-www-form-urlencoded",
    }
    try:
        if client is not None:
            response = client.post(TOKEN_URL, data=data, headers=headers, timeout=timeout)
        else:
            with httpx.Client(timeout=timeout) as owned:
                response = owned.post(TOKEN_URL, data=data, headers=headers)
    except httpx.HTTPError as error:
        raise OAuthError(f"Apelul catre ANAF a esuat: {error}") from error

    if response.status_code != 200:
        raise OAuthError(
            f"ANAF a raspuns {response.status_code}: {response.text[:300]}")
    try:
        payload = response.json()
    except ValueError as error:
        raise OAuthError(
            f"Raspuns care nu e JSON: {response.text[:300]}") from error
    return _parse_token_response(payload)


def exchange_code(code: str, *, client_id: str, client_secret: str,
                  redirect_uri: str, timeout: float = DEFAULT_TIMEOUT,
                  client: httpx.Client | None = None) -> TokenPair:
    """Schimba codul de autorizare pe tokenuri.

    `redirect_uri` trebuie sa fie IDENTIC cu cel din pasul de autorizare, altfel
    ANAF respinge. Codul e valabil cateva minute.
    """
    return _post_token({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    }, client_id, client_secret, timeout=timeout, client=client)


def refresh(refresh_token: str, *, client_id: str, client_secret: str,
            timeout: float = DEFAULT_TIMEOUT,
            client: httpx.Client | None = None) -> TokenPair:
    """Reinnoieste perechea. Intoarce AMBELE valori noi — si pe cea de refresh."""
    return _post_token({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
    }, client_id, client_secret, timeout=timeout, client=client)


# --- stocare ---------------------------------------------------------------

def store(session: Session, company_id: UUID, environment: str, tokens: TokenPair,
          *, authorized_by: UUID | None = None, key: str | None = None) -> None:
    """Salveaza perechea, criptata. Suprascrie autorizarea precedenta a firmei."""
    if environment not in ("test", "prod"):
        raise OAuthError(f"Mediu necunoscut: '{environment}'.")
    session.execute(text("""
        INSERT INTO spv_credential (company_id, environment, access_token,
                                    refresh_token, access_expires_at,
                                    refresh_expires_at, authorized_by,
                                    last_refreshed_at)
        VALUES (:company, :env, :access, :refresh, :access_exp, :refresh_exp,
                :by, now())
        ON CONFLICT (company_id, environment) DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          access_expires_at = EXCLUDED.access_expires_at,
          refresh_expires_at = EXCLUDED.refresh_expires_at,
          last_refreshed_at = now()
    """), {
        "company": str(company_id),
        "env": environment,
        "access": encrypt(tokens.access_token, key),
        "refresh": encrypt(tokens.refresh_token, key),
        "access_exp": tokens.access_expires_at,
        "refresh_exp": tokens.refresh_expires_at,
        "by": str(authorized_by) if authorized_by else None,
    })


def load(session: Session, company_id: UUID, environment: str,
         *, key: str | None = None) -> TokenPair | None:
    row = session.execute(text("""
        SELECT access_token, refresh_token, access_expires_at, refresh_expires_at
        FROM spv_credential WHERE company_id = :company AND environment = :env
    """), {"company": str(company_id), "env": environment}).one_or_none()
    if row is None:
        return None
    return TokenPair(
        access_token=decrypt(row.access_token, key),
        refresh_token=decrypt(row.refresh_token, key),
        access_expires_at=row.access_expires_at,
        refresh_expires_at=row.refresh_expires_at,
    )


def access_token(session: Session, company_id: UUID, environment: str, *,
                 client_id: str, client_secret: str, key: str | None = None,
                 http_client: httpx.Client | None = None,
                 margin_days: int = 1) -> str:
    """Tokenul de acces valabil, reinnoit daca e nevoie.

    `margin_days` evita cazul in care tokenul expira intre verificare si apel.
    Reinnoirea salveaza noua pereche: refresh tokenul se roteste la fiecare
    apel, iar cel vechi nu mai e bun.
    """
    tokens = load(session, company_id, environment, key=key)
    if tokens is None:
        raise OAuthError(
            f"Firma {company_id} nu are autorizare SPV pe mediul '{environment}'. "
            "Autorizarea se face in browser, cu certificatul pe token USB."
        )
    if tokens.access_expires_at - timedelta(days=margin_days) > _now():
        return tokens.access_token

    if tokens.refresh_expires_at <= _now():
        raise OAuthError(
            f"Refresh tokenul firmei {company_id} a expirat "
            f"({tokens.refresh_expires_at:%d.%m.%Y}). Reautorizare in browser, "
            "cu certificatul. Alerta trebuia sa vina cu 14 zile inainte."
        )
    renewed = refresh(tokens.refresh_token, client_id=client_id,
                      client_secret=client_secret, client=http_client)
    store(session, company_id, environment, renewed, key=key)
    return renewed.access_token


def expiring_soon(session: Session, *, days: int = REFRESH_ALERT_DAYS
                  ) -> list[CredentialStatus]:
    """Autorizarile care trebuie reinnoite manual in curand.

    Se ruleaza dintr-un job zilnic. Reautorizarea cere om, browser si token USB,
    deci alerta trebuie sa ajunga cu timp, nu in ziua expirarii.
    """
    rows = session.execute(text("""
        SELECT company_id, environment, access_expires_at, refresh_expires_at
        FROM spv_credential
        ORDER BY refresh_expires_at
    """)).all()
    now = _now()
    statuses = []
    for row in rows:
        remaining = (row.refresh_expires_at - now).days
        statuses.append(CredentialStatus(
            company_id=row.company_id,
            environment=row.environment,
            access_expires_at=row.access_expires_at,
            refresh_expires_at=row.refresh_expires_at,
            access_expired=row.access_expires_at <= now,
            refresh_expires_soon=remaining <= days,
            days_until_refresh_expires=remaining,
        ))
    return [status for status in statuses if status.refresh_expires_soon]
