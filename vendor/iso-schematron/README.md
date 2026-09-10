# ISO Schematron skeleton, XSLT 2.0

Implementarea de referinta a ISO Schematron: transforma un `.sch` intr-un XSLT
care, aplicat pe un document, produce SVRL. Autor Rick Jelliffe, dupa scheletul
lui Oliver Becker. Licenta MIT, antetul din fiecare fisier.

Sursa: <https://github.com/Schematron/schematron>, `trunk/schematron/code/`.

## De ce sta in repo

Arhiva oficiala `ro16931-ubl-1.0.9` de la ANAF contine DOAR sursele `.sch`, nu si
XSLT-ul compilat. Fara scheletul asta nu exista drum de la ce livreaza ANAF la
ceva rulabil — nici pe server, nici in CI.

Ar fi putut fi descarcat la compilare, dar atunci validarea ar depinde de un
depozit tert la fiecare build, pe o ramura fara versiuni. 187 KB nu justifica
riscul.

## Cele patru fisiere

Sunt etapele conductei, in ordine:

| fisier | ce face |
|---|---|
| `iso_dsdl_include.xsl` | rezolva `<include href="...">` — aici se aduna cele sase fisiere ale arhivei intr-unul |
| `iso_abstract_expand.xsl` | expandeaza tiparele abstracte in reguli concrete |
| `iso_svrl_for_xslt2.xsl` | produce XSLT-ul final, cel care scrie SVRL |
| `iso_schematron_skeleton_for_saxon.xsl` | importat de precedentul; nu se ruleaza singur |

Se folosesc prin `scripts/compile-schematron.py`, nu direct.

## Actualizare

Se inlocuiesc toate patru odata, din acelasi commit — se importa reciproc si
versiuni amestecate esueaza greu de diagnosticat. Dupa inlocuire, recompileaza si
ruleaza `SCHEMATRON_PATH=./schematron pytest tests/test_ubl_schematron.py`.
