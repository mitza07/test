"""Programatorul de joburi periodice. `python -m app.workers.scheduler`.

Serviciul `scheduler` din docker-compose.prod.yml porneste exact asta.

Buclă simplă, fara rq-scheduler: un proces, un `sleep`, si un tabel de sarcini cu
intervalul lor. E mai putin elegant decat un cron distribuit, dar are doua
proprietati care conteaza aici — nu adauga o dependinta si nu are stare proprie
care sa se desincronizeze de baza de date.

**Nu ruleaza in mai multe exemplare.** Doua schedulere ar pune de doua ori
aceleasi joburi in coada, iar la SPV asta inseamna consum dublu din cotele
zilnice. Serviciul e definit cu o singura replica; daca vreodata se scaleaza,
prima conditie e un lock in Redis.
"""

from __future__ import annotations

import logging
import signal
import time
from collections.abc import Callable
from contextlib import suppress
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import text

from app.config import get_settings
from app.db import admin_session, tenant_session
from app.workers import alerts
from app.workers.pdf import render_document
from app.workers.queues import enqueue_pdf, enqueue_spv
from app.workers.spv import poll_status, send_document

logger = logging.getLogger(__name__)

TICK_SECONDS = 30


@dataclass
class Task:
    name: str
    interval: timedelta
    run: Callable[[], object]
    last_run: datetime | None = None

    def due(self, now: datetime) -> bool:
        return self.last_run is None or now - self.last_run >= self.interval


def queue_pending_uploads() -> int:
    """Pune la coada facturile emise si netrimise.

    Exclude explicit `is_unknown`: un upload cu soarta necunoscuta NU se reia
    automat, niciodata. Vezi `app.workers.spv.resolve_unknown`.
    """
    queued = 0
    with admin_session() as session:
        companies = [row.id for row in session.execute(
            text("SELECT id FROM company")).all()]
    for company_id in companies:
        with tenant_session(company_id) as session:
            rows = session.execute(text("""
                SELECT j.id FROM efactura_job j
                JOIN document d ON d.id = j.document_id
                WHERE j.status_code = -1
                  AND j.index_incarcare IS NULL
                  AND NOT j.is_unknown
                  AND d.doc_status = 'issued'
                ORDER BY j.legal_deadline NULLS LAST
                LIMIT 100
            """)).all()
        for row in rows:
            enqueue_spv(send_document, str(company_id), str(row.id))
            queued += 1
    if queued:
        logger.info("Puse la coada %s facturi pentru trimitere.", queued)
    return queued


def queue_status_polls() -> int:
    """Interogheaza starea facturilor aflate in prelucrare.

    Cota e de 100 pe zi per index; `consume_status_quota` opreste inainte de
    apel, deci bucla nu are nevoie sa numere ea.
    """
    queued = 0
    with admin_session() as session:
        companies = [row.id for row in session.execute(
            text("SELECT id FROM company")).all()]
    for company_id in companies:
        with tenant_session(company_id) as session:
            rows = session.execute(text("""
                SELECT id FROM efactura_job
                WHERE index_incarcare IS NOT NULL
                  AND status_code IN (-1, 0)
                  AND status_queries_today < 100
                ORDER BY sent_at
                LIMIT 100
            """)).all()
        for row in rows:
            enqueue_spv(poll_status, str(company_id), str(row.id))
            queued += 1
    return queued


def queue_pending_pdfs() -> int:
    """Randeaza PDF-urile facturilor emise care nu au unul.

    Se face aici, si nu din `issue()`, din doua motive: nucleul de emitere ramane
    testabil fara Redis, si sarcina asta e auto-reparatoare — o randare pierduta
    (worker cazut, disc plin) se reia la urmatorul tur, fara interventie.
    """
    queued = 0
    with admin_session() as session:
        companies = [row.id for row in session.execute(
            text("SELECT id FROM company")).all()]
    for company_id in companies:
        with tenant_session(company_id) as session:
            rows = session.execute(text("""
                SELECT id FROM document
                WHERE doc_status = 'issued' AND rendered_pdf_sha256 IS NULL
                ORDER BY bt2_issue_date
                LIMIT 100
            """)).all()
        for row in rows:
            enqueue_pdf(render_document, str(company_id), str(row.id))
            queued += 1
    if queued:
        logger.info("Puse la coada %s facturi pentru randare PDF.", queued)
    return queued


def daily_alerts() -> dict[str, int]:
    counts = alerts.run_all(date.today())
    logger.info("Alerte: %s", counts)
    return counts


def build_tasks() -> list[Task]:
    return [
        Task("trimitere_facturi", timedelta(minutes=5), queue_pending_uploads),
        Task("verificare_stare", timedelta(minutes=10), queue_status_polls),
        Task("randare_pdf", timedelta(minutes=5), queue_pending_pdfs),
        Task("alerte_zilnice", timedelta(hours=24), daily_alerts),
    ]


def run(tasks: list[Task] | None = None, *, once: bool = False,
        tick: float = TICK_SECONDS) -> None:
    tasks = tasks if tasks is not None else build_tasks()
    logger.info("Scheduler pornit, cu %s sarcini.", len(tasks))

    stopping = False

    def stop(signum, frame):   # noqa: ANN001, ARG001
        nonlocal stopping
        logger.info("Semnal %s primit; se opreste dupa sarcina curenta.", signum)
        stopping = True

    for received in (signal.SIGTERM, signal.SIGINT):
        # In afara firului principal (teste), semnalele nu se pot instala.
        with suppress(ValueError):
            signal.signal(received, stop)

    while not stopping:
        now = datetime.now()
        for task in tasks:
            if not task.due(now):
                continue
            try:
                task.run()
            except Exception:
                # O sarcina care crapa nu are voie sa opreasca scheduler-ul:
                # ar bloca si transmiterea facturilor cu termen legal.
                logger.exception("Sarcina %s a esuat.", task.name)
            finally:
                task.last_run = now
        if once:
            return
        time.sleep(tick)


def main() -> None:
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s",
    )
    logger.info("Mediu ANAF: %s.", settings.anaf_environment)
    run()


if __name__ == "__main__":
    main()
