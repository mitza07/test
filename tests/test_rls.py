"""Izolarea intre firme, verificata pe un Postgres real.

Nu se poate testa altfel: RLS e o proprietate a serverului, nu a codului nostru.
Un mock ar confirma doar ca stim sa scriem `SET LOCAL`.

Se ruleaza cand exista `TEST_DATABASE_URL`:

    createdb facturare_test
    psql -d facturare_test -f docs/schema_facturare_v2.sql
    alembic upgrade head
    TEST_DATABASE_URL=postgresql+psycopg://user@/facturare_test pytest tests/test_rls.py

Testele isi creeaza singure rolul neprivilegiat de care au nevoie si il sterg
la final.
"""

import os
from uuid import uuid4

import pytest

from app.core import rls

sqlalchemy = pytest.importorskip("sqlalchemy")
from sqlalchemy import create_engine, text  # noqa: E402

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL nu e setat; RLS nu se poate verifica fara Postgres",
)

FIRMA_A = "11111111-1111-1111-1111-111111111111"
FIRMA_B = "22222222-2222-2222-2222-222222222222"

TENANT_TABLES = ["document", "client", "spv_credential", "doc_series"]


@pytest.fixture(scope="module")
def owner_engine():
    engine = create_engine(TEST_DATABASE_URL, future=True)
    yield engine
    engine.dispose()


@pytest.fixture(scope="module")
def seeded(owner_engine):
    """Doua firme, cu cate o serie fiecare. Se sterg la final."""
    with owner_engine.begin() as connection:
        connection.execute(text("DELETE FROM doc_series WHERE company_id = ANY(:ids)"),
                           {"ids": [FIRMA_A, FIRMA_B]})
        connection.execute(text("DELETE FROM company WHERE id = ANY(:ids)"),
                           {"ids": [FIRMA_A, FIRMA_B]})
        connection.execute(text("""
            INSERT INTO company (id, bt32_legal_reg_id, bt27_name, bt35_address1,
                                 bt37_city, bt39_county, bt40_country)
            VALUES (:a, '8609468', 'Firma A SRL', 'Str. A 1', 'SECTOR1', 'RO-B', 'RO'),
                   (:b, '8609468', 'Firma B SRL', 'Str. B 2', 'Cluj-Napoca', 'RO-CJ', 'RO')
        """), {"a": FIRMA_A, "b": FIRMA_B})
        connection.execute(text("""
            INSERT INTO doc_series (company_id, doc_type, name, next_number, padding)
            VALUES (:a, 'factura', 'FA', 1, 4), (:b, 'factura', 'FB', 1, 4)
        """), {"a": FIRMA_A, "b": FIRMA_B})
    yield
    with owner_engine.begin() as connection:
        connection.execute(text("DELETE FROM doc_series WHERE company_id = ANY(:ids)"),
                           {"ids": [FIRMA_A, FIRMA_B]})
        connection.execute(text("DELETE FROM company WHERE id = ANY(:ids)"),
                           {"ids": [FIRMA_A, FIRMA_B]})


@pytest.fixture(scope="module")
def tenant_engine(owner_engine, seeded):
    """Un rol obisnuit: NOSUPERUSER, NOBYPASSRLS. Asa trebuie sa se conecteze aplicatia."""
    role = f"rls_test_{uuid4().hex[:8]}"
    with owner_engine.connect() as connection:
        connection.execution_options(isolation_level="AUTOCOMMIT")
        connection.execute(text(
            f'CREATE ROLE "{role}" LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD \'test\''))
        connection.execute(text(f'GRANT USAGE ON SCHEMA public TO "{role}"'))
        connection.execute(text(
            f'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "{role}"'))
        connection.commit()

    url = sqlalchemy.engine.make_url(TEST_DATABASE_URL).set(
        username=role, password="test")
    engine = create_engine(url, future=True)
    yield engine
    engine.dispose()
    with owner_engine.connect() as connection:
        connection.execution_options(isolation_level="AUTOCOMMIT")
        connection.execute(text(
            f'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "{role}"'))
        connection.execute(text(f'REVOKE USAGE ON SCHEMA public FROM "{role}"'))
        connection.execute(text(f'DROP ROLE IF EXISTS "{role}"'))
        connection.commit()


