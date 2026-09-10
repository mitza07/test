"""Recurentele: generarea de noapte, aprobarea in bloc.

Pe Postgres real: idempotenta e o constrangere de baza de date, nu o conditie in
Python, si nu se poate verifica altfel.
"""

import os
from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from app.core import recurring

pytest.importorskip("sqlalchemy")
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

D = Decimal
PRET_IMPLICIT = D("500.00")   # constanta la nivel de modul: B008
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL, reason="recurentele cer Postgres")

COMPANY = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


@pytest.fixture(scope="module")
def engine():
    engine = create_engine(TEST_DATABASE_URL, future=True)
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM recurring_template WHERE company_id = :c"),
                           {"c": COMPANY})
        connection.execute(text("DELETE FROM document WHERE company_id = :c"),
                           {"c": COMPANY})
        connection.execute(text("DELETE FROM company WHERE id = :c"), {"c": COMPANY})
        connection.execute(text("""
            INSERT INTO company (id, bt31_vat_id, bt32_legal_reg_id, bt27_name,
                                 bt35_address1, bt37_city, bt39_county, bt40_country)
            VALUES (:c, 'RO8609468', '8609468', 'Atelier IT SRL', 'Str. Fabricii 10',
                    'SECTOR1', 'RO-B', 'RO')
        """), {"c": COMPANY})
    yield engine
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM recurring_template WHERE company_id = :c"),
                           {"c": COMPANY})
        connection.execute(text("DELETE FROM document WHERE company_id = :c"),
                           {"c": COMPANY})
        connection.execute(text("DELETE FROM company WHERE id = :c"), {"c": COMPANY})
    engine.dispose()


@pytest.fixture
def template(engine):
    """Fiecare test isi curata sabloanele: `due()` intoarce tot ce e activ pe
    firma, deci un sablon lasat in urma schimba rezultatul testului urmator."""
    created: list = []

    def make(*, day_of_month=5, lead_days=1, frequency="monthly",
             client_cui="8609468", price=PRET_IMPLICIT, start=date(2026, 1, 1),
             end=None, active=True, note=None):
        template_id, client_id, series_id = uuid4(), uuid4(), uuid4()
        with engine.begin() as connection:
            connection.execute(text("""
                INSERT INTO client (id, company_id, bt47_legal_reg_id, bt44_name,
                                    bt50_address1, bt52_city, bt54_county, bt55_country)
                VALUES (:cl, :c, :cui, 'Studio Nord SRL', 'Str. Atelierului 5',
                        'Cluj-Napoca', 'RO-CJ', 'RO')
            """), {"cl": client_id, "c": COMPANY, "cui": client_cui})
            connection.execute(text("""
                INSERT INTO doc_series (id, company_id, doc_type, name)
                VALUES (:s, :c, 'factura', :n)
            """), {"s": series_id, "c": COMPANY, "n": f"FR{uuid4().hex[:4].upper()}"})
            connection.execute(text("""
                INSERT INTO recurring_template (id, company_id, name, client_id,
                    series_id, frequency, day_of_month, lead_days, payment_days,
                    start_date, end_date, is_active, note)
                VALUES (:t, :c, 'Mentenanta lunara', :cl, :s, :freq, :day, :lead,
                        30, :start, :end, :active, :note)
            """), {"t": template_id, "c": COMPANY, "cl": client_id, "s": series_id,
                   "freq": frequency, "day": day_of_month, "lead": lead_days,
                   "start": start, "end": end, "active": active, "note": note})
            created.append(template_id)
            connection.execute(text("""
                INSERT INTO recurring_template_line (template_id, position,
                    bt153_name, bt129_quantity, bt130_unit_code, bt146_item_price,
                    bt151_vat_category, bt152_vat_percent, saft_tax_code)
                VALUES (:t, 1, 'Mentenanta si suport', 1, 'MON', :price, 'S', 21, '20')
            """), {"t": template_id, "price": price})
        return template_id
    yield make
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM recurring_template WHERE id = ANY(:ids)"),
                           {"ids": created})
        connection.execute(text("DELETE FROM document WHERE company_id = :c"),
                           {"c": COMPANY})


def _template_row(session, template_id):
    return session.execute(text("SELECT * FROM recurring_template WHERE id = :t"),
                           {"t": str(template_id)}).one()


# --- perioade --------------------------------------------------------------

@pytest.mark.parametrize(("reference", "frequency", "expected"), [
    (date(2026, 9, 15), "monthly", date(2026, 9, 1)),
    (date(2026, 9, 15), "quarterly", date(2026, 7, 1)),
    (date(2026, 2, 3), "quarterly", date(2026, 1, 1)),
    (date(2026, 12, 31), "quarterly", date(2026, 10, 1)),
    (date(2026, 9, 15), "yearly", date(2026, 1, 1)),
])
def test_perioada_e_stabila(reference, frequency, expected):
    """Cheia de idempotenta: aceeasi zi da mereu aceeasi perioada."""
    assert recurring.period_start(reference, frequency) == expected


