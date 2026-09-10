"""Joburile care vorbesc cu SPV-ul.

Fiecare job primeste `company_id` explicit si ruleaza intr-o tranzactie cu firma
fixata: `efactura_job` nu are coloana `company_id`, se ajunge la ea prin document,
iar politica ei RLS delega catre parinte (migratia 0003). Fara context, jobul
nu vede nimic — corect, dar inutil.

## Ce NU face modulul asta

Nu reia niciodata un upload ramas in stare `unknown`. RQ are `retry`, si e
tentant sa-l pui pe `send_document`. Nu se pune. Un upload intrerupt poate sa fi
ajuns la ANAF; a doua incercare ar produce doua facturi identice in SPV, iar
acolo nu exista buton de anulare. Starea reala se afla cu `listaMesajeFactura`,
prin `resolve_unknown()`, si decizia ramane a unui om.
"""

from __future__ import annotations

import logging
from pathlib import Path
from uuid import UUID

from sqlalchemy import text

from app.config import get_settings
from app.core.anaf import efactura, oauth
from app.db import tenant_session

logger = logging.getLogger(__name__)


class NothingToDo(RuntimeError):
    """Jobul nu mai are ce face. Nu e eroare — se logheaza si se iese."""


def _token(session, company_id: UUID) -> str:
    settings = get_settings()
    return oauth.access_token(
        session, company_id, settings.anaf_environment,
        client_id=settings.anaf_client_id,
        client_secret=settings.anaf_client_secret,
    )


def _job_row(session, job_id: UUID):
    row = session.execute(text("""
        SELECT j.*, d.bt1_invoice_id, d.bt2_issue_date, d.company_id,
               c.bt32_legal_reg_id, c.bt31_vat_id
        FROM efactura_job j
        JOIN document d ON d.id = j.document_id
        JOIN company c ON c.id = d.company_id
        WHERE j.id = :id
    """), {"id": str(job_id)}).one_or_none()
    if row is None:
        raise NothingToDo(f"Jobul {job_id} nu exista sau nu e vizibil in acest context.")
    return row


def _cif(row) -> str:
    """CUI numeric, fara prefixul RO. E destinatarul erorilor la ANAF."""
    from app.core.validation.cui import normalize_cui

    return normalize_cui(row.bt32_legal_reg_id or row.bt31_vat_id or "")


def send_document(company_id: str, job_id: str) -> str:
    """Trimite XML-ul in SPV. O SINGURA data, orice s-ar intampla."""
    with tenant_session(company_id) as session:
        row = _job_row(session, UUID(job_id))
        if row.index_incarcare:
            raise NothingToDo(
                f"Factura {row.bt1_invoice_id} are deja index de incarcare "
                f"{row.index_incarcare}. Retrimiterea ar duplica-o in SPV.")
        if row.is_unknown:
            raise NothingToDo(
                f"Factura {row.bt1_invoice_id} e in stare 'unknown'. Se lamureste "
                "cu lista de mesaje, nu cu inca un upload.")
        if not row.xml_ubl:
            raise NothingToDo(f"Jobul {job_id} nu are XML.")

        settings = get_settings()
        result = efactura.upload(
            row.xml_ubl.encode("utf-8"),
            token=_token(session, row.company_id),
            cif=_cif(row),
            environment=settings.anaf_environment,
            standard=row.standard,
            b2c=row.is_b2c,
            extern=row.flag_extern,
            autofactura=row.flag_autofactura,
            executare=row.flag_executare,
        )
        efactura.record_upload(session, UUID(job_id), result)

    if result.unknown:
        logger.warning("Upload %s in stare unknown: %s", row.bt1_invoice_id,
                       "; ".join(result.errors))
        return "unknown"
    if not result.ok:
        logger.error("Upload %s respins: %s", row.bt1_invoice_id,
                     "; ".join(result.errors))
        return "rejected"
    return result.index_incarcare or "ok"


