"""Alocarea numerelor de serie, pe Postgres real.

TODO.md punctul 3: „doua emiteri simultane pe aceeasi serie nu produc duplicat".
Nu se poate verifica altfel — `SELECT ... FOR UPDATE` e o proprietate a
serverului. Un mock ar confirma doar ca stim sa scriem SQL.

Se ruleaza cand exista `TEST_DATABASE_URL`. Vezi tests/test_rls.py pentru setup.
"""

import os
import threading
from uuid import uuid4

import pytest

from app.core.numbering import allocate, can_delete

pytest.importorskip("sqlalchemy")
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL nu e setat; concurenta nu se poate verifica fara Postgres",
)

COMPANY = "33333333-3333-3333-3333-333333333333"


@pytest.fixture(scope="module")
def engine():
    engine = create_engine(TEST_DATABASE_URL, future=True)
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM document WHERE company_id = :c"),
                           {"c": COMPANY})
        connection.execute(text("DELETE FROM doc_series WHERE company_id = :c"),
                           {"c": COMPANY})
        connection.execute(text("DELETE FROM company WHERE id = :c"), {"c": COMPANY})
        connection.execute(text("""
            INSERT INTO company (id, bt32_legal_reg_id, bt27_name, bt35_address1,
                                 bt37_city, bt39_county, bt40_country)
            VALUES (:c, '8609468', 'Firma Numerotare SRL', 'Str. C 3',
                    'SECTOR2', 'RO-B', 'RO')
        """), {"c": COMPANY})
    yield engine
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM document WHERE company_id = :c"),
                           {"c": COMPANY})
        connection.execute(text("DELETE FROM doc_series WHERE company_id = :c"),
                           {"c": COMPANY})
        connection.execute(text("DELETE FROM company WHERE id = :c"), {"c": COMPANY})
    engine.dispose()


@pytest.fixture
def series(engine):
    """O serie proaspata pentru fiecare test, ca sa nu depinda de ordine."""
    def make(name="FS", next_number=1, padding=4, is_active=True):
        series_id = uuid4()
        with engine.begin() as connection:
            connection.execute(text("""
                INSERT INTO doc_series (id, company_id, doc_type, name, next_number,
                                        padding, is_active)
                VALUES (:id, :c, 'factura', :name, :n, :p, :active)
            """), {"id": series_id, "c": COMPANY, "name": f"{name}{uuid4().hex[:4]}",
                   "n": next_number, "p": padding, "active": is_active})
        return series_id
    return make


def _add_document(engine, series_id, number, *, deleted=False, index_incarcare=None):
    document_id = uuid4()
    with engine.begin() as connection:
        name = connection.execute(text("SELECT name FROM doc_series WHERE id = :s"),
                                  {"s": series_id}).scalar_one()
        connection.execute(text("""
            INSERT INTO document (id, company_id, doc_type, series_id, series_name,
                                  number, bt1_invoice_id, client_snapshot,
                                  seller_snapshot, doc_status)
            VALUES (:id, :c, 'factura', :s, :sn, :n, :inv, '{}'::jsonb, '{}'::jsonb, :st)
        """), {"id": document_id, "c": COMPANY, "s": series_id, "sn": name,
               "n": number, "inv": f"{name}{number:04d}",
               "st": "deleted" if deleted else "issued"})
        if index_incarcare is not None:
            # efactura_job nu are company_id: se leaga prin document_id.
            connection.execute(text("""
                INSERT INTO efactura_job (document_id, index_incarcare)
                VALUES (:d, :i)
            """), {"d": document_id, "i": index_incarcare})
    return document_id


# --- alocarea de baza ------------------------------------------------------

def test_aloca_si_formateaza(engine, series):
    series_id = series(next_number=7, padding=4)
    with Session(engine) as session, session.begin():
        allocated = allocate(session, series_id)
    assert allocated.number == 7
    assert allocated.formatted.endswith("0007")


def test_incrementeaza_pentru_urmatorul(engine, series):
    series_id = series(next_number=1)
    with Session(engine) as session, session.begin():
        first = allocate(session, series_id)
    with Session(engine) as session, session.begin():
        second = allocate(session, series_id)
    assert (first.number, second.number) == (1, 2)


def test_seria_inactiva_e_refuzata(engine, series):
    series_id = series(is_active=False)
    with Session(engine) as session, session.begin():  # noqa: SIM117
        with pytest.raises(ValueError, match="inactiva"):
            allocate(session, series_id)


def test_seria_inexistenta_e_refuzata(engine):
    with Session(engine) as session, session.begin():  # noqa: SIM117
        with pytest.raises(ValueError, match="nu exista"):
            allocate(session, uuid4())


