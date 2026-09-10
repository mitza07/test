"""Validarea cu artefactele oficiale.

Artefactele nu sunt in repo (se descarca, vezi schematron/README.md), deci testul
care conteaza cu adevarat se activeaza singur cand le gaseste. Restul verifica
partea pe care o pot verifica oricand: traducerea SVRL -> Report, si faptul ca
absenta artefactelor produce o eroare clara, nu un „totul e in regula" fals.
"""

import pytest
from lxml import etree

from app.core.ubl import schematron
from app.core.ubl.generator import build

SVRL_NS = schematron.SVRL_NS


def _svrl(body: str) -> etree._Element:
    return etree.fromstring(
        f'<svrl:schematron-output xmlns:svrl="{SVRL_NS}">{body}</svrl:schematron-output>'
        .encode()
    )


# --- absenta artefactelor --------------------------------------------------

def test_fara_artefacte_nu_pretinde_ca_a_validat(tmp_path):
    """Cea mai periculoasa varianta ar fi un Report gol. Trebuie exceptie."""
    root = str(tmp_path / "lipsa")
    assert schematron.available(root) is False
    with pytest.raises(FileNotFoundError, match="schematron/README.md"):
        schematron.check_rules(b"<Invoice/>", root)


def test_mesajul_de_eroare_spune_unde_a_cautat(tmp_path):
    root = str(tmp_path / "gol")
    (tmp_path / "gol").mkdir()
    with pytest.raises(FileNotFoundError, match=str(tmp_path)):
        schematron.check_rules(b"<Invoice/>", root)


def test_gaseste_artefactele_recursiv(tmp_path):
    """Arhiva oficiala si-a schimbat structura intre versiuni; cautarea e recursiva."""
    nested = tmp_path / "ro16931-ubl-1.0.9" / "compiled"
    nested.mkdir(parents=True)
    (nested / "CIUS-RO.xslt").write_text("<x/>")
    found = schematron.discover(str(tmp_path))
    assert found.xslt is not None and found.xslt.name == "CIUS-RO.xslt"
    assert found.can_check_rules is True


# --- traducerea SVRL -------------------------------------------------------

def test_failed_assert_devine_eroare_fatala():
    report = schematron._from_svrl(_svrl(
        '<svrl:failed-assert location="/Invoice/cac:AccountingCustomerParty">'
        f'<svrl:text xmlns:svrl="{SVRL_NS}">[BR-RO-101]-Pentru RO-B localitatea '
        'trebuie sa fie SECTOR1..SECTOR6</svrl:text>'
        '</svrl:failed-assert>'
    ))
    assert not report.ok
    finding = report.findings[0]
    assert finding.rule == "BR-RO-101"
    assert finding.severity == "fatal"
    assert finding.field_path == "/Invoice/cac:AccountingCustomerParty"
    assert "SECTOR1" in finding.message


def test_flagul_warning_bate_tipul_elementului():
    """Schematronul CIUS-RO marcheaza si asertii ca `warning`. Un avertisment
    tratat ca eroare ar bloca emiterea degeaba."""
    report = schematron._from_svrl(_svrl(
        '<svrl:failed-assert location="/Invoice" flag="warning">'
        f'<svrl:text xmlns:svrl="{SVRL_NS}">[PEPPOL-EN16931-R001]-Recomandare</svrl:text>'
        '</svrl:failed-assert>'
    ))
    assert report.ok
    assert report.findings[0].severity == "warning"
    assert report.findings[0].rule == "PEPPOL-EN16931-R001"


def test_successful_report_e_avertizare_implicit():
    report = schematron._from_svrl(_svrl(
        '<svrl:successful-report location="/Invoice">'
        f'<svrl:text xmlns:svrl="{SVRL_NS}">Ceva de semnalat</svrl:text>'
        '</svrl:successful-report>'
    ))
    assert report.ok
    assert report.findings[0].severity == "warning"