def test_frecventa_necunoscuta_e_refuzata():
    with pytest.raises(recurring.RecurringError, match="saptamanal|nu exista"):
        recurring.period_start(date(2026, 9, 1), "saptamanal")


def test_add_months_trece_peste_an():
    assert recurring.add_months(date(2026, 11, 5), 3) == date(2027, 2, 5)


def test_ziua_28_exista_in_orice_luna():
    """De asta schema limiteaza `day_of_month` la 28. Cu 31, februarie ar fi
    sarita tacut: jobul nu ar gasi nicio zi potrivita."""
    for month in range(1, 13):
        assert recurring.add_months(date(2026, 1, 28), month - 1).day == 28


# --- generarea -------------------------------------------------------------

def test_genereaza_ciorna_validata(engine, template):
    template_id = template(day_of_month=5, lead_days=1)
    with Session(engine) as session, session.begin():
        draft = recurring.generate(session, _template_row(session, template_id),
                                   on_date=date(2026, 9, 4))
    assert draft is not None
    assert draft.ok, [f.message for f in draft.report.findings]
    assert draft.period == date(2026, 9, 1)

    with engine.connect() as connection:
        row = connection.execute(text("""
            SELECT doc_status, bt2_issue_date, bt9_due_date, bt115_payable,
                   bt73_period_start, bt74_period_end
            FROM document WHERE id = :d"""), {"d": draft.document_id}).one()
    assert row.doc_status == "draft", "ciorna, nu factura emisa"
    assert row.bt2_issue_date == date(2026, 9, 5)
    assert row.bt9_due_date == date(2026, 10, 5), "30 de zile de plata"
    assert row.bt115_payable == D("605.00")
    assert row.bt73_period_start == date(2026, 9, 1)
    assert row.bt74_period_end == date(2026, 9, 30)


def test_nu_genereaza_inainte_de_fereastra(engine, template):
    """`lead_days` = 1, deci pe 3 septembrie inca nu e nimic de facut."""
    template_id = template(day_of_month=5, lead_days=1)
    with Session(engine) as session, session.begin():
        assert recurring.generate(session, _template_row(session, template_id),
                                  on_date=date(2026, 9, 3)) is None


def test_a_doua_rulare_nu_mai_genereaza(engine, template):
    """Idempotenta. Jobul de noapte poate rula de doua ori — dupa o repornire sau
    dupa o restaurare din backup. A doua oara nu produce inca o ciorna."""
    template_id = template()
    with Session(engine) as session, session.begin():
        first = recurring.generate(session, _template_row(session, template_id),
                                   on_date=date(2026, 9, 4))
    with Session(engine) as session, session.begin():
        second = recurring.generate(session, _template_row(session, template_id),
                                    on_date=date(2026, 9, 4))
    assert first is not None
    assert second is None

    with engine.connect() as connection:
        count = connection.execute(text(
            "SELECT count(*) FROM recurring_run WHERE template_id = :t"),
            {"t": template_id}).scalar_one()
    assert count == 1


def test_constrangerea_de_idempotenta_e_in_baza(engine, template):
    """Nu doar o verificare in Python: daca ar disparea, insertul ar pica oricum."""
    template_id = template()
    with Session(engine) as session, session.begin():
        recurring.generate(session, _template_row(session, template_id),
                           on_date=date(2026, 9, 4))
    import sqlalchemy
    with Session(engine) as session, session.begin():  # noqa: SIM117
        with pytest.raises(sqlalchemy.exc.IntegrityError):
            session.execute(text("""
                INSERT INTO recurring_run (template_id, period, status)
                VALUES (:t, DATE '2026-09-01', 'generated')
            """), {"t": template_id})


def test_ciorna_care_pica_validarea_e_marcata_respinsa(engine, template):
    """CUI cu cifra de control gresita: ANAF il respinge separat, cu ERRIdentif."""
    template_id = template(client_cui="8609469")
    with Session(engine) as session, session.begin():
        draft = recurring.generate(session, _template_row(session, template_id),
                                   on_date=date(2026, 9, 4))
    assert draft is not None
    assert draft.ok is False
    assert draft.status == "rejected"
    assert "ERRIdentif" in {f.rule for f in draft.report.findings}


def test_raportul_se_salveaza_ca_sa_nu_se_revalideze(engine, template):
    """Ecranul de dimineata arata de ce a picat, fara sa reia validarea."""
    template_id = template(client_cui="8609469")
    with Session(engine) as session, session.begin():
        recurring.generate(session, _template_row(session, template_id),
                           on_date=date(2026, 9, 4))
    with Session(engine) as session, session.begin():
        entries = recurring.rejected(session)
    assert entries
    assert any(finding["rule"] == "ERRIdentif" for finding in entries[0]["report"])


