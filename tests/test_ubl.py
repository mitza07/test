"""Generatorul UBL: cele patru cazuri din TODO.md punctul 2, plus invariantii.

Fiecare document generat aici trece si prin verificarea de ordine a elementelor.
Ordinea e singurul lucru pe care ANAF il respinge pe schema, adica fara sa spuna
ce anume e gresit — deci merita verificata la fiecare test, nu doar o data.
"""

from datetime import date
from decimal import Decimal

import pytest

from app.core.rounding import Line, compute
from app.core.ubl import sequence
from app.core.ubl.generator import (
    NS_CAC,
    NS_CBC,
    NS_CREDIT_NOTE,
    NS_INVOICE,
    UblError,
    build_string,
    build_tree,
)
from app.core.validation.br_ro import validate

D = Decimal
NS = {"cac": NS_CAC, "cbc": NS_CBC}


def _tree(doc):
    """Genereaza si verifica ordinea elementelor. Toate testele trec pe aici."""
    tree = build_tree(doc)
    problems = sequence.violations(tree)
    assert problems == [], "elemente emise in afara secventei XSD:\n" + "\n".join(problems)
    return tree


def _text(tree, path):
    found = tree.findall(path, NS)
    return [element.text for element in found]


def _one(tree, path):
    values = _text(tree, path)
    assert len(values) == 1, f"asteptam exact un {path}, am gasit {len(values)}"
    return values[0]


# --- 1. factura simpla -----------------------------------------------------

def test_factura_simpla(valid_doc):
    tree = _tree(valid_doc)

    assert tree.tag == f"{{{NS_INVOICE}}}Invoice"
    assert _one(tree, "cbc:CustomizationID") == (
        "urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1"
    )
    assert _one(tree, "cbc:UBLVersionID") == "2.1"
    assert _one(tree, "cbc:ID") == "FSIT0001"
    assert _one(tree, "cbc:IssueDate") == "2026-09-09"
    assert _one(tree, "cbc:InvoiceTypeCode") == "380"
    assert _one(tree, "cbc:DocumentCurrencyCode") == "RON"


def test_documentul_generat_trece_propriul_validator(valid_doc):
    """Validatorul ruleaza pe dict, generatorul pe acelasi dict. Daca unul accepta
    ceva ce celalalt refuza, formele au divergat."""
    assert validate(valid_doc).ok
    _tree(valid_doc)


def test_judetul_si_sectorul_ajung_in_XML(valid_doc):
    seller = "cac:AccountingSupplierParty/cac:Party/cac:PostalAddress"
    assert _one(_tree(valid_doc), f"{seller}/cbc:CountrySubentity") == "RO-B"
    assert _one(_tree(valid_doc), f"{seller}/cbc:CityName") == "SECTOR1"


def test_codul_de_tva_si_cel_de_inregistrare_stau_in_locuri_diferite(valid_doc):
    """BT-31 (cod TVA, cu RO) in PartyTaxScheme; BT-30 (Registrul Comertului)
    in PartyLegalEntity. Confundate, ANAF respinge cu ERRIdentif."""
    tree = _tree(valid_doc)
    party = "cac:AccountingSupplierParty/cac:Party"
    assert _one(tree, f"{party}/cac:PartyTaxScheme/cbc:CompanyID") == "RO8609468"
    assert _one(tree, f"{party}/cac:PartyLegalEntity/cbc:CompanyID") == "J40/1234/2020"


def test_unitatea_de_masura_e_cod_un_ece(valid_doc):
    quantity = _tree(valid_doc).findall("cac:InvoiceLine/cbc:InvoicedQuantity", NS)
    assert quantity[0].get("unitCode") == "HUR"


def test_moneda_e_pe_fiecare_suma(valid_doc):
    tree = _tree(valid_doc)
    amounts = tree.findall(".//cbc:PayableAmount", NS) + \
        tree.findall(".//cbc:TaxAmount", NS) + \
        tree.findall(".//cbc:LineExtensionAmount", NS)
    assert amounts
    for amount in amounts:
        assert amount.get("currencyID") == "RON"


# --- 2. factura in EUR -----------------------------------------------------

