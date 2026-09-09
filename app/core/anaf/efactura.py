"""Cele patru apeluri e-Factura: upload, stareMesaj, descarcare, listaMesajeFactura.

Host-ul e `api.anaf.ro`, cu OAuth2 Bearer. Celalalt host documentat,
`webserviceapl.anaf.ro`, cere certificatul prezentat la FIECARE apel — adica un
token USB pe fiecare masina care emite. Pentru un stack in Docker cu deploy
automat, nu e o optiune. Vezi `docs/efactura_spec.md`, sectiunea 1.7.

## Timeout nu inseamna esec

Cea mai importanta regula din modulul asta, si singura care produce pagube reale
daca e gresita. Cand un upload da timeout, NU stim daca ANAF a primit factura.
Trei lucruri decurg din asta:

  - starea devine `unknown`, nu `failed`;
  - NU se retrimite automat, niciodata (o retrimitere pe o factura deja primita
    inseamna doua facturi identice in SPV, si nu exista buton de anulare);
  - se afla adevarul cu `lista_mesaje`, nu cu inca un upload.

Interfata trebuie sa arate `unknown` diferit de eroare, ca operatorul sa nu apese
a doua oara „Emite".

## Limitele ANAF sunt ale noastre de respectat

Maxim 100 de interogari `stareMesaj` pe zi per `id_incarcare`, si maxim 10
`descarcare` pe zi per `id`. Contoarele stau in `efactura_job`, in baza de date,
nu in memoria procesului: workerii sunt mai multi si repornesc.

## Fereastra de 60 de zile

ANAF pastreaza factura in SPV 60 de zile. Dupa, o sterge definitiv si obligatia
de arhivare ramane integral a noastra, fara sursa. Descarcarea nu e optionala si
nu se amana: `download_deadline = sent_at + 60`, cu alerta la 45.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import Any, Literal
from uuid import UUID

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session

MAX_UPLOAD_BYTES = 10 * 1024 * 1024        # peste -> HTTP 413
MAX_STATUS_QUERIES_PER_DAY = 100           # per id_incarcare
MAX_DOWNLOADS_PER_DAY = 10                 # per id_descarcare
SPV_RETENTION_DAYS = 60                    # dupa, ANAF sterge definitiv
DOWNLOAD_ALERT_DAYS = 45

DEFAULT_TIMEOUT = 60.0

Standard = Literal["UBL", "CII", "CN", "RASP"]

# `stare` din raspunsul stareMesaj -> status_code din efactura_job
STATE_TO_CODE = {
    "in prelucrare": 0,
    "ok": 1,
    "nok": 2,
}


class AnafError(RuntimeError):
    """Raspuns clar de eroare de la ANAF. Distinct de „nu stim"."""


class QuotaExceeded(RuntimeError):
    """Am atins limita zilnica impusa de ANAF. Nu e eroare, e disciplina."""


@dataclass(frozen=True)
class UploadResult:
    """`unknown=True` inseamna ca nu stim daca a ajuns. NU autorizeaza retrimitere."""

    ok: bool
    index_incarcare: str | None = None
    unknown: bool = False
    errors: list[str] = field(default_factory=list)
    raw: str = ""


@dataclass(frozen=True)
class MessageState:
    stare: str | None
    id_descarcare: str | None
    unknown: bool = False
    raw: str = ""

    @property
    def status_code(self) -> int:
        if self.unknown or self.stare is None:
            return -1
        return STATE_TO_CODE.get(self.stare.lower(), 2)

    @property
    def finished(self) -> bool:
        return self.stare is not None and self.stare.lower() in ("ok", "nok")


def api_base(environment: str) -> str:
    if environment not in ("test", "prod"):
        raise AnafError(f"Mediu necunoscut: '{environment}'.")
    return f"https://api.anaf.ro/{environment}/FCTEL/rest"


def _headers(token: str, content_type: str | None = None) -> dict[str, str]:
    headers = {"Authorization": f"Bearer {token}"}
    if content_type:
        headers["Content-Type"] = content_type
    return headers


# --- upload ----------------------------------------------------------------

