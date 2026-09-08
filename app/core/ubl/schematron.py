"""Validare cu artefactele oficiale: XSD-ul OASIS si schematronul CIUS-RO.

Asta e validarea care conteaza. `app.core.validation.br_ro` e prima plasa — prinde
90% din respingeri direct in formular, cu mesaj in romana, inainte sa se consume
un numar de serie. Modulul de fata e a doua plasa si singurul verdict autoritar
in afara ANAF-ului insusi.

Artefactele NU sunt in repo: se descarca de la
mfinante.gov.ro/web/efactura/informatii-tehnice si se pun in `SCHEMATRON_PATH`
(vezi schematron/README.md). Sunt versionate independent de codul asta —
`ro16931-ubl-1.0.9` e in vigoare din 05.06.2024, dar se schimba.

## De ce nu e de ajuns lxml

Schematroanele EN 16931, deci si CIUS-RO, folosesc `queryBinding="xslt2"`, iar
XSLT-urile precompilate din arhivele oficiale sunt XSLT 2.0. libxslt, motorul din
spatele lxml, implementeaza doar XSLT 1.0 si refuza explicit:

    XSLTApplyError: This implementation of ISO Schematron does not work with
    schemas using the "xslt2" query language.

Deci ne trebuie un procesor XSLT 2.0+. `saxonche` (SaxonC-HE, din pip, fara Java)
il face si e in requirements.txt. lxml ramane pentru artefacte XSLT 1.0, daca
apar vreodata.

Cand artefactele sau procesorul lipsesc, functiile ridica exceptie si testele se
sar singure. Un fals „totul e in regula" ar fi mai rau decat un test sarit.
"""

from __future__ import annotations

import atexit
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from lxml import etree

from app.core.validation.br_ro import Report

DEFAULT_PATH = "/data/schematron/ro16931-ubl-1.0.9"

SVRL_NS = "http://purl.oclc.org/dsdl/svrl"
XSLT_NS = "http://www.w3.org/1999/XSL/Transform"
SCH_NS = "http://purl.oclc.org/dsdl/schematron"


class ProcessorUnavailable(RuntimeError):
    """Artefactul cere un procesor XSLT pe care nu il avem."""


@dataclass(frozen=True)
class Artifacts:
    """Ce s-a gasit pe disc. Oricare poate lipsi independent."""

    xslt: Path | None          # schematron precompilat, produce SVRL
    schematron: Path | None    # sursa .sch, daca nu exista compilatul
    xsd: Path | None           # schema OASIS UBL, pentru validarea pe structura

    @property
    def can_check_rules(self) -> bool:
        return self.xslt is not None or self.schematron is not None

    @property
    def can_check_schema(self) -> bool:
        return self.xsd is not None


def artifacts_root(root: str | Path | None = None) -> Path:
    """Directorul cu artefacte.

    Se citeste din mediu direct, nu prin `app.config.Settings`: modulul trebuie sa
    fie importabil in teste, fara DATABASE_URL si TOKEN_ENCRYPTION_KEY setate.
    """
    if root is not None:
        return Path(root)
    return Path(os.environ.get("SCHEMATRON_PATH", DEFAULT_PATH))


@lru_cache(maxsize=8)
def discover(root: str | None = None) -> Artifacts:
    """Cauta artefactele.

    Rezultatul e memorat per cale. Daca pui artefactele dupa primul apel,
    cheama `discover.cache_clear()`.
    """
    base = artifacts_root(root)
    if not base.is_dir():
        return Artifacts(None, None, None)

    def first(pattern: str, *, contains: str | None = None) -> Path | None:
        for candidate in sorted(base.rglob(pattern)):
            if contains is None or contains in candidate.name.lower():
                return candidate
        return None

    # Se prefera XSLT-ul precompilat: compilarea schematronului CIUS-RO costa
    # secunde bune, iar arhiva oficiala il livreaza gata compilat.
    xslt = first("*.xslt") or first("*.xsl")
    schematron = first("*.sch")
    xsd = first("UBL-Invoice-2.1.xsd") or first("*.xsd", contains="invoice")
    return Artifacts(xslt=xslt, schematron=schematron, xsd=xsd)


