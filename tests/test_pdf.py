"""Randarea PDF.

Doua lucruri se verifica pe PDF-ul REAL, nu pe HTML: fontul embedded si textul
extras. Restul HTML-ului poate fi corect si PDF-ul tot gresit — exact asta s-a
si intamplat la scrierea sablonului, de doua ori.
"""

import io
import os
from datetime import date
from decimal import Decimal

import pytest

from app.core import pdf

D = Decimal
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

weasyprint = pytest.importorskip("weasyprint")
pypdf = pytest.importorskip("pypdf")


@pytest.fixture
def document():
    return {
        "invoice_id": "FSIT0001",
        "issue_date": date(2026, 9, 9),
        "due_date": date(2026, 10, 9),
        "currency": "RON",
        "is_storno": False,
        "preceding_invoice_id": None,
        "seller": {"name": "Atelier IT SRL", "vat_id": "RO8609468",
                   "legal_info": "J40/1234/2020", "address1": "Str. Fabricii nr. 10",
                   "city": "SECTOR1", "county": "RO-B"},
        "buyer": {"name": "Studio Nord SRL", "legal_reg_id": "8609468",
                  "address1": "Str. Atelierului nr. 5", "city": "Cluj-Napoca",
                  "county": "RO-CJ"},
        "payment": {"iban": "RO49AAAA1B31007593840000"},
        "payment_terms": "30 de zile",
        "lines": [{"name": "Consultanță IT", "description": "Mentenanță și suport",
                   "quantity": D(10), "unit_code": "HUR", "unit_price": D("100.00"),
                   "net": D("1000.00"), "vat_category": "S", "vat_percent": D(21)}],
        "tax_exclusive": D("1000.00"), "tax_amount": D("210.00"),
        "allowance_total": D(0), "charge_total": D(0), "prepaid": D(0),
        "payable": D("1210.00"),
        "vat_breakdown": [{"category": "S", "percent": D(21), "taxable": D("1000.00"),
                           "tax_amount": D("210.00"), "exemption_reason": None}],
        "notes": ["Vă mulțumim pentru colaborare."],
    }


def _fonts(content: bytes) -> set[str]:
    reader = pypdf.PdfReader(io.BytesIO(content))
    return {str(font.get_object().get("/BaseFont", "?")).split("+")[-1]
            for page in reader.pages
            for _, font in (page.get("/Resources", {}).get("/Font", {}) or {}).items()}


def _text(content: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() for page in reader.pages)


# --- fontul, adica motivul pentru care exista jumatate din modul -----------

def test_pdf_ul_foloseste_noto_sans(document):
    """`decizii.md`: Liberation si DejaVu deseneaza gresit s si t cu virgula.

    Testul asta a prins de doua ori acelasi tip de esec tacut:
      1. autoescape transforma ghilimelele din stiva de fonturi in `&#39;`, iar
         CSS-ul nu decodifica entitati HTML — declaratia pica si se cadea pe serif;
      2. cutia `@bottom-center` din `@page` nu mosteneste de la `body`, deci
         subsolul se randa cu alt font.

    Ambele produc un PDF care arata bine pe ecran si prost la tiparire.
    """
    fonts = _fonts(pdf.render(document).content)
    assert fonts, "PDF-ul nu are niciun font embedded"
    assert all(name.startswith("Noto-Sans") for name in fonts), \
        f"PDF-ul contine si alte familii: {sorted(fonts)}"


def test_diacriticele_supravietuiesc_in_pdf(document):
    text = _text(pdf.render(document).content)
    for probe in ("Consultanță IT", "Mentenanță și suport", "mulțumim"):
        assert probe in text, f"lipseste din PDF: {probe!r}"


def test_stiva_de_fonturi_incepe_cu_noto(document):
    """Ordinea conteaza: primul font gasit castiga."""
    assert pdf.FONT_STACK.startswith("'Noto Sans'")
    assert "Liberation" not in pdf.FONT_STACK
    assert "DejaVu" not in pdf.FONT_STACK


def test_stiva_de_fonturi_nu_e_escapata(document):
    """Daca `| safe` dispare din sablon, aici se vede imediat.

    Se verifica DECLARATIILE de font, nu absenta entitatii din tot fisierul:
    comentariile din CSS o mentioneaza, si e in regula acolo.
    """
    import re

    declarations = re.findall(r"font-family:[^;]*", pdf.render_html(document))
    assert declarations, "sablonul nu declara niciun font"
    for declaration in declarations:
        assert "&#" not in declaration, f"stiva escapata: {declaration}"
    assert any("'Noto Sans'" in declaration for declaration in declarations)


def test_si_subsolul_paginii_primeste_fontul(document):
    """Cutiile de margine din `@page` nu mostenesc de la `body`. Fara declaratie
    proprie, subsolul se randeaza cu serif si PDF-ul ajunge cu doua familii."""

    html = pdf.render_html(document)
    page_rule = html[html.index("@page"):html.index("body {")]
    assert "font-family" in page_rule, "@bottom-center nu are font propriu"


def test_datele_din_document_raman_escapate(document):
    """`| safe` e doar pentru constanta noastra de fonturi; continutul introdus
    de om trebuie sa ramana escapat."""
    document["buyer"]["name"] = '<script>alert("x")</script> SRL'
    html = pdf.render_html(document)
    assert "<script>" not in html
    assert "&lt;script&gt;" in html


# --- imutabilitatea reprezentarii -----------------------------------------