def upload(xml: bytes, *, token: str, cif: str, environment: str,
           standard: Standard = "UBL", b2c: bool = False,
           extern: bool = False, autofactura: bool = False,
           executare: bool = False, timeout: float = DEFAULT_TIMEOUT,
           client: httpx.Client | None = None) -> UploadResult:
    """Trimite XML-ul in SPV.

    `cif` e CUI-ul numeric, FARA prefixul RO: e destinatarul erorilor cand
    emitentul nu poate fi identificat din XML. Un prefix lasat acolo inseamna
    ca nu primesti erorile.
    """
    if len(xml) > MAX_UPLOAD_BYTES:
        raise AnafError(
            f"XML-ul are {len(xml)} octeti, peste limita de {MAX_UPLOAD_BYTES}. "
            "ANAF raspunde 413.")
    if cif.upper().startswith("RO"):
        raise AnafError(
            f"`cif` trebuie sa fie numeric, fara prefixul RO: '{cif}'.")

    endpoint = "uploadb2c" if b2c else "upload"
    params: dict[str, str] = {"standard": standard, "cif": cif}
    if extern:
        params["extern"] = "DA"
    if autofactura:
        params["autofactura"] = "DA"
    if executare:
        params["executare"] = "DA"

    url = f"{api_base(environment)}/{endpoint}"
    try:
        if client is not None:
            response = client.post(url, params=params, content=xml,
                                   headers=_headers(token, "application/xml"),
                                   timeout=timeout)
        else:
            with httpx.Client(timeout=timeout) as owned:
                response = owned.post(url, params=params, content=xml,
                                      headers=_headers(token, "application/xml"))
    except httpx.HTTPError as error:
        # Aici se decide totul. Nu stim daca ANAF a primit XML-ul.
        return UploadResult(ok=False, unknown=True,
                            errors=[f"Apel intrerupt: {error}. Starea reala se afla "
                                    "cu listaMesajeFactura, NU cu inca un upload."])

    if response.status_code == 413:
        raise AnafError("ANAF a raspuns 413: XML peste 10 MB.")
    if response.status_code in (502, 503, 504):
        return UploadResult(ok=False, unknown=True, raw=response.text,
                            errors=[f"ANAF a raspuns {response.status_code}. "
                                    "Poate fi primita sau nu; verifica lista de mesaje."])
    if response.status_code != 200:
        raise AnafError(f"ANAF a raspuns {response.status_code}: {response.text[:300]}")

    try:
        payload = response.json()
    except ValueError:
        return UploadResult(ok=False, unknown=True, raw=response.text,
                            errors=["Raspuns care nu e JSON."])

    if str(payload.get("ExecutionStatus")) == "0" and payload.get("index_incarcare"):
        return UploadResult(ok=True, index_incarcare=str(payload["index_incarcare"]),
                            raw=response.text)
    errors = [str(entry.get("errorMessage", entry))
              for entry in (payload.get("Errors") or [])]
    return UploadResult(ok=False, errors=errors or ["Upload respins, fara detalii."],
                        raw=response.text)


# --- stare -----------------------------------------------------------------

def _parse_state(payload: str) -> MessageState:
    """Raspunsul e XML: `<header stare="ok" id_descarcare="..."/>`."""
    from lxml import etree

    try:
        root = etree.fromstring(payload.encode("utf-8"))
    except etree.XMLSyntaxError:
        return MessageState(stare=None, id_descarcare=None, unknown=True, raw=payload)
    stare = root.get("stare")
    if stare is None:
        header = root.find(".//*[@stare]")
        stare = header.get("stare") if header is not None else None
        id_descarcare = header.get("id_descarcare") if header is not None else None
    else:
        id_descarcare = root.get("id_descarcare")
    return MessageState(stare=stare, id_descarcare=id_descarcare, raw=payload)


def message_state(index_incarcare: str, *, token: str, environment: str,
                  timeout: float = DEFAULT_TIMEOUT,
                  client: httpx.Client | None = None) -> MessageState:
    """`stareMesaj`. Poll la 5-30 de secunde, nu mai des; maxim 100 pe zi per index."""
    url = f"{api_base(environment)}/stareMesaj"
    try:
        if client is not None:
            response = client.get(url, params={"id_incarcare": index_incarcare},
                                  headers=_headers(token), timeout=timeout)
        else:
            with httpx.Client(timeout=timeout) as owned:
                response = owned.get(url, params={"id_incarcare": index_incarcare},
                                     headers=_headers(token))
    except httpx.HTTPError as error:
        return MessageState(stare=None, id_descarcare=None, unknown=True,
                            raw=str(error))
    if response.status_code != 200:
        return MessageState(stare=None, id_descarcare=None, unknown=True,
                            raw=response.text)
    return _parse_state(response.text)


def download(id_descarcare: str, *, token: str, environment: str,
             timeout: float = DEFAULT_TIMEOUT,
             client: httpx.Client | None = None) -> bytes:
    """`descarcare`. Intoarce ZIP-ul: factura procesata + sigiliul MF.

    ZIP-ul e ORIGINALUL LEGAL. PDF-ul are rol informativ.
    """
    url = f"{api_base(environment)}/descarcare"
    if client is not None:
        response = client.get(url, params={"id": id_descarcare},
                              headers=_headers(token), timeout=timeout)
    else:
        with httpx.Client(timeout=timeout) as owned:
            response = owned.get(url, params={"id": id_descarcare},
                                 headers=_headers(token))
    if response.status_code != 200:
        raise AnafError(
            f"Descarcarea {id_descarcare} a raspuns {response.status_code}: "
            f"{response.text[:200]}")
    return response.content