def poll_status(company_id: str, job_id: str) -> str:
    """Interogheaza `stareMesaj`. Consuma din cota inainte de apel."""
    with tenant_session(company_id) as session:
        row = _job_row(session, UUID(job_id))
        if not row.index_incarcare:
            raise NothingToDo(f"Jobul {job_id} nu are index de incarcare.")
        if row.status_code == 1 and row.id_descarcare:
            raise NothingToDo("Factura e deja validata si are id de descarcare.")

        efactura.consume_status_quota(session, UUID(job_id))
        state = efactura.message_state(
            row.index_incarcare,
            token=_token(session, row.company_id),
            environment=get_settings().anaf_environment,
        )
        efactura.record_state(session, UUID(job_id), state)

        if state.finished and state.id_descarcare:
            # Descarcarea are fereastra fixa de 60 de zile; se pune la coada acum.
            from app.workers.queues import enqueue_spv
            enqueue_spv(download_archive, company_id, job_id)
    return state.stare or "unknown"


def download_archive(company_id: str, job_id: str) -> str:
    """Descarca ZIP-ul si il pune in storage.

    ZIP-ul contine XML-ul procesat si sigiliul MF. Asta e ORIGINALUL LEGAL —
    PDF-ul e reprezentare cu rol informativ. Dupa 60 de zile ANAF il sterge
    definitiv si nu mai exista de unde.
    """
    with tenant_session(company_id) as session:
        row = _job_row(session, UUID(job_id))
        if not row.id_descarcare:
            raise NothingToDo(f"Jobul {job_id} nu are id de descarcare.")
        if row.downloaded_at:
            raise NothingToDo("Arhiva e deja descarcata.")

        settings = get_settings()
        efactura.consume_download_quota(session, UUID(job_id))
        content = efactura.download(
            row.id_descarcare,
            token=_token(session, row.company_id),
            environment=settings.anaf_environment,
        )

        target = (Path(settings.storage_path) / str(row.company_id)
                  / str(row.bt2_issue_date.year))
        target.mkdir(parents=True, exist_ok=True)
        path = target / f"{row.bt1_invoice_id}-{row.id_descarcare}.zip"
        path.write_bytes(content)
        efactura.mark_downloaded(session, UUID(job_id), str(path))
    return str(path)


def resolve_unknown(company_id: str, job_id: str) -> str:
    """Lamureste o stare `unknown` intreband ANAF ce a primit.

    NU trimite nimic. Cauta factura in lista de mesaje: daca apare, uploadul a
    reusit si se recupereaza indexul; daca nu apare, decizia de a retrimite
    ramane a unui om, care stie contextul.
    """
    with tenant_session(company_id) as session:
        row = _job_row(session, UUID(job_id))
        if not row.is_unknown:
            raise NothingToDo("Jobul nu e in stare unknown.")

        settings = get_settings()
        messages = efactura.list_messages(
            _cif(row),
            token=_token(session, row.company_id),
            environment=settings.anaf_environment,
            days=60,
        )
        match = next((message for message in messages
                      if str(message.get("id_solicitare") or "") == (row.index_incarcare or "")
                      or row.bt1_invoice_id in str(message.get("detalii", ""))), None)
        if match is None:
            logger.warning(
                "Factura %s nu apare in lista de mesaje. NU se retrimite automat: "
                "decizia e a unui om.", row.bt1_invoice_id)
            return "negasita"

        session.execute(text("""
            UPDATE efactura_job SET is_unknown = false,
                   index_incarcare = coalesce(index_incarcare, :index),
                   id_descarcare = coalesce(id_descarcare, :download)
            WHERE id = :id
        """), {"id": str(job_id), "index": str(match.get("id_solicitare") or ""),
               "download": str(match.get("id") or "") or None})
    logger.info("Factura %s a fost gasita in SPV: uploadul reusise.",
                row.bt1_invoice_id)
    return "gasita"
