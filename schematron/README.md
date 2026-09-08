Descarca aici arhiva oficiala `ro16931-ubl-1.0.9` de la
mfinante.gov.ro/web/efactura/informatii-tehnice

Folderul e in .gitignore — artefactele nu se comit, se descarca.
Verifica versiunea inainte: 1.0.9 e in vigoare din 05.06.2024, dar se poate schimba.

## Ce cauta programul

`app/core/ubl/schematron.py` cauta recursiv sub `SCHEMATRON_PATH`, deci structura
interna a arhivei nu conteaza:

- `*.xslt` sau `*.xsl` — schematronul precompilat. Preferat: compilarea la fiecare
  pornire costa secunde bune.
- `*.sch` — sursa, folosita doar daca nu exista compilatul.
- `UBL-Invoice-2.1.xsd` — schema OASIS, pentru validarea pe structura. Nu vine in
  arhiva CIUS-RO; se ia separat de la OASIS, daca vrei si verificarea de ordine a
  elementelor inainte de reguli.

Cand nu gaseste nimic, functiile ridica `FileNotFoundError` si testele din
`tests/test_ubl_schematron.py` se sar singure. Nu exista varianta in care lipsa
artefactelor sa arate ca o validare trecuta.

## Iti trebuie un procesor XSLT 2.0

Schematroanele EN 16931, deci si CIUS-RO, folosesc `queryBinding="xslt2"`, iar
XSLT-urile precompilate din arhivele oficiale sunt XSLT 2.0.

**libxslt, motorul din spatele lxml, implementeaza doar XSLT 1.0** si refuza direct:

    XSLTApplyError: This implementation of ISO Schematron does not work with
    schemas using the "xslt2" query language.

De aceea `saxonche` (SaxonC-HE, wheel binar din pip, fara Java) este in
`requirements.txt`. Fara el, `schematron.available()` da False si validarea nu
ruleaza — nu esueaza tacut.

## Verificare rapida dupa descarcare

```
SCHEMATRON_PATH=./schematron pytest tests/test_ubl_schematron.py -v
```

Cele doua teste marcate `skipif` trebuie sa se activeze si sa treaca. Pana atunci,
ordinea elementelor din `app/core/ubl/sequence.py` ramane o ipoteza bine
documentata, nu un fapt verificat.
