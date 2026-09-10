"""Izolarea intre firme: setarea contextului si verificarea ca RLS chiar se aplica.

CLAUDE.md promite: „Un query fara filtru returneaza zero randuri". Promisiunea e
adevarata doar daca aplicatia se conecteaza cu un rol care NU ocoleste RLS.

## Gaura care nu se vede

Postgres ignora complet politicile RLS pentru:

  - roluri `SUPERUSER`
  - roluri cu atributul `BYPASSRLS`

`FORCE ROW LEVEL SECURITY` din migratia 0002 rezolva doar cazul proprietarului
tabelei. Pe superuser nu are efect.

Imaginea oficiala `postgres` creeaza `POSTGRES_USER` ca SUPERUSER. Cu
`.env.example` asa cum e livrat — `POSTGRES_USER=facturare` si `DATABASE_URL`
care se conecteaza tot ca `facturare` — politicile exista, se vad in
`pg_policies`, si nu fac nimic. Verificat pe Postgres 16:

    ca superuser, fara app.company_id:   2 randuri   <- toate firmele
    ca rol normal, fara app.company_id:  0 randuri
    ca rol normal, cu app.company_id:    1 rand      <- doar firma ceruta

Esecul e tacut: totul pare in regula pana cand un endpoint returneaza datele
altui client. De aceea `assert_enforced()` se cheama la pornire si refuza sa
porneasca, in loc sa avertizeze intr-un log pe care nu il citeste nimeni.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Connection


class RlsNotEnforced(RuntimeError):
    """Rolul curent ocoleste RLS. Izolarea intre firme nu exista."""


def set_company(connection: Connection, company_id: UUID | str) -> None:
    """Fixeaza firma pentru tranzactia CURENTA.

    `SET LOCAL` se anuleaza la COMMIT sau ROLLBACK, deci contextul nu se scurge
    catre urmatoarea tranzactie care primeste aceeasi conexiune din pool. Un
    `SET` simplu ar face exact asta, si ar fi cea mai urata clasa de bug:
    corect in teste, gresit sub trafic.
    """
    connection.execute(
        text("SELECT set_config('app.company_id', :value, true)"),
        {"value": str(company_id)},
    )


def current_company(connection: Connection) -> str | None:
    value = connection.execute(
        text("SELECT NULLIF(current_setting('app.company_id', true), '')")
    ).scalar()
    return value


def bypasses_rls(connection: Connection) -> bool:
    """True daca rolul conexiunii curente ignora politicile RLS."""
    row = connection.execute(text("""
        SELECT rolsuper, rolbypassrls
        FROM pg_roles
        WHERE rolname = current_user
    """)).one_or_none()
    if row is None:
        return False
    return bool(row.rolsuper or row.rolbypassrls)


def assert_enforced(connection: Connection) -> None:
    """Refuza sa continue daca izolarea intre firme e inactiva.

    Se cheama o singura data, la pornire. Costul e o interogare; alternativa e
    sa afli din reclamatia unui client.
    """
    if not bypasses_rls(connection):
        return
    role = connection.execute(text("SELECT current_user")).scalar()
    raise RlsNotEnforced(
        f"Rolul '{role}' este SUPERUSER sau are BYPASSRLS, deci politicile Row "
        "Level Security nu se aplica: orice query vede datele tuturor firmelor. "
        "Conecteaza aplicatia cu un rol obisnuit (NOSUPERUSER, NOBYPASSRLS) si "
        "pastreaza rolul privilegiat doar pentru migratii. Atentie: imaginea "
        "oficiala `postgres` creeaza POSTGRES_USER ca SUPERUSER."
    )


def policies_missing(connection: Connection, tables: list[str]) -> list[str]:
    """Tabelele fara RLS activ. Complementar lui `assert_enforced`.

    Un rol corect pe o tabela fara politica e la fel de expus ca un superuser:
    lipseste cealalta jumatate a mecanismului.
    """
    rows = connection.execute(text("""
        SELECT c.relname AS name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname = ANY(:tables)
          AND NOT c.relrowsecurity
    """), {"tables": tables}).all()
    return sorted(row.name for row in rows)
