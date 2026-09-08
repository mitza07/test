"""Cazurile de esec care produc respingeri reale la ANAF."""

from decimal import Decimal

from app.core.validation.br_ro import validate

D = Decimal


def _rules(report):
    return {f.rule for f in report.findings if f.severity == "fatal"}


def test_documentul_valid_trece(valid_doc):
    rep = validate(valid_doc)
    assert rep.ok, [f.message for f in rep.findings]


def test_bucuresti_fara_sector(valid_doc):
    valid_doc["buyer"].update(county="RO-B", city="Bucuresti")
    rep = validate(valid_doc)
    assert not rep.ok
    assert "BR-RO-101" in _rules(rep)


def test_sector_scris_cu_spatiu(valid_doc):
    valid_doc["seller"].update(city="Sector 1")
    assert "BR-RO-100" in _rules(validate(valid_doc))


def test_judet_ca_text_liber(valid_doc):
    valid_doc["buyer"]["county"] = "Cluj"
    assert "BR-RO-111" in _rules(validate(valid_doc))


def test_adresa_lipsa(valid_doc):
    valid_doc["buyer"]["address1"] = ""
    assert "BR-RO-082" in _rules(validate(valid_doc))


def test_localitate_lipsa(valid_doc):
    valid_doc["buyer"]["city"] = ""
    assert "BR-RO-092" in _rules(validate(valid_doc))


def test_cui_cu_cifra_de_control_gresita(valid_doc):
    valid_doc["buyer"]["legal_reg_id"] = "8609469"
    assert "ERRIdentif" in _rules(validate(valid_doc))


def test_cumparator_fara_identificator(valid_doc):
    valid_doc["buyer"].pop("legal_reg_id")
    assert "BR-RO-120" in _rules(validate(valid_doc))


def test_trei_zecimale_pe_linie(valid_doc):
    valid_doc["lines"][0]["net"] = D("1000.001")
    assert "BR-DEC-RO-23" in _rules(validate(valid_doc))


def test_numar_fara_cifra(valid_doc):
    valid_doc["invoice_id"] = "FSIT"
    assert "BR-RO-010" in _rules(validate(valid_doc))


def test_customization_id_gresit(valid_doc):
    valid_doc["customization_id"] = "urn:cen.eu:en16931:2017"
    assert "BR-RO-001" in _rules(validate(valid_doc))


def test_cod_tip_document_invalid(valid_doc):
    valid_doc["invoice_type_code"] = "390"
    assert "BR-RO-020_1" in _rules(validate(valid_doc))


def test_valuta_straina_fara_tva_in_ron(valid_doc):
    valid_doc["currency"] = "EUR"
    valid_doc["tax_currency"] = "EUR"
    assert "BR-RO-030" in _rules(validate(valid_doc))


def test_cod_exigibilitate_invalid(valid_doc):
    valid_doc["tax_point_code"] = "7"
    assert "BR-RO-040" in _rules(validate(valid_doc))


def test_pret_negativ(valid_doc):
    valid_doc["lines"][0]["unit_price"] = D("-1.00")
    assert "BR-27" in _rules(validate(valid_doc))


def test_unitate_de_masura_lipsa(valid_doc):
    valid_doc["lines"][0]["unit_code"] = ""
    assert "BR-23" in _rules(validate(valid_doc))


def test_denumire_articol_peste_100(valid_doc):
    valid_doc["lines"][0]["name"] = "x" * 101
    assert "BR-RO-L1013" in _rules(validate(valid_doc))


def test_totaluri_incoerente(valid_doc):
    valid_doc["tax_inclusive"] = D("1.00")
    assert "BR-CO-15" in _rules(validate(valid_doc))


def test_defalcare_tva_care_nu_se_inchide(valid_doc):
    valid_doc["vat_breakdown"][0]["tax_amount"] = D("1.00")
    rules = _rules(validate(valid_doc))
    assert "BR-CO-14" in rules or "BR-CO-17" in rules


def test_scutire_fara_motiv(make_doc):
    doc = make_doc([(1, "100.00", "E", 0)])
    assert "BR-E-10" in _rules(validate(doc))


def test_storno_fara_referinta(valid_doc):
    valid_doc["is_storno"] = True
    valid_doc["invoice_type_code"] = "384"
    assert "BG-3" in _rules(validate(valid_doc))


def test_peste_20_de_comentarii(valid_doc):
    valid_doc["notes"] = ["nota"] * 21
    assert "BR-RO-A020" in _rules(validate(valid_doc))


def test_taxcode_saft_lipsa_e_avertizare_nu_eroare(valid_doc):
    valid_doc["lines"][0]["saft_tax_code"] = None
    rep = validate(valid_doc)
    assert rep.ok
    assert any(f.rule == "D406-TAXCODE" for f in rep.findings)


def test_mesajele_sunt_in_romana(valid_doc):
    valid_doc["buyer"].update(county="RO-B", city="Bucuresti")
    msg = next(f.message for f in validate(valid_doc).findings if f.rule == "BR-RO-101")
    assert "SECTOR1" in msg and "Bucuresti" in msg
