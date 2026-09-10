"""Exportul contabil: jurnal de vanzari, sectiuni D406, arhiva lunara.

Rulate pe Postgres real, pentru ca toate trei citesc din baza. Se sar fara
`TEST_DATABASE_URL`; vezi tests/test_rls.py pentru setup.
"""

import io
import os
import zipfile
from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from app.core.export import archive, journal, saft

pytest.importorskip("sqlalchemy")
from lxml import etree  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

D = Decimal
# Constante la nivel de modul: B008 interzice apelul in valorile implicite.
BAZA_IMPLICITA = D("1000.00")
TVA_IMPLICIT = D("210.00")
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL, reason="exportul citeste din baza de date")

COMPANY = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
PERIOD_START = date(2026, 9, 1)
PERIOD_END = date(2026, 9, 30)


@pytest.fixture(scope="module")
def engine():
    engine = create_engine(TEST_DATABASE_URL, future=True)
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM document WHERE company_id = :c"),
                           {"c": COMPANY})
        connection.execute(text("DELETE FROM company WHERE id = :c"), {"c": COMPANY})
        connection.execute(text("""
            INSERT INTO company (id, bt32_legal_reg_id, bt27_name, bt35_address1,
                                 bt37_city, bt39_county, bt40_country)
            VALUES (:c, '8609468', 'Atelier IT SRL', 'Str. Fabricii 10',
                    'SECTOR1', 'RO-B', 'RO')
        """), {"c": COMPANY})
    yield engine
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM document WHERE company_id = :c"),
                           {"c": COMPANY})
        connection.execute(text("DELETE FROM company WHERE id = :c"), {"c": COMPANY})
    engine.dispose()


@pytest.fixture
def invoice(engine):
    """O factura emisa, cu linii, defalcare si job SPV. Parametrii schimba ce se testeaza."""
    created: list[str] = []

    def make(*, issue_date=date(2026, 9, 9), number=None, cui=" 8609468 ",
             lines=None, breakdown=None, index_incarcare="5001120362",
             saft_tax_code="20", spv_status="validated",
             tax_exclusive=BAZA_IMPLICITA, tax_amount=TVA_IMPLICIT):
        document_id = uuid4()
        series_id = uuid4()
        number = number if number is not None else len(created) + 1
        rows = lines or [{"name": "Consultanta IT", "quantity": D(10),
                          "unit": "HUR", "price": D("100.00"), "net": D("1000.00"),
                          "percent": D(21), "category": "S"}]
        groups = breakdown or [{"category": "S", "percent": D(21),
                                "taxable": D("1000.00"), "tax": D("210.00")}]
        with engine.begin() as connection:
            connection.execute(text("""
                INSERT INTO doc_series (id, company_id, doc_type, name)
                VALUES (:s, :c, 'factura', :n)
            """), {"s": series_id, "c": COMPANY, "n": f"FS{uuid4().hex[:4].upper()}"})
            connection.execute(text("""
                INSERT INTO document (id, company_id, doc_type, bt3_type_code,
                    series_id, series_name, number, bt1_invoice_id, client_snapshot,
                    seller_snapshot, bt2_issue_date, bt5_currency,
                    bt109_tax_exclusive, bt110_tax_amount, bt112_tax_inclusive,
                    doc_status, spv_status)
                SELECT :id, :c, 'factura', '380', :s, name, :num, :inv,
                       CAST(:client AS jsonb), '{}', :issued, 'RON',
                       :net, :tax, :gross, 'issued', :spv
                FROM doc_series WHERE id = :s
            """), {"id": document_id, "c": COMPANY, "s": series_id, "num": number,
                   "inv": f"FSIT{number:04d}", "issued": issue_date,
                   "client": f'{{"name": "Studio Nord SRL", "legal_reg_id": "{cui}"}}',
                   "net": tax_exclusive, "tax": tax_amount,
                   "gross": tax_exclusive + tax_amount, "spv": spv_status})
            for position, line in enumerate(rows, start=1):
                connection.execute(text("""
                    INSERT INTO document_line (document_id, bt126_line_id, position,
                        bt153_name, bt129_quantity, bt130_unit_code, bt146_item_price,
                        bt131_line_net, bt151_vat_category, bt152_vat_percent,
                        saft_tax_code, saft_tax_type)
                    VALUES (:d, :lid, :pos, :name, :qty, :unit, :price, :net,
                            :cat, :pct, :code, 'TVA')
                """), {"d": document_id, "lid": str(position), "pos": position,
                       "name": line["name"], "qty": line["quantity"],
                       "unit": line["unit"], "price": line["price"],
                       "net": line["net"], "cat": line["category"],
                       "pct": line["percent"], "code": saft_tax_code})
            for group in groups:
                connection.execute(text("""
                    INSERT INTO vat_breakdown (document_id, bt118_category,
                        bt119_percent, bt116_taxable, bt117_tax_amount)
                    VALUES (:d, :cat, :pct, :base, :tax)
                """), {"d": document_id, "cat": group["category"],
                       "pct": group["percent"], "base": group["taxable"],
                       "tax": group["tax"]})
            if index_incarcare:
                connection.execute(text("""
                    INSERT INTO efactura_job (document_id, index_incarcare, xml_ubl)
                    VALUES (:d, :i, '<Invoice>continut</Invoice>')
                """), {"d": document_id, "i": index_incarcare})
        created.append(str(document_id))
        return document_id
    yield make
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM document WHERE company_id = :c"),
                           {"c": COMPANY})


