"""Fluxul de emitere, pe Postgres real.

TODO.md punctul 3. Ce se verifica aici nu poate fi verificat pe mock-uri:
lock-uri, SAVEPOINT-uri, si invariantul care conteaza cel mai mult —

    o factura care pica validarea nu consuma un numar de serie.

Se ruleaza cand exista `TEST_DATABASE_URL`. Vezi tests/test_rls.py pentru setup.
"""

import os
from decimal import Decimal
from uuid import uuid4

import pytest

from app.core import documents, issue

pytest.importorskip("sqlalchemy")
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

D = Decimal
COTA_NORMALA = D(21)      # constanta la nivel de modul: B008 interzice apelul in default
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL nu e setat; fluxul de emitere cere Postgres",
)

COMPANY = "77777777-7777-7777-7777-777777777777"


@pytest.fixture(scope="module")
def engine():
    engine = create_engine(TEST_DATABASE_URL, future=True)
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM document WHERE company_id = :c"), {"c": COMPANY})
        connection.execute(text("DELETE FROM company WHERE id = :c"), {"c": COMPANY})
        connection.execute(text("""
            INSERT INTO company (id, bt31_vat_id, bt32_legal_reg_id, bt27_name,
                                 bt33_legal_info, bt35_address1, bt37_city,
                                 bt39_county, bt40_country, contact_email)
            VALUES (:c, 'RO8609468', '8609468', 'Atelier IT SRL',
                    'J40/1234/2020, capital social 200 lei', 'Str. Fabricii nr. 10',
                    'SECTOR1', 'RO-B', 'RO', 'office@example.ro')
        """), {"c": COMPANY})
        connection.execute(text("""
            INSERT INTO vat_rate (company_id, name, percent, category_code,
                                  saft_tax_code, exempt_reason)
            VALUES (:c, 'Normala', 21, 'S', '20', NULL),
                   (:c, 'Taxare inversa', 0, 'AE', '20',
                    'Taxare inversa conform art. 331 Cod fiscal')
        """), {"c": COMPANY})
    yield engine
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM document WHERE company_id = :c"), {"c": COMPANY})
        connection.execute(text("DELETE FROM company WHERE id = :c"), {"c": COMPANY})
    engine.dispose()


@pytest.fixture
def series(engine):
    def make(next_number=1, padding=4, is_active=True):
        series_id = uuid4()
        with engine.begin() as connection:
            connection.execute(text("""
                INSERT INTO doc_series (id, company_id, doc_type, name, next_number,
                                        padding, is_active)
                VALUES (:id, :c, 'factura', :name, :n, :p, :a)
            """), {"id": series_id, "c": COMPANY, "name": f"FS{uuid4().hex[:4].upper()}",
                   "n": next_number, "p": padding, "a": is_active})
        return series_id
    return make


@pytest.fixture
def draft(engine, series):
    """O ciorna cu o linie, gata de emis. Parametrii schimba doar ce se testeaza."""
    def make(series_id=None, *, lines=None, unit_code="HUR", vat_category="S",
             vat_percent=COTA_NORMALA, buyer_cui="8609468", currency="RON"):
        series_id = series_id or series()
        document_id = uuid4()
        client_id = uuid4()
        rows = lines if lines is not None else [
            {"name": "Consultanta IT", "quantity": D(10), "price": D("100.00")}]
        with engine.begin() as connection:
            connection.execute(text("""
                INSERT INTO client (id, company_id, bt47_legal_reg_id, bt44_name,
                                    bt50_address1, bt52_city, bt54_county, bt55_country)
                VALUES (:cl, :c, :cui, 'Studio Nord SRL', 'Str. Atelierului nr. 5',
                        'Cluj-Napoca', 'RO-CJ', 'RO')
            """), {"cl": client_id, "c": COMPANY, "cui": buyer_cui})
            connection.execute(text("""
                INSERT INTO document (id, company_id, doc_type, bt3_type_code,
                                      series_id, series_name, client_id,
                                      client_snapshot, seller_snapshot,
                                      bt2_issue_date, bt5_currency, doc_status)
                SELECT :id, :c, 'factura', '380', :s, name, :cl, '{}', '{}',
                       DATE '2026-09-09', :cur, 'draft'
                FROM doc_series WHERE id = :s
            """), {"id": document_id, "c": COMPANY, "s": series_id, "cl": client_id,
                   "cur": currency})
            for position, line in enumerate(rows, start=1):
                connection.execute(text("""
                    INSERT INTO document_line (document_id, bt126_line_id, position,
                        bt153_name, bt129_quantity, bt130_unit_code, bt146_item_price,
                        bt151_vat_category, bt152_vat_percent, saft_tax_code)
                    VALUES (:d, :lid, :pos, :name, :qty, :unit, :price, :cat, :pct, '20')
                """), {"d": document_id, "lid": str(position), "pos": position,
                       "name": line["name"], "qty": line["quantity"],
                       "unit": line.get("unit_code", unit_code),
                       "price": line["price"],
                       "cat": line.get("vat_category", vat_category),
                       "pct": line.get("vat_percent", vat_percent)})
        make.last_client = client_id
        return document_id, series_id
    return make