def available(root: str | None = None) -> bool:
    """True daca se poate rula efectiv validarea pe reguli — artefacte SI procesor.

    Nu raspunde „da" cand artefactele exista dar nu avem cu ce sa le rulam:
    altfel testele s-ar activa ca sa pice din alt motiv.
    """
    found = discover(root)
    if not found.can_check_rules:
        return False
    try:
        _check_processor(found)
    except ProcessorUnavailable:
        return False
    return True


# --- procesoare XSLT -------------------------------------------------------

def _xslt_version(path: Path) -> str:
    """Versiunea declarata de stylesheet. '1.0' merge cu lxml, restul nu."""
    for _, element in etree.iterparse(str(path), events=("start",)):
        return element.get("version") or "1.0"
    return "1.0"


def _query_binding(path: Path) -> str:
    for _, element in etree.iterparse(str(path), events=("start",)):
        return (element.get("queryBinding") or "xslt1").lower()
    return "xslt1"


def _saxon_available() -> bool:
    try:
        import saxonche  # noqa: F401
    except ImportError:
        return False
    return True


def _check_processor(found: Artifacts) -> None:
    """Ridica ProcessorUnavailable daca artefactul nu poate fi rulat aici."""
    if found.xslt is not None:
        if _xslt_version(found.xslt) == "1.0" or _saxon_available():
            return
        raise ProcessorUnavailable(
            f"{found.xslt.name} este XSLT {_xslt_version(found.xslt)}, iar libxslt "
            "(lxml) implementeaza doar 1.0. Instaleaza `saxonche` "
            "(este in requirements.txt)."
        )
    if found.schematron is not None:
        binding = _query_binding(found.schematron)
        if binding in ("xslt", "xslt1"):
            return
        raise ProcessorUnavailable(
            f"{found.schematron.name} foloseste queryBinding='{binding}', pe care "
            "lxml.isoschematron nu il suporta. Foloseste XSLT-ul precompilat din "
            "arhiva oficiala, sau compileaza .sch-ul cu Saxon."
        )


@lru_cache(maxsize=2)
def _saxon_processor():
    from saxonche import PySaxonProcessor

    # Procesorul e scump de creat si se reutilizeaza; nu se inchide intre apeluri.
    processor = PySaxonProcessor(license=False)
    # SaxonC e o imagine nativa GraalVM. Colectat la iesirea interpretorului,
    # scrie zgomot pe stderr („Error in sys.excepthook"). Golirea cache-urilor
    # din atexit ii da drumul cat timp interpretorul e inca viu, si atunci se
    # inchide curat. NU folosi `detach_current_thread` — produce
    # „Fatal error: Must either be at a safepoint or in native mode".
    atexit.register(_release_saxon)
    return processor


def _release_saxon() -> None:
    """Obiectele compilate se elibereaza inaintea procesorului care le-a creat."""
    _saxon_stylesheet.cache_clear()
    _saxon_processor.cache_clear()


@lru_cache(maxsize=4)
def _saxon_stylesheet(xslt_path: str):
    processor = _saxon_processor()
    return processor.new_xslt30_processor().compile_stylesheet(stylesheet_file=xslt_path)


@lru_cache(maxsize=4)
def _lxml_transform(xslt_path: str) -> etree.XSLT:
    return etree.XSLT(etree.parse(xslt_path))


def _apply_xslt(xslt_path: Path, document: etree._Element) -> etree._Element:
    """Aplica stylesheet-ul si intoarce SVRL-ul, indiferent de procesor."""
    if _xslt_version(xslt_path) == "1.0":
        result = _lxml_transform(str(xslt_path))(document)
        return result.getroot()

    if not _saxon_available():
        raise ProcessorUnavailable(
            f"{xslt_path.name} este XSLT {_xslt_version(xslt_path)}; instaleaza "
            "`saxonche` pentru a-l rula."
        )
    processor = _saxon_processor()
    stylesheet = _saxon_stylesheet(str(xslt_path))
    source = processor.parse_xml(xml_text=etree.tostring(document, encoding="unicode"))
    svrl = stylesheet.transform_to_string(xdm_node=source)
    return etree.fromstring(svrl.encode("utf-8"))


