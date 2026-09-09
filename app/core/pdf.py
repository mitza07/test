"""Randarea reprezentarii grafice a facturii.

PDF-ul are rol INFORMATIV. Originalul legal e XML-ul semnat de ANAF, din ZIP-ul
descarcat din SPV (constrangerea 15). Ce se randeaza aici e ce vede omul, nu ce
conteaza in fata inspectiei.

## Imutabilitatea acopera si reprezentarea

Constrangerea 7: o factura veche NU se regenereaza cu logo sau sablon nou. Daca
ai schimbat antetul in martie, factura din ianuarie trebuie sa arate in continuare
ca in ianuarie. De aceea:

  - sabloanele sunt VERSIONATE, in directoare separate, si nu se editeaza dupa ce
    au randat prima factura;
  - la emitere se salveaza PDF-ul, hash-ul lui si versiunea sablonului;
  - regenerarea unei facturi emise foloseste versiunea inregistrata pe ea, nu pe
    cea curenta.

## Fonturi

`decizii.md`: Liberation si DejaVu au probleme cu s si t cu virgula (U+0219,
U+021B) — le deseneaza cu sedila sau le inlocuiesc din alt font, cu alt desen.
Noto Sans le are corect. De asta Dockerfile-ul instaleaza `fonts-noto-core` si
`fonts-noto-extra`, iar `FONT_STACK` incepe cu Noto Sans.

Nu e o preferinta estetica: un „Constanța" scris cu sedila pe o factura tiparita
arata a greseala si e greseala.

## Nu in procesul API

WeasyPrint blocheaza firul principal prin operatiuni native C (Pango, Cairo,
libxml2). Ruleaza EXCLUSIV in worker — vezi `app.workers.pdf`. Modulul asta doar
stie sa randeze; nu decide unde.
"""

from __future__ import annotations

import hashlib
import os
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, date, datetime, time
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.rounding import q2

TEMPLATE_ROOT = Path(__file__).resolve().parents[1] / "templates" / "invoice"

# Versiunea curenta. Se INCREMENTEAZA cand se schimba sablonul; nu se editeaza
# una existenta dupa ce a randat o factura emisa.
CURRENT_TEMPLATE_VERSION = "v1"

# Ordinea conteaza. Noto Sans primul: are s si t cu VIRGULA, nu cu sedila.
FONT_STACK = "'Noto Sans', 'Noto Sans Display', sans-serif"

# Caracterele care despart un font bun de unul aproape bun, pentru romana.
ROMANIAN_EXTENDED = "ăâîșțĂÂÎȘȚ"

# Mecanismul documentat de WeasyPrint pentru iesire reproductibila.
SOURCE_DATE_EPOCH = "SOURCE_DATE_EPOCH"


class TemplateNotFound(LookupError):
    pass


@dataclass(frozen=True)
class RenderedPdf:
    content: bytes
    sha256: str
    template_version: str

    @property
    def size(self) -> int:
        return len(self.content)


def available_versions() -> list[str]:
    if not TEMPLATE_ROOT.is_dir():
        return []
    return sorted(path.name for path in TEMPLATE_ROOT.iterdir()
                  if path.is_dir() and (path / "factura.html").exists())