def _next_number(engine, series_id):
    with engine.connect() as connection:
        return connection.execute(
            text("SELECT next_number FROM doc_series WHERE id = :s"),
            {"s": series_id}).scalar_one()


# --- emiterea reusita ------------------------------------------------------

def test_emiterea_aloca_numar_si_schimba_starea(engine, draft):
    document_id, series_id = draft()
    with Session(engine) as session, session.begin():
        result = issue.issue(session, document_id)

    assert result.ok, [f.message for f in result.report.findings]
    assert result.number == 1
    assert result.invoice_id.endswith("0001")

    with engine.connect() as connection:
        row = connection.execute(text(
            "SELECT doc_status, number, bt1_invoice_id FROM document WHERE id = :d"),
            {"d": document_id}).one()
    assert row.doc_status == "issued"
    assert row.number == 1
    assert row.bt1_invoice_id == result.invoice_id


def test_totalurile_se_recalculeaza_si_se_stocheaza(engine, draft):
    """Decizia 6: defalcarea TVA se calculeaza si se STOCHEAZA, nu se deriva
    la generare. Altfel nu poti audita de ce a picat o factura."""
    document_id, _ = draft()
    with Session(engine) as session, session.begin():
        assert issue.issue(session, document_id).ok

    with engine.connect() as connection:
        totals = connection.execute(text("""
            SELECT bt106_line_total, bt110_tax_amount, bt115_payable
            FROM document WHERE id = :d"""), {"d": document_id}).one()
        breakdown = connection.execute(text("""
            SELECT bt118_category, bt119_percent, bt116_taxable, bt117_tax_amount
            FROM vat_breakdown WHERE document_id = :d"""), {"d": document_id}).all()
    assert totals.bt106_line_total == D("1000.00")
    assert totals.bt110_tax_amount == D("210.00")
    assert totals.bt115_payable == D("1210.00")
    assert len(breakdown) == 1
    assert breakdown[0].bt116_taxable == D("1000.00")


def test_xml_ul_ajunge_in_jobul_spv_cu_termenul_legal(engine, draft):
    """`legal_deadline` e 5 zile LUCRATOARE de la emitere (OUG 89/2025).
    Factura e emisa miercuri 09.09.2026, deci termenul e miercuri 16.09."""
    document_id, _ = draft()
    with Session(engine) as session, session.begin():
        result = issue.issue(session, document_id)

    with engine.connect() as connection:
        job = connection.execute(text("""
            SELECT standard, xml_ubl, xml_size_bytes, legal_deadline, status_code
            FROM efactura_job WHERE document_id = :d"""), {"d": document_id}).one()
    assert job.standard == "UBL"
    assert job.status_code == -1, "netrimisa: trimiterea e treaba workerului"
    assert str(job.legal_deadline) == "2026-09-16"
    assert b"<cbc:ID>" in result.xml
    assert result.invoice_id in job.xml_ubl


def test_instantaneele_se_ingheata_la_emitere(engine, draft):
    """Constrangerea 6 acopera si datele partilor: o redenumire a clientului nu
    are voie sa schimbe o factura veche."""
    document_id, _ = draft()
    with Session(engine) as session, session.begin():
        assert issue.issue(session, document_id).ok

    with engine.begin() as connection:
        connection.execute(text("UPDATE client SET bt44_name = 'ALT NUME SRL' "
                                "WHERE id = :cl"), {"cl": draft.last_client})
    with Session(engine) as session, session.begin():
        loaded = documents.load(session, document_id)
    assert loaded["buyer"]["name"] == "Studio Nord SRL"


# --- invariantul central ---------------------------------------------------

def test_factura_care_pica_validarea_nu_consuma_numar(engine, draft):
    """Constrangerea 9, verificata pe baza de date.

    CUI de cumparator cu cifra de control gresita: ERRIdentif. Aleg cazul asta,
    si nu Bucuresti-fara-sector, pentru ca schema il opreste deja pe al doilea
    printr-un CHECK (`ck_client_bucharest`) — nu poate ajunge la validator din
    tabela `client`. Checksum-ul CUI-ului insa nu e verificat de nicio
    constrangere: ANAF il respinge separat de schematron.

    Documentul ramane ciorna, iar `next_number` ramane neatins. Fara gauri.
    """
    document_id, series_id = draft(buyer_cui="8609469")
    before = _next_number(engine, series_id)

    with Session(engine) as session, session.begin():
        result = issue.issue(session, document_id)

    assert result.ok is False
    assert "ERRIdentif" in {f.rule for f in result.report.findings}
    assert result.number is None
    assert _next_number(engine, series_id) == before, "s-a consumat un numar degeaba"

    with engine.connect() as connection:
        status = connection.execute(text("SELECT doc_status FROM document WHERE id = :d"),
                                    {"d": document_id}).scalar_one()
    assert status == "draft"