def list_messages(cif: str, *, token: str, environment: str, days: int = 60,
                  timeout: float = DEFAULT_TIMEOUT,
                  client: httpx.Client | None = None) -> list[dict[str, Any]]:
    """`listaMesajeFactura`. Si singurul mod corect de a lamuri o stare `unknown`."""
    if not 1 <= days <= 60:
        raise AnafError(f"`zile` trebuie sa fie intre 1 si 60, nu {days}.")
    url = f"{api_base(environment)}/listaMesajeFactura"
    params = {"cif": cif, "zile": str(days)}
    if client is not None:
        response = client.get(url, params=params, headers=_headers(token),
                              timeout=timeout)
    else:
        with httpx.Client(timeout=timeout) as owned:
            response = owned.get(url, params=params, headers=_headers(token))
    if response.status_code != 200:
        raise AnafError(f"listaMesajeFactura a raspuns {response.status_code}.")
    payload = response.json()
    if payload.get("eroare"):
        raise AnafError(str(payload["eroare"]))
    return list(payload.get("mesaje") or [])


# --- contoare, in baza de date ---------------------------------------------

def _reset_quota_if_new_day(session: Session, job_id: UUID) -> None:
    """Contoarele sunt zilnice. Resetarea se face lenes, la prima folosire."""
    session.execute(text("""
        UPDATE efactura_job
        SET status_queries_today = 0, downloads_today = 0,
            quota_reset_date = CURRENT_DATE
        WHERE id = :id AND quota_reset_date < CURRENT_DATE
    """), {"id": str(job_id)})


def consume_status_quota(session: Session, job_id: UUID) -> None:
    """Ridica `QuotaExceeded` inainte de apel, nu dupa ce ANAF ne refuza."""
    _reset_quota_if_new_day(session, job_id)
    row = session.execute(text("""
        SELECT status_queries_today FROM efactura_job WHERE id = :id FOR UPDATE
    """), {"id": str(job_id)}).one_or_none()
    if row is None:
        raise AnafError(f"Jobul {job_id} nu exista.")
    if row.status_queries_today >= MAX_STATUS_QUERIES_PER_DAY:
        raise QuotaExceeded(
            f"S-au facut {row.status_queries_today} interogari de stare azi pentru "
            f"jobul {job_id}; limita ANAF e {MAX_STATUS_QUERIES_PER_DAY} pe zi per "
            "index de incarcare. Reia maine.")
    session.execute(text("""
        UPDATE efactura_job SET status_queries_today = status_queries_today + 1
        WHERE id = :id
    """), {"id": str(job_id)})


def consume_download_quota(session: Session, job_id: UUID) -> None:
    _reset_quota_if_new_day(session, job_id)
    row = session.execute(text("""
        SELECT downloads_today FROM efactura_job WHERE id = :id FOR UPDATE
    """), {"id": str(job_id)}).one_or_none()
    if row is None:
        raise AnafError(f"Jobul {job_id} nu exista.")
    if row.downloads_today >= MAX_DOWNLOADS_PER_DAY:
        raise QuotaExceeded(
            f"S-au facut {row.downloads_today} descarcari azi pentru jobul {job_id}; "
            f"limita ANAF e {MAX_DOWNLOADS_PER_DAY} pe zi per id. Reia maine.")
    session.execute(text("""
        UPDATE efactura_job SET downloads_today = downloads_today + 1 WHERE id = :id
    """), {"id": str(job_id)})


# --- persistarea rezultatelor ----------------------------------------------

def record_upload(session: Session, job_id: UUID, result: UploadResult,
                  *, sent_at: datetime | None = None) -> None:
    """Scrie rezultatul uploadului, inclusiv fereastra de descarcare.

    `is_unknown` se pastreaza pe job: e starea din care NU se iese prin
    retrimitere, ci prin `lista_mesaje`.
    """
    moment = sent_at or datetime.now(UTC)
    session.execute(text("""
        UPDATE efactura_job SET
          index_incarcare = coalesce(:index, index_incarcare),
          is_unknown = :unknown,
          status_code = CASE WHEN :ok THEN 0 ELSE status_code END,
          anaf_stare = CASE WHEN :ok THEN 'in prelucrare' ELSE anaf_stare END,
          status_text = :status_text,
          error_detail = CAST(:errors AS jsonb),
          sent_at = CASE WHEN :ok OR :unknown THEN :sent_at ELSE sent_at END,
          -- CAST, nu `::date`: in `text()`, SQLAlchemy citeste `::` ca inceput
          -- de bind parameter si strica interogarea.
          download_deadline = CASE WHEN :ok
                                   THEN (CAST(:sent_at AS date) + :retention)
                                   ELSE download_deadline END,
          attempts = attempts + 1
        WHERE id = :id
    """), {
        "id": str(job_id),
        "index": result.index_incarcare,
        "unknown": result.unknown,
        "ok": result.ok,
        "status_text": "; ".join(result.errors) if result.errors else None,
        "errors": _json(result.errors),
        "sent_at": moment,
        "retention": SPV_RETENTION_DAYS,
    })


