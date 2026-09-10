"""Endpointul public de validare ANAF. Fara OAuth, fara certificat.

A treia plasa, dupa validatorul local (`app.core.validation.br_ro`) si dupa
schematronul oficial (`app.core.ubl.schematron`). Valoarea lui e ca raspunde
chiar ANAF: daca zice „ok", validarea de la upload nu mai are ce sa respinga.

De ce sta in `app/core/anaf/` si nu langa generatorul UBL, desi TODO.md il
listeaza la punctul 2: e un apel catre ANAF, cu aceleasi probleme ca restul
(retea, timeout, rate limiting neanuntat). Gruparea dupa sistemul extern, nu
dupa pasul din plan, tine intr-un loc lucrurile care se strica impreuna.

ATENTIE — se apeleaza pe `/prod/` chiar si pentru documente de test. Endpointul
NU depinde de `ANAF_ENVIRONMENT`: doar valideaza XML, nu inregistreaza nimic si
nu consuma niciun numar. Nu confunda cu upload-ul, unde calea test/prod decide
daca factura devine reala.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

import httpx

BASE_URL = "https://webservicesp.anaf.ro/prod/FCTEL/rest/validare"

# FACT1 pentru facturi (Invoice), FCN pentru note de creditare (CreditNote).
# Trimiterea unei note de creditare la FACT1 da eroare de structura, nu de reguli.
Standard = Literal["FACT1", "FCN"]

DEFAULT_TIMEOUT = 30.0


@dataclass(frozen=True)
class ValidationResponse:
    """Raspunsul brut, normalizat.

    `ok is None` inseamna ca nu stim — retea, timeout, raspuns neasteptat. NU
    inseamna „invalid". Aceeasi regula ca la `spv_status = 'unknown'`: absenta
    unui raspuns nu e un raspuns negativ.
    """

    ok: bool | None
    messages: list[str] = field(default_factory=list)
    raw: str = ""

    @property
    def unknown(self) -> bool:
        return self.ok is None


def standard_for(type_code: str | None) -> Standard:
    """Codul 381 e nota de creditare si merge la FCN. Restul la FACT1."""
    return "FCN" if str(type_code) == "381" else "FACT1"


def _parse(payload: str) -> ValidationResponse:
    """Raspunsul e JSON, dar formatul a variat in timp; se trateaza si textul brut.

    Forme intalnite:
        {"stare": "ok", "trace_id": "..."}
        {"stare": "nok", "Messages": [{"message": "..."}]}
        {"info": "..."}                        (raspuns de eroare al portalului)
    """
    import json

    text = payload.strip()
    try:
        data: Any = json.loads(text)
    except ValueError:
        # Portalul raspunde uneori cu HTML (mentenanta, zid F5). Nu e un verdict.
        return ValidationResponse(ok=None, messages=["Raspuns care nu e JSON."], raw=text)

    if not isinstance(data, dict):
        return ValidationResponse(ok=None, messages=["Raspuns JSON neasteptat."], raw=text)

    messages: list[str] = []
    for entry in data.get("Messages") or data.get("messages") or []:
        if isinstance(entry, dict):
            message = entry.get("message") or entry.get("errorMessage")
        else:
            message = entry
        if message:
            messages.append(str(message))
    if not messages and data.get("info"):
        messages.append(str(data["info"]))

    state = str(data.get("stare") or "").lower()
    if state == "ok":
        return ValidationResponse(ok=True, messages=messages, raw=text)
    if state == "nok":
        return ValidationResponse(ok=False, messages=messages, raw=text)
    # Fara camp `stare`: erorile prezente inseamna respingere, altfel nu stim.
    return ValidationResponse(ok=False if messages else None, messages=messages, raw=text)


def validate_xml(xml: bytes | str, standard: Standard = "FACT1",
                 *, timeout: float = DEFAULT_TIMEOUT,
                 client: httpx.Client | None = None) -> ValidationResponse:
    """Trimite XML-ul la validatorul public.

    Nu ridica exceptie la esec de retea: intoarce `ok=None`. Emiterea nu trebuie
    sa depinda de disponibilitatea unui serviciu care nu e obligatoriu in flux.
    """
    body = xml.encode("utf-8") if isinstance(xml, str) else xml
    url = f"{BASE_URL}/{standard}"
    headers = {"Content-Type": "text/plain"}

    try:
        if client is not None:
            response = client.post(url, content=body, headers=headers, timeout=timeout)
        else:
            with httpx.Client(timeout=timeout) as owned:
                response = owned.post(url, content=body, headers=headers)
    except httpx.HTTPError as error:
        return ValidationResponse(ok=None, messages=[f"Apel esuat: {error}"])

    if response.status_code != 200:
        return ValidationResponse(
            ok=None,
            messages=[f"HTTP {response.status_code} de la validatorul ANAF."],
            raw=response.text,
        )
    return _parse(response.text)