def test_svrl_curat_da_raport_gol():
    report = schematron._from_svrl(_svrl(
        f'<svrl:fired-rule xmlns:svrl="{SVRL_NS}" context="/Invoice"/>'
    ))
    assert report.findings == []
    assert report.ok


def test_id_ul_explicit_bate_ghicitul_din_mesaj():
    report = schematron._from_svrl(_svrl(
        '<svrl:failed-assert location="/Invoice" id="BR-RO-030">'
        f'<svrl:text xmlns:svrl="{SVRL_NS}">Mesaj fara cod la inceput</svrl:text>'
        '</svrl:failed-assert>'
    ))
    assert report.findings[0].rule == "BR-RO-030"


def test_mesajul_e_normalizat_pe_o_linie():
    report = schematron._from_svrl(_svrl(
        '<svrl:failed-assert location="/Invoice">'
        f'<svrl:text xmlns:svrl="{SVRL_NS}">\n    text pe\n    mai multe randuri\n  </svrl:text>'
        '</svrl:failed-assert>'
    ))
    assert report.findings[0].message == "text pe mai multe randuri"


# --- procesorul XSLT -------------------------------------------------------

XSLT2_SVRL = """<?xml version="1.0"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
   xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
   xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
   xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
   xmlns:f="local" exclude-result-prefixes="f">
  <xsl:function name="f:has-digit" as="xs:boolean"
                xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xsl:param name="v" as="xs:string"/>
    <xsl:sequence select="matches($v, '[0-9]')"/>
  </xsl:function>
  <xsl:template match="/">
    <svrl:schematron-output>
      <xsl:if test="not(f:has-digit(string(/ubl:Invoice/cbc:ID)))">
        <svrl:failed-assert location="/Invoice/cbc:ID" flag="fatal">
          <svrl:text>[BR-RO-010]-Numarul facturii trebuie sa contina o cifra.</svrl:text>
        </svrl:failed-assert>
      </xsl:if>
    </svrl:schematron-output>
  </xsl:template>
</xsl:stylesheet>"""

INVOICE_FARA_CIFRE = (
    b'<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"'
    b' xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">'
    b"<cbc:ID>FARA-CIFRE</cbc:ID></Invoice>"
)


def _with_xslt2(tmp_path):
    (tmp_path / "cius-ro.xslt").write_text(XSLT2_SVRL)
    schematron.discover.cache_clear()
    return str(tmp_path)


def test_versiunea_xslt_e_detectata(tmp_path):
    root = _with_xslt2(tmp_path)
    assert schematron._xslt_version(schematron.discover(root).xslt) == "2.0"


def test_xslt2_ruleaza_prin_saxon(tmp_path):
    """Traseul care conteaza in productie.

    Schematronul CIUS-RO e XSLT 2.0, iar libxslt (lxml) implementeaza doar 1.0 —
    stylesheet-ul de test foloseste `xsl:function`, deci lxml chiar nu il poate
    rula. Daca testul asta trece, procesorul e cel corect.
    """
    pytest.importorskip("saxonche")
    root = _with_xslt2(tmp_path)
    assert schematron.available(root) is True

    report = schematron.check_rules(INVOICE_FARA_CIFRE, root)
    assert not report.ok
    assert report.findings[0].rule == "BR-RO-010"
    assert report.findings[0].severity == "fatal"


def test_fara_saxon_available_da_false_nu_exceptie(tmp_path, monkeypatch):
    """Artefacte prezente + procesor absent nu inseamna „gata de validat".

    Altfel testele de mai jos s-ar activa si ar pica din alt motiv decat cel
    pe care il verifica.
    """
    root = _with_xslt2(tmp_path)
    monkeypatch.setattr(schematron, "_saxon_available", lambda: False)
    assert schematron.available(root) is False
    with pytest.raises(schematron.ProcessorUnavailable, match="saxonche"):
        schematron.check_rules(INVOICE_FARA_CIFRE, root)