# --- validare --------------------------------------------------------------

def _parse(xml: bytes | str | etree._Element) -> etree._Element:
    if isinstance(xml, etree._Element):
        return xml
    if isinstance(xml, str):
        xml = xml.encode("utf-8")
    return etree.fromstring(xml)


def check_schema(xml: bytes | str | etree._Element,
                 root: str | None = None) -> Report:
    """Validare pe XSD. Aici pica ordinea gresita a elementelor.

    Mesajele sunt in engleza si vorbesc despre secvente XML, nu despre BT-uri —
    de-asta merita rulata inaintea schematronului: o eroare de structura face
    restul rezultatelor irelevante.
    """
    report = Report()
    found = discover(root)
    if not found.can_check_schema:
        raise FileNotFoundError(
            f"XSD-ul UBL nu a fost gasit sub {artifacts_root(root)}. "
            "Vezi schematron/README.md."
        )
    schema = etree.XMLSchema(etree.parse(str(found.xsd)))
    document = _parse(xml)
    if schema.validate(etree.ElementTree(document)):
        return report
    for error in schema.error_log:
        report.add("XSD", error.path or "/", error.message)
    return report


def check_rules(xml: bytes | str | etree._Element, root: str | None = None) -> Report:
    """Validare cu schematronul CIUS-RO. Rezultatul are aceeasi forma ca al
    validatorului local, ca interfata sa nu stie de unde vine o eroare."""
    found = discover(root)
    if not found.can_check_rules:
        raise FileNotFoundError(
            f"Schematronul nu a fost gasit sub {artifacts_root(root)}. "
            "Descarca `ro16931-ubl-1.0.9` — vezi schematron/README.md."
        )
    _check_processor(found)
    document = _parse(xml)

    if found.xslt is not None:
        return _from_svrl(_apply_xslt(found.xslt, document))

    from lxml.isoschematron import Schematron

    validator = Schematron(etree.parse(str(found.schematron)), store_report=True)
    validator.validate(document)
    return _from_svrl(validator.validation_report.getroot())


def _from_svrl(svrl: etree._Element | None) -> Report:
    """Traduce SVRL in Report.

    `failed-assert` e eroare, `successful-report` e de obicei avertizare — dar
    `flag`/`role` au ultimul cuvant: schematronul CIUS-RO marcheaza si asertii
    ca `warning`.
    """
    report = Report()
    if svrl is None:
        return report

    for element in svrl.iter():
        tag = etree.QName(element).localname
        if tag not in ("failed-assert", "successful-report"):
            continue
        flag = (element.get("flag") or element.get("role") or "").lower()
        if flag in ("warning", "warn", "info"):
            severity = "warning"
        elif flag in ("fatal", "error"):
            severity = "fatal"
        else:
            severity = "fatal" if tag == "failed-assert" else "warning"

        text_node = element.find(f"{{{SVRL_NS}}}text")
        message = " ".join((text_node.text or "").split()) if text_node is not None else ""
        rule = element.get("id") or _rule_from_message(message) or "SCHEMATRON"
        report.add(rule, element.get("location") or "/", message, severity=severity)
    return report


def _rule_from_message(message: str) -> str | None:
    """Codul regulii e de obicei primul cuvant din mesaj: `[BR-RO-101]-...`."""
    stripped = message.lstrip("[")
    for separator in ("]", ":", " "):
        head, found, _ = stripped.partition(separator)
        if found and head.startswith(("BR-", "PEPPOL-", "UBL-")):
            return head
    return None


def check(xml: bytes | str | etree._Element, root: str | None = None) -> Report:
    """Schema si reguli, in ordinea in care conteaza.

    Daca structura e gresita, regulile nu se mai ruleaza: rezultatele lor ar
    descrie un document pe care ANAF nici nu l-ar citi.
    """
    found = discover(root)
    if found.can_check_schema:
        schema_report = check_schema(xml, root)
        if not schema_report.ok:
            return schema_report
    return check_rules(xml, root)