def test_mai_multe_sabloane_in_aceeasi_serie(engine, template):
    """Fara migratia 0004, a doua ciorna ar pica pe cheia unica — si jobul de
    noapte ar fi imposibil de implementat."""
    first = template()
    second = template()
    with Session(engine) as session, session.begin():
        drafts = [recurring.generate(session, _template_row(session, t),
                                     on_date=date(2026, 9, 4))
                  for t in (first, second)]
    assert all(draft is not None and draft.ok for draft in drafts)


def test_sablonul_inactiv_nu_apare(engine, template):
    template(active=False)
    with Session(engine) as session, session.begin():
        assert recurring.due(session, date(2026, 9, 4)) == []


def test_sablonul_expirat_nu_apare(engine, template):
    template(end=date(2026, 8, 31))
    with Session(engine) as session, session.begin():
        assert recurring.due(session, date(2026, 9, 4)) == []


def test_nota_ajunge_pe_ciorna(engine, template):
    template_id = template(note="Contract 12/2026, mentenanta lunara")
    with Session(engine) as session, session.begin():
        draft = recurring.generate(session, _template_row(session, template_id),
                                   on_date=date(2026, 9, 4))
    with engine.connect() as connection:
        note = connection.execute(text(
            "SELECT bt22_note FROM document_note WHERE document_id = :d"),
            {"d": draft.document_id}).scalar_one()
    assert "Contract 12/2026" in note


# --- aprobarea in bloc -----------------------------------------------------

def test_ecranul_de_dimineata_arata_doar_ce_a_trecut(engine, template):
    good = template()
    bad = template(client_cui="8609469")
    with Session(engine) as session, session.begin():
        recurring.generate(session, _template_row(session, good),
                           on_date=date(2026, 9, 4))
        recurring.generate(session, _template_row(session, bad),
                           on_date=date(2026, 9, 4))
    with Session(engine) as session, session.begin():
        pending = recurring.pending_approval(session)
        failed = recurring.rejected(session)
    assert len(pending) == 1
    assert len(failed) == 1
    assert pending[0]["template_id"] == good


def test_aprobarea_in_bloc_emite_si_marcheaza(engine, template):
    template_id = template()
    with Session(engine) as session, session.begin():
        recurring.generate(session, _template_row(session, template_id),
                           on_date=date(2026, 9, 4))
    with Session(engine) as session, session.begin():
        pending = recurring.pending_approval(session)
        results = recurring.approve(session, [pending[0]["run_id"]])

    result = next(iter(results.values()))
    assert result.ok, [f.message for f in result.report.findings]
    assert result.number == 1

    with engine.connect() as connection:
        status = connection.execute(text(
            "SELECT status FROM recurring_run WHERE id = :r"),
            {"r": pending[0]["run_id"]}).scalar_one()
        doc_status = connection.execute(text(
            "SELECT doc_status FROM document WHERE id = :d"),
            {"d": pending[0]["document_id"]}).scalar_one()
    assert status == "issued"
    assert doc_status == "issued"


def test_nu_se_aproba_o_ciorna_respinsa(engine, template):
    """Aprobarea in bloc opereaza numai pe ce a trecut validatorul noaptea."""
    template_id = template(client_cui="8609469")
    with Session(engine) as session, session.begin():
        recurring.generate(session, _template_row(session, template_id),
                           on_date=date(2026, 9, 4))
        run_id = session.execute(text(
            "SELECT id FROM recurring_run WHERE template_id = :t"),
            {"t": template_id}).scalar_one()
    with Session(engine) as session, session.begin():  # noqa: SIM117
        with pytest.raises(recurring.RecurringError, match="pre-verificate"):
            recurring.approve(session, [run_id])


def test_lotul_emite_fiecare_document_separat(engine, template):
    """Tranzactie per document: unul care pica nu anuleaza lotul."""
    first = template()
    second = template()
    with Session(engine) as session, session.begin():
        recurring.generate(session, _template_row(session, first),
                           on_date=date(2026, 9, 4))
        recurring.generate(session, _template_row(session, second),
                           on_date=date(2026, 9, 4))
    with Session(engine) as session, session.begin():
        pending = recurring.pending_approval(session)
        results = recurring.approve(session, [row["run_id"] for row in pending])
    assert len(results) == 2
    assert all(result.ok for result in results.values())


def test_jobul_de_noapte_trece_prin_toate(engine, template):
    template(day_of_month=5)
    template(day_of_month=5)
    template(day_of_month=20)   # nu e scadent pe 4 septembrie
    with Session(engine) as session, session.begin():
        drafts = recurring.generate_all(session, date(2026, 9, 4))
    assert len(drafts) == 2