def _eur_doc(make_doc, **extra):
    doc = make_doc([(1, "1000.00", "S", 21)])
    doc.update(currency="EUR", tax_currency="RON", **extra)
    return doc


def test_factura_in_eur_cere_tva_in_ron(make_doc):
    """BR-RO-030: daca BT-5 nu e RON, BT-6 trebuie sa fie RON."""
    doc = _eur_doc(make_doc, tax_amount_accounting=D("1050.00"))
    tree = _tree(doc)
    assert _one(tree, "cbc:DocumentCurrencyCode") == "EUR"
    assert _one(tree, "cbc:TaxCurrencyCode") == "RON"


def test_eur_produce_al_doilea_tax_total_in_ron(make_doc):
    """BT-111 se exprima ca un al doilea TaxTotal, cu TaxAmount si fara subtotaluri."""
    doc = _eur_doc(make_doc, tax_amount_accounting=D("1050.00"))
    totals = _tree(doc).findall("cac:TaxTotal", NS)
    assert len(totals) == 2
    assert totals[0].find("cbc:TaxAmount", NS).get("currencyID") == "EUR"
    assert totals[1].find("cbc:TaxAmount", NS).get("currencyID") == "RON"
    assert totals[1].find("cbc:TaxAmount", NS).text == "1050.00"
    assert totals[1].findall("cac:TaxSubtotal", NS) == []


def test_eur_fara_bt111_e_refuzat_explicit(make_doc):
    """BR-53. Mai bine o exceptie clara decat un XML care pica la ANAF."""
    doc = _eur_doc(make_doc)
    with pytest.raises(UblError, match="BT-111"):
        build_tree(doc)


def test_moneda_ron_nu_emite_bt6_redundant(valid_doc):
    """BT-6 prezent obliga la BT-111 (BR-53). Cand moneda e tot RON, nu are ce cauta."""
    assert _text(_tree(valid_doc), "cbc:TaxCurrencyCode") == []


# --- 3. storno -------------------------------------------------------------

def test_storno_ca_factura_corectata(make_doc):
    """Cod 384: ramane document Invoice, cu referinta BG-3 la factura corectata."""
    doc = make_doc([(1, "-0", "S", 21)])
    doc.update(invoice_id="FSIT0002", invoice_type_code="384", is_storno=True,
               preceding_invoice_id="FSIT0001",
               preceding_invoice_date=date(2026, 9, 9))
    tree = _tree(doc)
    assert tree.tag == f"{{{NS_INVOICE}}}Invoice"
    assert _one(tree, "cbc:InvoiceTypeCode") == "384"
    reference = "cac:BillingReference/cac:InvoiceDocumentReference"
    assert _one(tree, f"{reference}/cbc:ID") == "FSIT0001"          # BT-25
    assert _one(tree, f"{reference}/cbc:IssueDate") == "2026-09-09"  # BT-26


def test_nota_de_creditare_schimba_radacina(make_doc):
    """Cod 381 nu e o factura cu alt cod: e alt document, cu alta radacina, alt
    endpoint de validare (FCN) si alt parametru `standard` la upload (CN)."""
    doc = make_doc([(1, "100.00", "S", 21)])
    doc.update(invoice_type_code="381", is_credit_note=True,
               preceding_invoice_id="FSIT0001")
    tree = _tree(doc)
    assert tree.tag == f"{{{NS_CREDIT_NOTE}}}CreditNote"
    assert _one(tree, "cbc:CreditNoteTypeCode") == "381"
    assert _text(tree, "cbc:InvoiceTypeCode") == []
    assert len(tree.findall("cac:CreditNoteLine", NS)) == 1
    assert len(tree.findall("cac:InvoiceLine", NS)) == 0


def test_nota_de_creditare_foloseste_credited_quantity(make_doc):
    doc = make_doc([(3, "100.00", "S", 21)])
    doc.update(invoice_type_code="381", preceding_invoice_id="FSIT0001")
    tree = _tree(doc)
    quantity = tree.find("cac:CreditNoteLine/cbc:CreditedQuantity", NS)
    assert quantity is not None and quantity.text == "3"