# --- jurnalul de vanzari ---------------------------------------------------

def test_jurnalul_are_antet_si_total(engine, invoice):
    invoice()
    with Session(engine) as session, session.begin():
        content = journal.export(session, COMPANY, PERIOD_START, PERIOD_END)
    lines = content.strip().splitlines()
    assert lines[0].startswith("Numar;Data;Client;CUI")
    assert lines[-1].startswith("TOTAL")


def test_cui_ul_din_jurnal_e_normalizat(engine, invoice):
    """Un spatiu in codul fiscal invalideaza D406, iar jurnalul e sursa din care
    contabilul copiaza."""
    invoice(cui=" RO 8609468 ")
    with Session(engine) as session, session.begin():
        rows = journal.collect(session, COMPANY, PERIOD_START, PERIOD_END)
    assert rows[0].client_cui == "8609468"


def test_sumele_din_jurnal_au_zecimalul_romanesc(engine, invoice):
    """Cu punct ca zecimal, Excel-ul romanesc imparte suma in doua celule."""
    invoice()
    with Session(engine) as session, session.begin():
        content = journal.export(session, COMPANY, PERIOD_START, PERIOD_END)
    assert "1000,00" in content
    assert "1210,00" in content


def test_jurnalul_separa_cotele(engine, invoice):
    """Jurnalul de vanzari se totalizeaza pe cote, nu pe un singur total."""
    invoice(
        lines=[{"name": "Servicii", "quantity": D(1), "unit": "HUR",
                "price": D("1000.00"), "net": D("1000.00"), "percent": D(21),
                "category": "S"},
               {"name": "Carti", "quantity": D(1), "unit": "H87",
                "price": D("500.00"), "net": D("500.00"), "percent": D(11),
                "category": "S"}],
        breakdown=[{"category": "S", "percent": D(21), "taxable": D("1000.00"),
                    "tax": D("210.00")},
                   {"category": "S", "percent": D(11), "taxable": D("500.00"),
                    "tax": D("55.00")}],
        tax_exclusive=D("1500.00"), tax_amount=D("265.00"))
    with Session(engine) as session, session.begin():
        row = journal.collect(session, COMPANY, PERIOD_START, PERIOD_END)[0]
    assert row.base_by_rate[D(21)] == D("1000.00")
    assert row.base_by_rate[D(11)] == D("500.00")
    assert row.vat_by_rate[D(11)] == D("55.00")


def test_taxarea_inversa_are_coloana_proprie(engine, invoice):
    """Nu e scutire si nu e cota zero: se raporteaza separat."""
    invoice(lines=[{"name": "Servicii UE", "quantity": D(1), "unit": "HUR",
                    "price": D("5000.00"), "net": D("5000.00"), "percent": D(0),
                    "category": "AE"}],
            breakdown=[{"category": "AE", "percent": D(0), "taxable": D("5000.00"),
                        "tax": D(0)}],
            tax_exclusive=D("5000.00"), tax_amount=D(0))
    with Session(engine) as session, session.begin():
        row = journal.collect(session, COMPANY, PERIOD_START, PERIOD_END)[0]
    assert row.reverse_charge_base == D("5000.00")
    assert row.exempt_base == D(0)
    assert row.base_by_rate == {}


def test_indexul_de_incarcare_ajunge_in_jurnal(engine, invoice):
    invoice(index_incarcare="5001120362")
    with Session(engine) as session, session.begin():
        content = journal.export(session, COMPANY, PERIOD_START, PERIOD_END)
    assert "5001120362" in content


def test_facturile_din_afara_perioadei_nu_intra(engine, invoice):
    invoice(issue_date=date(2026, 8, 31))
    invoice(issue_date=date(2026, 9, 15))
    invoice(issue_date=date(2026, 10, 1))
    with Session(engine) as session, session.begin():
        rows = journal.collect(session, COMPANY, PERIOD_START, PERIOD_END)
    assert len(rows) == 1