def test_sch_cu_querybinding_xslt2_e_refuzat_explicit(tmp_path):
    """lxml.isoschematron ridica un XSLTApplyError greu de citit. Mai bine spunem
    din start ce lipseste."""
    (tmp_path / "reguli.sch").write_text(
        '<schema xmlns="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2"/>'
    )
    schematron.discover.cache_clear()
    with pytest.raises(schematron.ProcessorUnavailable, match="queryBinding"):
        schematron.check_rules(INVOICE_FARA_CIFRE, str(tmp_path))


# --- validarea reala, cand artefactele sunt pe disc ------------------------

@pytest.mark.skipif(not schematron.available(),
                    reason="artefactele oficiale nu sunt in SCHEMATRON_PATH; "
                           "vezi schematron/README.md")
def test_factura_valida_trece_schematronul_oficial(valid_doc):
    """Testul care decide daca generatorul e corect.

    Pana ruleaza asta, ordinea elementelor din app/core/ubl/sequence.py ramane
    o ipoteza, nu un fapt verificat.
    """
    report = schematron.check(build(valid_doc))
    assert report.ok, [f"{f.rule}: {f.message}" for f in report.findings
                       if f.severity == "fatal"]


@pytest.mark.skipif(not schematron.available(),
                    reason="artefactele oficiale nu sunt in SCHEMATRON_PATH")
def test_bucuresti_fara_sector_pica_si_la_schematron(valid_doc):
    """Verifica si ca schematronul chiar ruleaza: daca ar trece si documentul
    gresit, artefactele sunt incarcate degeaba."""
    valid_doc["buyer"].update(county="RO-B", city="Bucuresti")
    report = schematron.check(build(valid_doc))
    assert not report.ok


# --- compilarea: scheletul si alegerea fisierului de intrare ---------------

def test_comentariile_din_svrl_nu_opresc_traducerea():
    """Saxon pune comentarii intre elementele SVRL. `.tag`-ul unui comentariu e o
    functie, nu un string, si `QName` pe el ridica ValueError — a fost bug."""
    svrl = _svrl('<!-- pattern ROmodel -->'
                 '<svrl:failed-assert id="BR-RO-100" location="/x">'
                 '<svrl:text>ceva</svrl:text></svrl:failed-assert>'
                 '<?nimic?>')
    report = schematron._from_svrl(svrl)
    assert [f.rule for f in report.findings] == ["BR-RO-100"]


def test_scheletul_iso_e_complet():
    """Cele patru fisiere se importa reciproc; unul lipsa da o eroare de Saxon
    care nu spune ce lipseste."""
    import importlib.util
    from pathlib import Path

    spec = importlib.util.spec_from_file_location(
        "compile_schematron", "scripts/compile-schematron.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    for name in (*module.STAGES, "iso_schematron_skeleton_for_saxon.xsl"):
        path = Path("vendor/iso-schematron") / name
        assert path.is_file(), f"lipseste {path}"
        root = etree.parse(str(path)).getroot()
        assert etree.QName(root).localname in ("stylesheet", "transform")


def test_intrarea_e_schema_care_include_nu_un_fragment(tmp_path):
    """Arhiva are si fragmente (`<pattern>` la radacina, incluse de altcineva) si
    variante aplatizate. Punctul de intrare e `<schema>`-ul care le aduna: doar
    el acopera si regulile EN 16931, si pe cele RO."""
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "compile_schematron", "scripts/compile-schematron.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    sch = "http://purl.oclc.org/dsdl/schematron"
    (tmp_path / "cius-ro").mkdir()
    (tmp_path / "preprocessed").mkdir()
    (tmp_path / "cius-ro" / "RO16931-rules.sch").write_text(
        f'<pattern xmlns="{sch}" id="ROmodel"/>')
    (tmp_path / "preprocessed" / "aplatizat.sch").write_text(
        f'<schema xmlns="{sch}" queryBinding="xslt2"/>')
    master = tmp_path / "EN16931-CIUS_RO-UBL-validation.sch"
    master.write_text(f'<schema xmlns="{sch}" queryBinding="xslt2">'
                      '<include href="cius-ro/RO16931-rules.sch"/></schema>')

    assert module.find_master(tmp_path) == master