def test_rollback_nu_consuma_numarul(engine, series):
    """Constrangerea 9: o factura care pica validarea nu consuma un numar.

    Fluxul aloca numarul in tranzactia de emitere; daca aceea se intoarce,
    seria trebuie sa ramana neatinsa. Fara gauri.
    """
    series_id = series(next_number=1)
    session = Session(engine)
    session.begin()
    allocate(session, series_id)
    session.rollback()
    session.close()

    with Session(engine) as session, session.begin():
        assert allocate(session, series_id).number == 1


# --- concurenta ------------------------------------------------------------

def test_doua_emiteri_simultane_nu_produc_duplicat(engine, series):
    """Testul cerut de TODO.md punctul 3.

    Ambele fire intra in `allocate` inainte ca vreunul sa comita: bariera
    garanteaza suprapunerea. `SELECT ... FOR UPDATE` trebuie sa serializeze
    accesul, iar al doilea fir sa vada valoarea deja incrementata.
    """
    series_id = series(next_number=1)
    barrier = threading.Barrier(2)
    results: list[int] = []
    errors: list[BaseException] = []
    lock = threading.Lock()

    def worker():
        try:
            with Session(engine) as session, session.begin():
                barrier.wait(timeout=10)
                allocated = allocate(session, series_id)
                with lock:
                    results.append(allocated.number)
        except BaseException as error:      # noqa: BLE001
            with lock:
                errors.append(error)

    threads = [threading.Thread(target=worker) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=20)

    assert not errors, errors
    assert sorted(results) == [1, 2], f"numere alocate: {results}"


def test_zece_emiteri_simultane_dau_zece_numere_distincte(engine, series):
    series_id = series(next_number=1)
    count = 10
    barrier = threading.Barrier(count)
    results: list[int] = []
    errors: list[BaseException] = []
    lock = threading.Lock()

    def worker():
        try:
            with Session(engine) as session, session.begin():
                barrier.wait(timeout=15)
                allocated = allocate(session, series_id)
                with lock:
                    results.append(allocated.number)
        except BaseException as error:      # noqa: BLE001
            with lock:
                errors.append(error)

    threads = [threading.Thread(target=worker) for _ in range(count)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)

    assert not errors, errors
    assert sorted(results) == list(range(1, count + 1)), f"numere alocate: {results}"
    assert len(set(results)) == count, "s-a alocat de doua ori acelasi numar"


# --- stergerea -------------------------------------------------------------

def test_ultimul_din_serie_se_poate_sterge(engine, series):
    series_id = series()
    _add_document(engine, series_id, 1)
    last = _add_document(engine, series_id, 2)
    with Session(engine) as session, session.begin():
        allowed, reason = can_delete(session, last)
    assert allowed is True and reason is None


def test_penultimul_nu_se_poate_sterge(engine, series):
    """Altfel raman gauri in serie, iar seria devine imposibil de justificat."""
    series_id = series()
    first = _add_document(engine, series_id, 1)
    _add_document(engine, series_id, 2)
    with Session(engine) as session, session.begin():
        allowed, reason = can_delete(session, first)
    assert allowed is False
    assert "ultimul document din serie" in reason


def test_documentul_trimis_la_spv_nu_se_poate_sterge(engine, series):
    """Odata ce ai index de incarcare, stergerea locala creeaza o discrepanta
    permanenta cu ANAF. Se storneaza, nu se sterge."""
    series_id = series()
    document = _add_document(engine, series_id, 1, index_incarcare="5001120362")
    with Session(engine) as session, session.begin():
        allowed, reason = can_delete(session, document)
    assert allowed is False
    assert "index de incarcare" in reason


def test_documentul_deja_sters(engine, series):
    series_id = series()
    document = _add_document(engine, series_id, 1, deleted=True)
    with Session(engine) as session, session.begin():
        allowed, reason = can_delete(session, document)
    assert allowed is False
    assert "deja sters" in reason


def test_documentul_inexistent(engine):
    with Session(engine) as session, session.begin():
        allowed, reason = can_delete(session, uuid4())
    assert allowed is False
    assert "nu exista" in reason


def test_documentele_sterse_nu_conteaza_la_ultimul_din_serie(engine, series):
    """`max_number` ignora documentele sterse. Daca nu le-ar ignora, o stergere
    ar bloca permanent urmatoarea."""
    series_id = series()
    document = _add_document(engine, series_id, 1)
    _add_document(engine, series_id, 2, deleted=True)
    with Session(engine) as session, session.begin():
        allowed, _ = can_delete(session, document)
    assert allowed is True