def test_randarea_e_determinista(document):
    """Doua randari ale aceleiasi facturi cu acelasi sablon dau acelasi hash.
    Fara asta, verificarea de integritate din worker ar da alarme false."""
    first = pdf.render(document)
    second = pdf.render(document)
    assert first.sha256 == second.sha256


def test_determinismul_rezista_trecerii_timpului(document):
    """WeasyPrint scrie data curenta in metadate. Testul de mai sus a fost flaky
    exact din motivul asta: trecea cand cele doua randari nimereau in aceeasi
    secunda. Aici secundele difera garantat.

    Daca `SOURCE_DATE_EPOCH` dispare din `pdf.render`, testul pica.
    """
    import time as clock

    first = pdf.render(document)
    clock.sleep(1.1)
    second = pdf.render(document)
    assert first.sha256 == second.sha256


def test_randarile_nu_lasa_variabila_de_mediu_in_urma(document, monkeypatch):
    """`SOURCE_DATE_EPOCH` e globala pe proces; randarea o restaureaza dupa ea."""
    monkeypatch.delenv(pdf.SOURCE_DATE_EPOCH, raising=False)
    pdf.render(document)
    assert pdf.SOURCE_DATE_EPOCH not in os.environ

    monkeypatch.setenv(pdf.SOURCE_DATE_EPOCH, "12345")
    pdf.render(document)
    assert os.environ[pdf.SOURCE_DATE_EPOCH] == "12345"


def test_facturi_din_zile_diferite_dau_pdf_uri_diferite(document):
    """Ancorarea la data emiterii, nu la o constanta: altfel doua facturi
    identice ca text, din luni diferite, ar avea acelasi hash."""
    first = pdf.render(document)
    document["issue_date"] = date(2026, 10, 9)
    assert pdf.render(document).sha256 != first.sha256


def test_versiunea_sablonului_ajunge_in_rezultat(document):
    result = pdf.render(document)
    assert result.template_version == pdf.CURRENT_TEMPLATE_VERSION
    assert pdf.CURRENT_TEMPLATE_VERSION in pdf.available_versions()


def test_versiune_inexistenta_da_eroare_care_listeaza_variantele(document):
    with pytest.raises(pdf.TemplateNotFound, match="Versiuni disponibile"):
        pdf.render_html(document, version="v99")


def test_mentiunea_legala_spune_ce_e_originalul(document):
    """Constrangerea 15: originalul legal e XML-ul semnat de ANAF. PDF-ul trebuie
    sa o spuna, altfel cineva il arhiveaza pe el si atat."""
    text = _text(pdf.render(document).content)
    assert "XML" in text
    assert "RO e-Factura" in text


# --- continut --------------------------------------------------------------

def test_sumele_apar_in_format_romanesc(document):
    text = _text(pdf.render(document).content)
    assert "1.210,00" in text, "separator de mii punct, zecimal virgula"


@pytest.mark.parametrize(("value", "expected"), [
    (D("1234.5"), "1.234,50"),
    (D("0"), "0,00"),
    (D("-1210"), "-1.210,00"),
    (D("1000000.99"), "1.000.000,99"),
    (D("0.005"), "0,01"),
])
def test_formatarea_sumelor(value, expected):
    assert pdf.format_amount(value) == expected


def test_cantitatea_nu_are_zerouri_inutile():
    assert pdf.format_quantity(D("10.0000")) == "10"
    assert pdf.format_quantity(D("3.5000")) == "3,5"


def test_data_in_format_romanesc():
    assert pdf.format_date(date(2026, 9, 9)) == "09.09.2026"


def test_stornoul_se_vede_din_titlu(document):
    document["is_storno"] = True
    document["preceding_invoice_id"] = "FSIT0001"
    text = _text(pdf.render(document).content)
    assert "STORNO" in text
    assert "FSIT0001" in text


def test_categoria_o_nu_afiseaza_cota(document):
    """Consecventa cu UBL-ul: la „neimpozabil" nu exista cota, deci nu se scrie 0%."""
    document["lines"][0].update(vat_category="O", vat_percent=None)
    document["vat_breakdown"] = [{"category": "O", "percent": None,
                                  "taxable": D("1000.00"), "tax_amount": D(0),
                                  "exemption_reason": "Nu intra in sfera TVA"}]
    text = _text(pdf.render(document).content)
    assert "0%" not in text


def test_subsolul_numeroteaza_paginile(document):
    text = _text(pdf.render(document).content)
    assert "Pagina 1 din 1" in text


def test_factura_lunga_se_pagineaza(document):
    document["lines"] = [
        {"name": f"Linia {i}", "quantity": D(1), "unit_code": "H87",
         "unit_price": D("10.00"), "net": D("10.00"), "vat_category": "S",
         "vat_percent": D(21)} for i in range(120)]
    reader = pypdf.PdfReader(io.BytesIO(pdf.render(document).content))
    assert len(reader.pages) > 1
    assert "din " + str(len(reader.pages)) in _text(pdf.render(document).content)


# --- termenul de arhivare --------------------------------------------------

@pytest.mark.parametrize(("issued", "expected"), [
    (date(2026, 1, 15), date(2032, 7, 1)),
    (date(2026, 12, 31), date(2032, 7, 1)),
    (date(2027, 1, 1), date(2033, 7, 1)),
])
def test_retain_until_e_1_iulie_plus_cinci_ani(issued, expected):
    """Art. 25 Legea 82/1991, cu termenul redus la 5 ani prin Legea 36/2023.
    Se calculeaza de la 1 iulie a anului URMATOR exercitiului financiar."""
    assert pdf.retention_deadline(issued) == expected