def test_antetul_notei_de_creditare_are_alta_ordine(make_doc):
    """La CreditNote, TaxPointDate precede codul de tip; la Invoice il urmeaza.
    Daca secventele ar fi identice, testul asta ar trece degeaba — de aceea
    verifica pozitiile efective, nu doar prezenta."""
    doc = make_doc([(1, "100.00", "S", 21)])
    doc.update(invoice_type_code="381", tax_point_date=date(2026, 9, 9),
               preceding_invoice_id="FSIT0001")
    children = [child.tag.rsplit("}", 1)[-1] for child in _tree(doc)]
    assert children.index("TaxPointDate") < children.index("CreditNoteTypeCode")


# --- 4. taxare inversa -----------------------------------------------------

def test_taxare_inversa(make_doc):
    """Categoria AE: cota 0, TVA 0, motiv de scutire obligatoriu (BR-E-10)."""
    doc = make_doc([(1, "5000.00", "AE", 0)])
    doc["vat_breakdown"][0].update(
        exemption_reason="Taxare inversa conform art. 331 Cod fiscal",
        exemption_code="VATEX-EU-AE",
    )
    assert validate(doc).ok, [f.message for f in validate(doc).findings]

    tree = _tree(doc)
    category = tree.find("cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory", NS)
    assert category.find("cbc:ID", NS).text == "AE"
    assert category.find("cbc:Percent", NS).text == "0"
    assert category.find("cbc:TaxExemptionReason", NS).text.startswith("Taxare inversa")
    assert category.find("cbc:TaxExemptionReasonCode", NS).text == "VATEX-EU-AE"
    assert _one(tree, "cac:TaxTotal/cbc:TaxAmount") == "0.00"


def test_categoria_o_nu_poarta_cota(make_doc):
    """BR-O-5 si BR-O-6: la „neimpozabil" cota trebuie sa LIPSEASCA, nu sa fie 0.
    Diferenta fata de E, Z, G, K si AE, unde cota 0 e prezenta."""
    doc = make_doc([(1, "100.00", "O", 0)])
    doc["vat_breakdown"][0].update(exemption_reason="Nu intra in sfera TVA")
    tree = _tree(doc)
    category = tree.find("cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory", NS)
    assert category.find("cbc:ID", NS).text == "O"
    assert category.find("cbc:Percent", NS) is None
    line_category = tree.find("cac:InvoiceLine/cac:Item/cac:ClassifiedTaxCategory", NS)
    assert line_category.find("cbc:Percent", NS) is None


# --- invarianti pe sume ----------------------------------------------------

def test_toate_sumele_au_exact_doua_zecimale(make_doc):
    """Constrangerea 1 din CLAUDE.md, verificata pe XML-ul serializat, nu pe Decimal.

    Pretul unitar (BT-146) e exceptat: nu apare in lista BR-DEC-RO din
    specificatie, sectiunea 2.5.
    """
    doc = make_doc([(D("3.333"), "7.777", "S", 21), (1, "0.03", "S", 11)])
    tree = _tree(doc)
    for element in tree.iter():
        name = element.tag.rsplit("}", 1)[-1]
        if not name.endswith("Amount") or element.get("currencyID") is None:
            continue
        if name == "PriceAmount":
            continue
        _, _, fraction = element.text.partition(".")
        assert len(fraction) == 2, f"{name} = {element.text}"


