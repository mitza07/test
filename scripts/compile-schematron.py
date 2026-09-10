#!/usr/bin/env python3
"""Compileaza schematronul CIUS-RO in XSLT-ul care produce SVRL.

DE CE EXISTA: arhiva oficiala `ro16931-ubl-1.0.9` de la ANAF contine doar
sursele `.sch`, imprastiate in sase fisiere legate prin `<include>`, cu
`queryBinding="xslt2"`. Nu e nimic rulabil in ea.

`lxml.isoschematron` nu poate prelua treaba: libxslt implementeaza XSLT 1.0 si
refuza explicit `xslt2`. Deci compilarea se face cu Saxon, prin scheletul ISO
Schematron din `vendor/iso-schematron/` — trei etape, in ordine:

    .sch -> include-uri rezolvate -> tipare abstracte expandate -> XSLT/SVRL

Rezultatul se scrie langa sursa, cu extensia `.xsl`. `app/core/ubl/schematron.py`
il prefera automat: cauta intai `*.xslt`/`*.xsl` si abia apoi `.sch`.

Se ruleaza o singura data dupa despachetarea arhivei, si din nou cand ANAF
publica o versiune noua. Compilarea dureaza cateva secunde; de-asta nu se face
la pornirea aplicatiei.

Utilizare:
    python scripts/compile-schematron.py                 # cauta sub SCHEMATRON_PATH
    python scripts/compile-schematron.py cale/catre.sch  # sursa explicita
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

SCH_NS = "http://purl.oclc.org/dsdl/schematron"

# Ordinea conteaza: fiecare etapa consuma iesirea precedentei.
STAGES = ("iso_dsdl_include.xsl", "iso_abstract_expand.xsl", "iso_svrl_for_xslt2.xsl")

SKELETON = Path(__file__).resolve().parent.parent / "vendor" / "iso-schematron"


def find_master(root: Path) -> Path:
    """Fisierul de intrare: schematronul care le include pe celelalte.

    Arhiva are si fragmente (`<pattern>` la radacina, incluse de altcineva) si
    variante deja aplatizate in `preprocessed/`. Se cauta un `<schema>` complet,
    cel mai apropiat de radacina: acela e punctul de intrare pe care ANAF il
    documenteaza, si singurul care aduce si regulile EN 16931 si pe cele RO.
    """
    from lxml import etree

    candidates: list[tuple[int, Path]] = []
    for path in sorted(root.rglob("*.sch")):
        try:
            for _, element in etree.iterparse(str(path), events=("start",)):
                if etree.QName(element).localname == "schema":
                    candidates.append((len(path.relative_to(root).parts), path))
                break
        except etree.XMLSyntaxError:
            continue
    if not candidates:
        raise SystemExit(f"Niciun .sch cu radacina <schema> sub {root}.")
    # La adancime egala, cel care include altele bate o varianta aplatizata.
    def rank(item: tuple[int, Path]) -> tuple[int, int, str]:
        depth, path = item
        includes = path.read_bytes().count(b"<include")
        return (depth, -includes, path.name)

    return min(candidates, key=rank)[1]


def compile_schematron(source: Path, skeleton: Path = SKELETON) -> Path:
    from saxonche import PySaxonProcessor

    missing = [name for name in STAGES if not (skeleton / name).is_file()]
    if missing:
        raise SystemExit(f"Lipsesc din {skeleton}: {', '.join(missing)}")

    output = source.with_suffix(".xsl")
    with PySaxonProcessor(license=False) as processor:
        xslt = processor.new_xslt30_processor()
        with tempfile.TemporaryDirectory() as scratch:
            current = source
            for index, name in enumerate(STAGES, start=1):
                # Prima etapa citeste DIN LOCUL EI: `iso_dsdl_include` rezolva
                # href-urile relative fata de base URI, deci sursa trebuie sa
                # ramana langa fisierele pe care le include. Etapele urmatoare
                # lucreaza pe un document deja aplatizat, deci pot sta oriunde.
                destination = (output if index == len(STAGES)
                               else Path(scratch) / f"{index}.sch")
                executable = xslt.compile_stylesheet(
                    stylesheet_file=str(skeleton / name))
                executable.transform_to_file(source_file=str(current),
                                             output_file=str(destination))
                if executable.exception_occurred:
                    raise SystemExit(f"{name}: {executable.error_message}")
                print(f"  {name:36} -> {destination.name}")
                current = destination
    return output


def main(argv: list[str]) -> int:
    if len(argv) > 1:
        source = Path(argv[1]).resolve()
        if not source.is_file():
            raise SystemExit(f"{source} nu exista.")
    else:
        root = Path(os.environ.get("SCHEMATRON_PATH", "./schematron")).resolve()
        if not root.is_dir():
            raise SystemExit(
                f"{root} nu exista. Despacheteaza acolo arhiva `ro16931-ubl-1.0.9` "
                "de la mfinante.gov.ro/web/efactura/informatii-tehnice — vezi "
                "schematron/README.md."
            )
        source = find_master(root)

    print(f"Sursa: {source}")
    output = compile_schematron(source)
    print(f"\nGata: {output} ({output.stat().st_size // 1024} KB)\n\n"
          f"Verifica:\n  SCHEMATRON_PATH={os.environ.get('SCHEMATRON_PATH', './schematron')} "
          "pytest tests/test_ubl_schematron.py -v")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