def test_dupa_corectie_primeste_primul_numar(engine, draft):
    """Continuarea testului de mai sus: seria nu a avansat, deci factura corectata
    ia numarul 1, nu 2."""
    document_id, series_id = draft(buyer_cui="8609469")
    with Session(engine) as session, session.begin():
        assert issue.issue(session, document_id).ok is False

    with engine.begin() as connection:
        connection.execute(text("UPDATE client SET bt47_legal_reg_id='8609468' "
                                "WHERE id=:cl"), {"cl": draft.last_client})
    with Session(engine) as session, session.begin():
        result = issue.issue(session, document_id)

    assert result.ok, [f.message for f in result.report.findings]
    assert result.number == 1


# --- imutabilitate si stari ------------------------------------------------

def test_documentul_emis_nu_se_mai_emite(engine, draft):
    document_id, _ = draft()
    with Session(engine) as session, session.begin():
        assert issue.issue(session, document_id).ok
    with Session(engine) as session, session.begin():  # noqa: SIM117
        with pytest.raises(issue.IssueError, match="storneaza"):
            issue.issue(session, document_id)


def test_versiunea_ciornei_e_verificata(engine, draft):
    """Concurenta optimista: emiterea vizeaza o versiune exacta a ciornei."""
    document_id, _ = draft()
    with Session(engine) as session, session.begin():  # noqa: SIM117
        with pytest.raises(issue.IssueError, match="modificata intre timp"):
            issue.issue(session, document_id, expected_version=99)


def test_seria_inactiva_opreste_emiterea(engine, draft, series):
    document_id, _ = draft(series(is_active=False))
    with Session(engine) as session, session.begin():  # noqa: SIM117
        with pytest.raises(issue.IssueError, match="inactiva"):
            issue.issue(session, document_id)


# --- lot -------------------------------------------------------------------

def test_lotul_continua_peste_documentul_care_pica(engine, draft, series):
    """Tranzactie per document, nu una pentru tot lotul: unul care pica nu
    anuleaza restul si nu consuma numar."""
    shared = series()
    ok_first, _ = draft(shared)
    bad, _ = draft(shared, buyer_cui="8609469")

    with Session(engine) as session, session.begin():
        results = issue.issue_batch(session, [ok_first, bad])

    assert results[ok_first].ok is True
    assert results[bad].ok is False
    assert _next_number(engine, shared) == 2, "doar documentul valid a consumat numar"


def test_mai_multe_ciorne_in_aceeasi_serie(engine, draft, series):
    """Migratia 0004. Fara ea, a doua ciorna pica pe cheia unica — si atunci
    jobul de noapte de la punctul 7 din TODO e imposibil."""
    shared = series()
    first, _ = draft(shared)
    second, _ = draft(shared)
    third, _ = draft(shared)
    with engine.connect() as connection:
        count = connection.execute(text(
            "SELECT count(*) FROM document WHERE series_id = :s AND number IS NULL"),
            {"s": shared}).scalar_one()
    assert count == 3
    assert len({first, second, third}) == 3


# --- storno ----------------------------------------------------------------

def test_storno_negeaza_cantitatile(engine, draft):
    """Cod 384: semnul sta pe cantitate, nu pe pret. BR-27 interzice pretul negativ."""
    document_id, _ = draft()
    with Session(engine) as session, session.begin():
        assert issue.issue(session, document_id).ok
        storno_id = issue.create_storno(session, document_id)

    with engine.connect() as connection:
        line = connection.execute(text("""
            SELECT bt129_quantity, bt146_item_price FROM document_line
            WHERE document_id = :d"""), {"d": storno_id}).one()
        head = connection.execute(text("""
            SELECT bt3_type_code, ref_kind, bt25_preceding_invoice_id, doc_status
            FROM document WHERE id = :d"""), {"d": storno_id}).one()
    assert line.bt129_quantity == D("-10.0000")
    assert line.bt146_item_price > 0, "pretul ramane pozitiv (BR-27)"
    assert head.bt3_type_code == "384"
    assert head.ref_kind == "storno"
    assert head.doc_status == "draft", "stornoul e ciorna: ia numar dupa validare"