def test_tva_agregat_ajunge_neschimbat_in_xml():
    """Cazul 3 x 0,03 la 21% din test_rounding, verificat pana in XML: TVA-ul din
    defalcare este 0,02, nu 0,03 — nu se recalculeaza nicaieri pe drum."""
    lines = [Line(D(1), D("0.03"), "S", D(21)) for _ in range(3)]
    totals = compute(lines)
    doc = {
        "invoice_id": "FSIT0003",
        "invoice_type_code": "380",
        "issue_date": date(2026, 9, 9),
        "currency": "RON",
        "seller": {"name": "Atelier IT SRL", "vat_id": "RO8609468",
                   "address1": "Str. Fabricii nr. 10", "city": "SECTOR1",
                   "county": "RO-B", "country": "RO"},
        "buyer": {"name": "Studio Nord SRL", "legal_reg_id": "8609468",
                  "address1": "Str. Atelierului nr. 5", "city": "Cluj-Napoca",
                  "county": "RO-CJ", "country": "RO"},
        "lines": [{"name": "Bucata", "quantity": D(1), "unit_price": D("0.03"),
                   "unit_code": "H87", "net": line.net(), "vat_category": "S",
                   "vat_percent": D(21)} for line in lines],
        "line_total": totals.line_total,
        "allowance_total": totals.allowance_total,
        "charge_total": totals.charge_total,
        "tax_exclusive": totals.tax_exclusive,
        "tax_amount": totals.tax_amount,
        "tax_inclusive": totals.tax_inclusive,
        "prepaid": totals.prepaid,
        "rounding": totals.rounding,
        "payable": totals.payable,
        "vat_breakdown": [{"category": b.category, "percent": b.percent,
                           "taxable": b.taxable, "tax_amount": b.tax_amount}
                          for b in totals.breakdown],
    }
    tree = _tree(doc)
    assert _one(tree, "cac:TaxTotal/cbc:TaxAmount") == "0.02"
    assert _one(tree, "cac:TaxTotal/cac:TaxSubtotal/cbc:TaxableAmount") == "0.09"
    assert _one(tree, "cac:LegalMonetaryTotal/cbc:PayableAmount") == "0.11"


def test_pretul_unitar_poate_avea_patru_zecimale(make_doc):
    """BT-146 nu e sub regula celor 2 zecimale — altfel nu poti factura la 0,3333."""
    doc = make_doc([(3, "0.3333", "S", 21)])
    doc["lines"][0]["unit_price"] = D("0.3333")
    price = _tree(doc).find("cac:InvoiceLine/cac:Price/cbc:PriceAmount", NS)
    assert price.text == "0.3333"


def test_pret_cu_tva_inclus_devine_pret_net(make_doc):
    """BT-146 e pretul NET. Cand operatorul introduce pretul cu TVA, se scoate aici."""
    doc = make_doc([(1, "121.00", "S", 21)])
    doc["lines"][0].update(unit_price=D("121.00"), vat_included=True, net=D("100.00"))
    price = _tree(doc).find("cac:InvoiceLine/cac:Price/cbc:PriceAmount", NS)
    assert price.text == "100.00"


def test_deducerea_de_document_nu_e_pret_negativ(make_doc):
    """Constrangerea BR-27: discountul e AllowanceCharge cu ChargeIndicator=false."""
    doc = make_doc([(1, "100.00", "S", 21)])
    doc["allowances"] = [{"is_charge": False, "amount": D("10.00"),
                          "reason": "Discount fidelitate", "vat_category": "S",
                          "vat_percent": D(21)}]
    doc["allowance_total"] = D("10.00")
    tree = _tree(doc)
    allowance = tree.find("cac:AllowanceCharge", NS)
    assert allowance.find("cbc:ChargeIndicator", NS).text == "false"
    assert allowance.find("cbc:Amount", NS).text == "10.00"
    assert _one(tree, "cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount") == "10.00"


def test_xml_are_declaratie_si_utf8(valid_doc):
    text = build_string(valid_doc)
    assert text.startswith("<?xml version='1.0' encoding='UTF-8'?>")


def test_diacriticele_supravietuiesc(make_doc):
    """s si t cu virgula, nu cu sedila. Daca se strica aici, se strica si in PDF."""
    doc = make_doc([(1, "100.00", "S", 21)])
    doc["lines"][0]["name"] = "Mentenanță și suport"
    assert "Mentenanță și suport" in build_string(doc)


def test_verificatorul_de_ordine_chiar_prinde_ceva():
    """Un test care trece din prima poate fi un test care nu testeaza nimic.

    Restul fisierului se bazeaza pe `sequence.violations`; asta demonstreaza ca
    functia raporteaza atat inversiunile, cat si elementele necunoscute.
    """
    from lxml import etree

    root = etree.Element(f"{{{NS_INVOICE}}}Invoice")
    etree.SubElement(root, f"{{{NS_CBC}}}ID").text = "FSIT0001"
    etree.SubElement(root, f"{{{NS_CBC}}}CustomizationID").text = "urn:..."
    etree.SubElement(root, f"{{{NS_CBC}}}Inventat").text = "?"

    problems = sequence.violations(root)
    assert any("CustomizationID" in p and "ID" in p for p in problems)
    assert any("Inventat" in p for p in problems)