@lru_cache(maxsize=8)
def _environment(version: str):
    from jinja2 import Environment, FileSystemLoader, select_autoescape

    directory = TEMPLATE_ROOT / version
    if not (directory / "factura.html").exists():
        raise TemplateNotFound(
            f"Sablonul '{version}' nu exista in {TEMPLATE_ROOT}. "
            f"Versiuni disponibile: {available_versions() or 'niciuna'}.")
    environment = Environment(
        loader=FileSystemLoader(str(directory)),
        # Autoescape peste tot: numele de client si descrierile de linie sunt
        # text introdus de om si ajung direct in HTML.
        autoescape=select_autoescape(default=True, default_for_string=True),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    environment.filters["bani"] = format_amount
    environment.filters["cantitate"] = format_quantity
    environment.filters["data"] = format_date
    return environment


def format_amount(value: Any) -> str:
    """1234.5 -> '1.234,50'. Separatorul zecimal romanesc e virgula.

    Rotunjirea trece prin `rounding.q2`, aceeasi functie care produce sumele din
    UBL. Cu `quantize` implicit (ROUND_HALF_EVEN), 0,005 s-ar afisa 0,00 in PDF
    si 0,01 in XML — adica reprezentarea grafica ar contrazice documentul fiscal
    cu un ban, exact genul de diferenta care ajunge la un control.
    """
    quantized = q2(Decimal(str(value or 0)))
    whole, _, fraction = f"{abs(quantized):.2f}".partition(".")
    grouped = f"{int(whole):,}".replace(",", ".")
    sign = "-" if quantized < 0 else ""
    return f"{sign}{grouped},{fraction}"


def format_quantity(value: Any) -> str:
    number = Decimal(str(value or 0)).normalize()
    text = format(number, "f")
    return text.replace(".", ",")


def format_date(value: Any) -> str:
    if isinstance(value, date):
        return value.strftime("%d.%m.%Y")
    return str(value or "")


def render_html(document: dict[str, Any], *,
                version: str = CURRENT_TEMPLATE_VERSION) -> str:
    """HTML-ul, fara PDF. Util pentru previzualizare in interfata si pentru teste."""
    template = _environment(version).get_template("factura.html")
    return template.render(doc=document, font_stack=FONT_STACK, version=version)


@contextmanager
def _reproducible(issue_date: date | None):
    """Face randarea deterministica.

    WeasyPrint scrie data curenta in metadatele PDF-ului, deci doua randari ale
    aceleiasi facturi dau octeti diferiti. Cu `rendered_pdf_sha256` folosit ca
    verificare de integritate, asta ar insemna alarma falsa la fiecare
    re-randare — si un hash care nu demonstreaza nimic.

    `SOURCE_DATE_EPOCH` e mecanismul documentat de WeasyPrint pentru iesire
    reproductibila. Se ancoreaza la data emiterii, nu la „acum": PDF-ul devine
    functie pura de (date, versiune de sablon), exact ce cere constrangerea 7.

    Variabila e globala pe proces. Randarea ruleaza intr-un worker RQ, care ia
    un job pe rand, deci nu se suprapun doua randari in acelasi proces.
    """
    stamp = str(int(datetime.combine(
        issue_date or date(2000, 1, 1), time.min, tzinfo=UTC).timestamp()))
    previous = os.environ.get(SOURCE_DATE_EPOCH)
    os.environ[SOURCE_DATE_EPOCH] = stamp
    try:
        yield
    finally:
        if previous is None:
            os.environ.pop(SOURCE_DATE_EPOCH, None)
        else:
            os.environ[SOURCE_DATE_EPOCH] = previous


def render(document: dict[str, Any], *,
           version: str = CURRENT_TEMPLATE_VERSION) -> RenderedPdf:
    """PDF-ul, cu hash-ul lui.

    Doua randari ale aceleiasi facturi cu acelasi sablon dau acelasi document,
    octet cu octet. Fara asta, hash-ul stocat nu ar putea detecta o modificare
    de sablon — singurul lucru pentru care exista.
    """
    from weasyprint import HTML

    html = render_html(document, version=version)
    with _reproducible(document.get("issue_date")):
        content = HTML(string=html,
                       base_url=str(TEMPLATE_ROOT / version)).write_pdf()
    return RenderedPdf(
        content=content,
        sha256=hashlib.sha256(content).hexdigest(),
        template_version=version,
    )


def retention_deadline(issue_date: date) -> date:
    """`retain_until`: 1 iulie a anului urmator exercitiului financiar, plus 5 ani.

    Art. 25 din Legea contabilitatii 82/1991, cu termenul redus de la 10 la 5 ani
    prin Legea 36/2023. Exceptie: situatiile financiare raman 10 ani
    (art. 28 alin. 2¹) — dar alea nu trec pe aici.

    O factura din 2026 se pastreaza pana la 1 iulie 2032.
    """
    return date(issue_date.year + 1 + 5, 7, 1)
