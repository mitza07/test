"""Conexiunea la baza de date si contextul de firma.

Doua lucruri care nu se pot uita, pentru ca amandoua esueaza tacut:

1. **Contextul de firma se seteaza pe fiecare tranzactie**, cu `SET LOCAL`.
   Fara el, politicile RLS returneaza zero randuri — ceea ce arata ca „nu exista
   date", nu ca „ai uitat sa spui cine esti". `tenant_session()` face asta.

2. **Rolul de conexiune nu are voie sa ocoleasca RLS.** Un rol SUPERUSER sau cu
   BYPASSRLS ignora complet politicile, iar izolarea intre firme dispare fara
   niciun semn. Vezi `app.core.rls`. Verificarea ruleaza o data, la pornire.
"""

from __future__ import annotations

import logging
from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.core import rls

logger = logging.getLogger(__name__)

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def check_rls(engine: Engine, app_env: str) -> None:
    """Verifica daca rolul curent aplica RLS.

    In productie refuza pornirea: acolo sunt datele reale a doua firme, iar un
    rol care ocoleste RLS le amesteca fara sa se vada.

    In dev doar avertizeaza, si o face zgomotos. Datele sunt de test, iar
    imaginea oficiala `postgres` creeaza `POSTGRES_USER` ca SUPERUSER — deci
    setarea implicita ar bloca dezvoltarea inainte sa se ia decizia despre
    rolul aplicatiei (vezi TODO.md punctul 3).
    """
    with engine.connect() as connection:
        if not rls.bypasses_rls(connection):
            return
        if app_env == "prod":
            rls.assert_enforced(connection)
        logger.warning(
            "IZOLAREA INTRE FIRME E INACTIVA: rolul de conexiune ocoleste Row "
            "Level Security. Acceptabil doar pe date de test. In productie, "
            "pornirea va fi refuzata. Vezi docs/decizii.md."
        )


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
        check_rls(_engine, settings.app_env)
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(bind=get_engine(), expire_on_commit=False)
    return _session_factory


@contextmanager
def tenant_session(company_id: UUID | str) -> Iterator[Session]:
    """O tranzactie cu firma fixata. Commit la iesire, rollback la exceptie.

    `SET LOCAL` moare la COMMIT, deci contextul nu ramane lipit de conexiunea
    intoarsa in pool. Asta e diferenta care conteaza sub trafic.
    """
    session = get_session_factory()()
    try:
        with session.begin():
            rls.set_company(session.connection(), company_id)
            yield session
    finally:
        session.close()


@contextmanager
def admin_session() -> Iterator[Session]:
    """Tranzactie FARA context de firma.

    Doar pentru operatiuni care traverseaza firmele si nu citesc date de tenant:
    alertele care scaneaza toate joburile, migratiile, rapoartele de operare.
    Cu un rol care aplica RLS, un `SELECT` pe o tabela de tenant intoarce zero
    randuri de aici — nu e o scapare, e comportamentul corect.
    """
    session = get_session_factory()()
    try:
        with session.begin():
            yield session
    finally:
        session.close()