def test_ciornele_nu_apar_in_jurnal(engine, invoice):
    document_id = invoice()
    with engine.begin() as connection:
        connection.execute(text("UPDATE document SET doc_status='draft' "
                                "WHERE id=:d"), {"d": document_id})
    with Session(engine) as session, session.begin():
        assert journal.collect(session, COMPANY, PERIOD_START, PERIOD_END) == []


# --- sectiunile D406 -------------------------------------------------------

def _ns(root):
    """Toate elementele sunt in namespace-ul declaratiei, si copiii la fel."""
    return {"d": etree.QName(root).namespace}


def test_namespace_ul_de_test_difera_de_cel_real():
    """Cea mai frecventa eroare de structura la D406, dupa forumuri."""
    assert saft.namespace_for("test") == "mfp:anaf:dgti:d406t:declaratie:v1"
    assert saft.namespace_for("prod") == "mfp:anaf:dgti:d406:declaratie:v1"
    assert saft.NS_TEST != saft.NS_PROD


def test_varianta_necunoscuta_e_refuzata():
    with pytest.raises(saft.SaftError, match="D406T"):
        saft.namespace_for("staging")


def test_sectiunea_poarta_namespace_ul_cerut(engine, invoice):
    invoice()
    with Session(engine) as session, session.begin():
        content = saft.export_sales_invoices(session, COMPANY, PERIOD_START,
                                             PERIOD_END, variant="prod")
    root = etree.fromstring(content)
    assert etree.QName(root).namespace == saft.NS_PROD
    assert etree.QName(root).localname == "SalesInvoices"


def test_taxcode_apare_pe_fiecare_linie(engine, invoice):
    """Lipsa lui e eroarea numarul unu la validarea D406."""
    invoice(saft_tax_code="20",
            lines=[{"name": "A", "quantity": D(1), "unit": "H87",
                    "price": D("10.00"), "net": D("10.00"), "percent": D(21),
                    "category": "S"},
                   {"name": "B", "quantity": D(2), "unit": "H87",
                    "price": D("20.00"), "net": D("40.00"), "percent": D(21),
                    "category": "S"}])
    with Session(engine) as session, session.begin():
        content = saft.export_sales_invoices(session, COMPANY, PERIOD_START,
                                             PERIOD_END)
    root = etree.fromstring(content)
    lines = root.findall(".//d:Line", _ns(root))
    assert len(lines) == 2
    for line in lines:
        codes = line.findall("d:TaxInformation/d:TaxCode", _ns(root))
        assert len(codes) == 1 and codes[0].text == "20"


def test_linia_fara_taxcode_opreste_exportul(engine, invoice):
    """Mai bine o eroare aici decat un D406 respins de ANAF."""
    invoice(saft_tax_code=None)
    with Session(engine) as session, session.begin():  # noqa: SIM117
        with pytest.raises(saft.SaftError, match="saft_tax_code"):
            saft.export_sales_invoices(session, COMPANY, PERIOD_START, PERIOD_END)


def test_referinta_efactura_insoteste_factura(engine, invoice):
    """ANAF cross-verifica automat e-Factura cu SalesInvoices."""
    invoice(index_incarcare="5001120362")
    with Session(engine) as session, session.begin():
        content = saft.export_sales_invoices(session, COMPANY, PERIOD_START,
                                             PERIOD_END)
    root = etree.fromstring(content)
    assert root.find(".//d:EFacturaIndex", _ns(root)).text == "5001120362"


def test_cui_ul_din_saft_e_normalizat(engine, invoice):
    invoice(cui="RO 8609468")
    with Session(engine) as session, session.begin():
        content = saft.export_sales_invoices(session, COMPANY, PERIOD_START,
                                             PERIOD_END)
    root = etree.fromstring(content)
    assert root.find(".//d:CustomerInfo/d:CustomerID", _ns(root)).text == "8609468"


def test_numarul_de_intrari_si_totalul(engine, invoice):
    invoice()
    invoice()
    with Session(engine) as session, session.begin():
        content = saft.export_sales_invoices(session, COMPANY, PERIOD_START,
                                             PERIOD_END)
    root = etree.fromstring(content)
    assert root.find("d:NumberOfEntries", _ns(root)).text == "2"
    assert root.find("d:TotalCredit", _ns(root)).text == "2420.00"


