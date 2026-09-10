"""Alertele zilnice. Trei termene care nu se pot recupera dupa ce trec.

  - **5 zile lucratoare** de la emitere pentru transmiterea in SPV. Amenda e per
    factura, intre 1.000 si 10.000 lei dupa marimea contribuabilului, plus 15%
    din valoarea facturii in B2B, si NU beneficiaza de reducerea de 50% din
    minim. Art. 13² OUG 120/2021.
  - **60 de zile** cat ANAF pastreaza factura in SPV. Dupa, o sterge definitiv
    si obligatia de arhivare ramane a noastra, fara sursa.
  - **365 de zile** pentru refresh tokenul SPV. Reautorizarea cere om, browser
    si certificat pe token USB — deci alerta trebuie sa ajunga cu 14 zile
    inainte, nu in ziua expirarii.

Scanarea se face per firma, cu contextul setat. Cu un rol care aplica RLS, o
interogare fara context intoarce zero randuri — corect, dar ar face alertele
mute. `company` nu are politica (nu are `company_id`), deci lista de firme se
poate citi fara context.
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any

from sqlalchemy import text

from app.core.anaf import efactura, oauth
from app.db import admin_session, tenant_session

logger = logging.getLogger(__name__)


def _companies() -> list[Any]:
    with admin_session() as session:
        return [row.id for row in session.execute(
            text("SELECT id FROM company ORDER BY bt27_name")).all()]


def check_transmission_deadlines(today: date | None = None) -> list[dict[str, Any]]:
    """Facturi emise, netransmise, cu termenul legal depasit sau aproape."""
    found: list[dict[str, Any]] = []
    for company_id in _companies():
        with tenant_session(company_id) as session:
            overdue = efactura.transmission_overdue(session, today=today)
        for row in overdue:
            logger.error(
                "TERMEN DEPASIT: factura %s, cu %s zile. Amenda e per factura.",
                row["bt1_invoice_id"], row["days_overdue"])
        found.extend(overdue)
    return found


def check_download_windows(today: date | None = None) -> list[dict[str, Any]]:
    """Arhive nedescarcate, cu fereastra de 60 de zile pe terminate."""
    found: list[dict[str, Any]] = []
    for company_id in _companies():
        with tenant_session(company_id) as session:
            alerts = efactura.download_window_alerts(session, today=today)
        for row in alerts:
            logger.warning(
                "ARHIVA NEDESCARCATA: factura %s, termen %s. Dupa, ANAF o sterge "
                "definitiv.", row["bt1_invoice_id"], row["download_deadline"])
        found.extend(alerts)
    return found


def check_unknown_uploads() -> list[dict[str, Any]]:
    """Uploaduri ramase in `unknown`. Cer decizie de om, nu retrimitere."""
    found: list[dict[str, Any]] = []
    for company_id in _companies():
        with tenant_session(company_id) as session:
            pending = efactura.needs_resend_decision(session)
        for row in pending:
            logger.warning(
                "STARE NECLARA: factura %s trimisa la %s, fara raspuns. Verifica "
                "lista de mesaje INAINTE sa retrimiti.",
                row["bt1_invoice_id"], row["sent_at"])
        found.extend(pending)
    return found


def check_spv_authorizations() -> list[oauth.CredentialStatus]:
    """Autorizari SPV care expira. Reinnoirea nu se poate automatiza."""
    with admin_session() as session:
        expiring = oauth.expiring_soon(session)
    for status in expiring:
        logger.error(
            "AUTORIZARE SPV: firma %s, mediul %s, expira in %s zile. Reautorizarea "
            "cere certificatul pe token USB si un om in fata browserului.",
            status.company_id, status.environment,
            status.days_until_refresh_expires)
    return expiring


def run_all(today: date | None = None) -> dict[str, int]:
    """Toate alertele, o data. Intoarce cate a gasit fiecare, pentru log."""
    return {
        "termene_depasite": len(check_transmission_deadlines(today)),
        "arhive_nedescarcate": len(check_download_windows(today)),
        "stari_neclare": len(check_unknown_uploads()),
        "autorizari_care_expira": len(check_spv_authorizations()),
    }