# --- izolarea propriu-zisa -------------------------------------------------

def test_fara_context_zero_randuri(tenant_engine):
    """Promisiunea din CLAUDE.md: „Un query fara filtru returneaza zero randuri"."""
    with tenant_engine.connect() as connection:
        count = connection.execute(text("SELECT count(*) FROM doc_series")).scalar()
    assert count == 0


def test_cu_context_doar_firma_ceruta(tenant_engine):
    with tenant_engine.begin() as connection:
        rls.set_company(connection, FIRMA_A)
        names = connection.execute(text("SELECT name FROM doc_series")).scalars().all()
    assert names == ["FA"]


def test_contextul_nu_se_scurge_intre_tranzactii(tenant_engine):
    """`SET LOCAL` moare la COMMIT. Un `SET` simplu ar lasa firma precedenta
    lipita de conexiunea intoarsa in pool — corect in teste, gresit sub trafic."""
    with tenant_engine.connect() as connection:
        with connection.begin():
            rls.set_company(connection, FIRMA_A)
            assert connection.execute(text("SELECT count(*) FROM doc_series")).scalar() == 1
        # aceeasi conexiune, tranzactie noua, fara context
        with connection.begin():
            assert rls.current_company(connection) is None
            assert connection.execute(text("SELECT count(*) FROM doc_series")).scalar() == 0


def test_nu_poti_scrie_pe_firma_altuia(tenant_engine):
    """WITH CHECK, nu doar USING: altfel ai putea insera randuri pe care apoi
    nu le mai vezi."""
    with tenant_engine.begin() as connection:
        rls.set_company(connection, FIRMA_A)
        with pytest.raises(sqlalchemy.exc.ProgrammingError):
            connection.execute(text("""
                INSERT INTO doc_series (company_id, doc_type, name, next_number, padding)
                VALUES (:b, 'factura', 'FURAT', 1, 4)
            """), {"b": FIRMA_B})


def test_update_nu_muta_randuri_intre_firme(tenant_engine):
    with tenant_engine.begin() as connection:
        rls.set_company(connection, FIRMA_A)
        result = connection.execute(text(
            "UPDATE doc_series SET name = 'MUTAT' WHERE company_id = :b"),
            {"b": FIRMA_B})
        assert result.rowcount == 0


# --- detectia rolului care ocoleste RLS ------------------------------------

def test_rolul_aplicatiei_nu_ocoleste_rls(tenant_engine):
    with tenant_engine.connect() as connection:
        assert rls.bypasses_rls(connection) is False
        rls.assert_enforced(connection)   # nu ridica


def test_superuserul_ocoleste_rls_si_e_detectat(owner_engine):
    """Cazul real: imaginea oficiala `postgres` creeaza POSTGRES_USER ca
    SUPERUSER, iar `.env.example` conecteaza aplicatia tot cu el. Politicile
    exista, se vad in pg_policies, si nu fac nimic."""
    with owner_engine.connect() as connection:
        is_superuser = connection.execute(text(
            "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user"
        )).scalar()
        if not is_superuser:
            pytest.skip("TEST_DATABASE_URL nu e un rol privilegiat; nimic de demonstrat")

        assert rls.bypasses_rls(connection) is True
        with pytest.raises(rls.RlsNotEnforced, match="SUPERUSER"):
            rls.assert_enforced(connection)


def test_superuserul_chiar_vede_toate_firmele(owner_engine, seeded):
    """Nu doar ca detectam atributul rolului — aratam consecinta."""
    with owner_engine.connect() as connection:
        if not rls.bypasses_rls(connection):
            pytest.skip("TEST_DATABASE_URL nu e un rol privilegiat")
        names = connection.execute(text(
            "SELECT name FROM doc_series WHERE company_id = ANY(:ids) ORDER BY name"),
            {"ids": [FIRMA_A, FIRMA_B]}).scalars().all()
    assert names == ["FA", "FB"], "superuserul vede ambele firme, fara niciun filtru"


def test_toate_tabelele_de_tenant_au_rls_activ(owner_engine):
    """Un rol corect pe o tabela fara politica e la fel de expus ca un superuser."""
    with owner_engine.connect() as connection:
        missing = rls.policies_missing(connection, TENANT_TABLES)
    assert missing == [], f"tabele fara RLS: {missing}"