def test_sectiunea_payments(engine, invoice):
    document_id = invoice()
    with engine.begin() as connection:
        connection.execute(text("""
            INSERT INTO payment (document_id, payment_type, issue_date, value,
                                 document_number)
            VALUES (:d, 'Ordin de plata', DATE '2026-09-20', 1210.00, 'OP-77')
        """), {"d": document_id})
    with Session(engine) as session, session.begin():
        content = saft.export_payments(session, COMPANY, PERIOD_START, PERIOD_END)
    root = etree.fromstring(content)
    assert root.find("d:NumberOfEntries", _ns(root)).text == "1"
    payment = root.find("d:Payment", _ns(root))
    assert payment.find("d:PaymentRefNo", _ns(root)).text == "OP-77"
    assert payment.find("d:PaymentMechanism", _ns(root)).text == "Ordin de plata"
    assert payment.find("d:PaymentAmount", _ns(root)).text == "1210.00"


# --- arhiva lunara ---------------------------------------------------------

def test_arhiva_contine_cele_patru_categorii(engine, invoice, tmp_path):
    document_id = invoice()
    pdf_path = tmp_path / "FSIT0001.pdf"
    pdf_path.write_bytes(b"%PDF-1.7 continut")
    zip_path = tmp_path / "FSIT0001.zip"
    zip_path.write_bytes(b"PK\x03\x04continut")
    with engine.begin() as connection:
        connection.execute(text("UPDATE document SET rendered_pdf_path=:p "
                                "WHERE id=:d"), {"p": str(pdf_path), "d": document_id})
        connection.execute(text("UPDATE efactura_job SET zip_path=:z "
                                "WHERE document_id=:d"), {"z": str(zip_path),
                                                          "d": document_id})
    with Session(engine) as session, session.begin():
        content, report = archive.build(session, COMPANY, PERIOD_START, PERIOD_END)

    with zipfile.ZipFile(io.BytesIO(content)) as bundle:
        names = bundle.namelist()
        assert any(name.startswith("zip_spv/") for name in names)
        assert any(name.startswith("xml/") for name in names)
        assert any(name.startswith("pdf/") for name in names)
        assert "jurnal-vanzari.csv" in names
        assert "saft-SalesInvoices.xml" in names
        assert "saft-Payments.xml" in names
    assert report.complete is True


def test_arhiva_fara_zip_spv_e_semnalata_ca_incompleta(engine, invoice):
    """Fara arhivele din SPV, pachetul nu contine niciun document original."""
    invoice(index_incarcare=None)
    with Session(engine) as session, session.begin():
        content, report = archive.build(session, COMPANY, PERIOD_START, PERIOD_END)
    assert report.complete is False
    assert report.missing_spv_archive

    with zipfile.ZipFile(io.BytesIO(content)) as bundle:
        readme = bundle.read("CITESTE.txt").decode("utf-8")
    assert "INCOMPLETA" in readme
    assert "documentele originale" in readme


def test_fisierul_lipsa_de_pe_disc_e_raportat(engine, invoice):
    document_id = invoice()
    with engine.begin() as connection:
        connection.execute(text("UPDATE efactura_job SET zip_path='/nu/exista.zip' "
                                "WHERE document_id=:d"), {"d": document_id})
    with Session(engine) as session, session.begin():
        _, report = archive.build(session, COMPANY, PERIOD_START, PERIOD_END)
    assert "/nu/exista.zip" in report.missing_files


def test_csv_ul_din_arhiva_are_bom(engine, invoice):
    """Fara BOM, Excel-ul deschide diacriticele gresit."""
    invoice()
    with Session(engine) as session, session.begin():
        content, _ = archive.build(session, COMPANY, PERIOD_START, PERIOD_END)
    with zipfile.ZipFile(io.BytesIO(content)) as bundle:
        assert bundle.read("jurnal-vanzari.csv").startswith(b"\xef\xbb\xbf")


def test_copiii_sunt_in_acelasi_namespace_ca_radacina(engine, invoice):
    """Bug prins la scriere: `SubElement(parent, "TaxCode")` creeaza elementul in
    AFARA namespace-ului. lxml il serializeaza totusi fara `xmlns=""`, deci
    fisierul iesea corect, dar arborele din memorie nu coincidea cu el.

    Aici se verifica pe arborele construit, nu pe cel reparsat — altfel exact
    inconsecventa asta ar trece neobservata.
    """
    invoice()
    with Session(engine) as session, session.begin():
        entries = saft.collect_invoices(session, COMPANY, PERIOD_START, PERIOD_END)
    root = saft.build_sales_invoices(entries, variant="prod")
    expected = saft.NS_PROD
    for element in root.iter():
        assert etree.QName(element).namespace == expected, \
            f"{etree.QName(element).localname} e in afara namespace-ului"