def record_state(session: Session, job_id: UUID, state: MessageState) -> None:
    session.execute(text("""
        UPDATE efactura_job SET
          anaf_stare = :stare,
          status_code = :code,
          is_unknown = :unknown,
          id_descarcare = coalesce(:id_descarcare, id_descarcare),
          resolved_at = CASE WHEN :finished THEN now() ELSE resolved_at END
        WHERE id = :id
    """), {
        "id": str(job_id),
        "stare": state.stare,
        "code": state.status_code,
        "unknown": state.unknown,
        "id_descarcare": state.id_descarcare,
        "finished": state.finished,
    })


def _json(value: Any) -> str | None:
    import json

    return json.dumps(value, ensure_ascii=False) if value else None


def needs_resend_decision(session: Session) -> list[dict[str, Any]]:
    """Joburile ramase in `unknown`. Cer decizie de OM, nu retrimitere automata.

    Se lamuresc cu `list_messages`: daca factura apare acolo, a ajuns. Un al
    doilea upload ar produce doua facturi identice in SPV, fara buton de anulare.
    """
    rows = session.execute(text("""
        SELECT j.id, j.document_id, j.index_incarcare, j.sent_at, j.attempts,
               d.bt1_invoice_id, d.company_id
        FROM efactura_job j JOIN document d ON d.id = j.document_id
        WHERE j.is_unknown
        ORDER BY j.sent_at NULLS FIRST
    """)).all()
    return [dict(row._mapping) for row in rows]


def download_window_alerts(session: Session, *, alert_after_days: int = DOWNLOAD_ALERT_DAYS,
                           today: date | None = None) -> list[dict[str, Any]]:
    """Facturi validate, nedescarcate, cu fereastra pe terminate.

    Dupa 60 de zile ANAF sterge arhiva definitiv si nu mai exista de unde.
    """
    reference = today or date.today()
    rows = session.execute(text("""
        SELECT j.id, j.document_id, j.id_descarcare, j.download_deadline,
               d.bt1_invoice_id, d.company_id,
               (j.download_deadline - :today) AS days_left
        FROM efactura_job j JOIN document d ON d.id = j.document_id
        WHERE j.downloaded_at IS NULL
          AND j.download_deadline IS NOT NULL
          AND j.download_deadline - :today <= :window
        ORDER BY j.download_deadline
    """), {"today": reference,
           "window": SPV_RETENTION_DAYS - alert_after_days}).all()
    return [dict(row._mapping) for row in rows]


def mark_downloaded(session: Session, job_id: UUID, zip_path: str,
                    signature_path: str | None = None) -> None:
    session.execute(text("""
        UPDATE efactura_job SET zip_path = :zip, signature_path = :sig,
                                downloaded_at = now()
        WHERE id = :id
    """), {"id": str(job_id), "zip": zip_path, "sig": signature_path})


def transmission_overdue(session: Session, today: date | None = None
                         ) -> list[dict[str, Any]]:
    """Facturi emise care nu au fost transmise in termenul legal.

    Amenda e per factura si nu beneficiaza de reducerea de 50% (art. 13² OUG
    120/2021), deci lista asta se citeste zilnic, nu lunar.
    """
    reference = today or date.today()
    rows = session.execute(text("""
        SELECT j.id, j.document_id, j.legal_deadline, j.status_code,
               d.bt1_invoice_id, d.company_id,
               (:today - j.legal_deadline) AS days_overdue
        FROM efactura_job j JOIN document d ON d.id = j.document_id
        WHERE j.status_code <> 1
          AND j.legal_deadline IS NOT NULL
          AND j.legal_deadline < :today
        ORDER BY j.legal_deadline
    """), {"today": reference}).all()
    return [dict(row._mapping) for row in rows]


def next_poll_delay(attempts: int) -> timedelta:
    """Intervalul de poll, crescator. ANAF recomanda 5-30 de secunde.

    Nu e retrimitere: `stareMesaj` e o interogare, si e permisa de 100 de ori pe
    zi. Ce nu se repeta automat e UPLOAD-ul.
    """
    seconds = min(5 * (2 ** max(attempts, 0)), 30)
    return timedelta(seconds=seconds)