def test_storno_are_referinta_bg3(engine, draft):
    document_id, _ = draft()
    with Session(engine) as session, session.begin():
        original = issue.issue(session, document_id)
        storno_id = issue.create_storno(session, document_id)

    with engine.connect() as connection:
        head = connection.execute(text("""
            SELECT bt25_preceding_invoice_id, bt26_preceding_invoice_date
            FROM document WHERE id = :d"""), {"d": storno_id}).one()
    assert head.bt25_preceding_invoice_id == original.invoice_id
    assert str(head.bt26_preceding_invoice_date) == "2026-09-09"


def test_stornoul_se_emite_si_produce_totaluri_negative(engine, draft):
    document_id, _ = draft()
    with Session(engine) as session, session.begin():
        assert issue.issue(session, document_id).ok
        storno_id = issue.create_storno(session, document_id)
    with Session(engine) as session, session.begin():
        result = issue.issue(session, storno_id)

    assert result.ok, [f.message for f in result.report.findings]
    with engine.connect() as connection:
        totals = connection.execute(text(
            "SELECT bt106_line_total, bt115_payable FROM document WHERE id = :d"),
            {"d": storno_id}).one()
    assert totals.bt106_line_total == D("-1000.00")
    assert totals.bt115_payable == D("-1210.00")


def test_nota_de_creditare_pastreaza_cantitatile_pozitive(engine, draft):
    """Cod 381: tipul documentului exprima inversarea, deci cantitatile raman
    pozitive si radacina XML devine CreditNote."""
    document_id, _ = draft()
    with Session(engine) as session, session.begin():
        assert issue.issue(session, document_id).ok
        storno_id = issue.create_storno(session, document_id,
                                        type_code=issue.CREDIT_NOTE_CODE)
    with Session(engine) as session, session.begin():
        result = issue.issue(session, storno_id)

    assert result.ok, [f.message for f in result.report.findings]
    assert b"CreditNote" in result.xml
    with engine.connect() as connection:
        quantity = connection.execute(text(
            "SELECT bt129_quantity FROM document_line WHERE document_id = :d"),
            {"d": storno_id}).scalar_one()
        standard = connection.execute(text(
            "SELECT standard FROM efactura_job WHERE document_id = :d"),
            {"d": storno_id}).scalar_one()
    assert quantity == D("10.0000")
    assert standard == "CN", "ANAF primeste nota de creditare cu standard=CN"


def test_nu_se_storneaza_o_ciorna(engine, draft):
    document_id, _ = draft()
    with Session(engine) as session, session.begin():  # noqa: SIM117
        with pytest.raises(issue.IssueError, match="doar documentele emise"):
            issue.create_storno(session, document_id)


def test_cod_de_tip_invalid_la_storno(engine, draft):
    document_id, _ = draft()
    with Session(engine) as session, session.begin():
        assert issue.issue(session, document_id).ok
        with pytest.raises(issue.IssueError, match="384"):
            issue.create_storno(session, document_id, type_code="380")


# --- stergere --------------------------------------------------------------

def test_stergerea_ultimului_din_serie(engine, draft, series):
    shared = series()
    document_id, _ = draft(shared)
    with Session(engine) as session, session.begin():
        assert issue.issue(session, document_id).ok
        allowed, reason = issue.delete_document(session, document_id)
    assert allowed is True and reason is None

    with engine.connect() as connection:
        status = connection.execute(text("SELECT doc_status FROM document WHERE id = :d"),
                                    {"d": document_id}).scalar_one()
    assert status == "deleted", "marcare, nu DELETE fizic: jurnalul ramane"


def test_nu_se_sterge_documentul_trimis_la_spv(engine, draft):
    document_id, _ = draft()
    with Session(engine) as session, session.begin():
        assert issue.issue(session, document_id).ok
        session.execute(text("""
            UPDATE efactura_job SET index_incarcare = '5001120362'
            WHERE document_id = :d"""), {"d": document_id})
        allowed, reason = issue.delete_document(session, document_id)
    assert allowed is False
    assert "index de incarcare" in reason


def test_taxare_inversa_ia_motivul_de_scutire_de_pe_cota(engine, draft):
    """BR-E-10 cere BT-120 sau BT-121 pentru categoriile scutite. Motivul sta pe
    `vat_rate`, deci trebuie copiat pe grupul BG-23 inainte de validare."""
    document_id, _ = draft(lines=[{"name": "Servicii UE", "quantity": D(1),
                                   "price": D("5000.00"), "vat_category": "AE",
                                   "vat_percent": D(0)}])
    with Session(engine) as session, session.begin():
        result = issue.issue(session, document_id)

    assert result.ok, [f.message for f in result.report.findings]
    with engine.connect() as connection:
        reason = connection.execute(text(
            "SELECT bt120_exempt_reason FROM vat_breakdown WHERE document_id = :d"),
            {"d": document_id}).scalar_one()
    assert reason.startswith("Taxare inversa")
