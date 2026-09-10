# Artefactele de validare

Nu se comit, se descarca. Sunt versionate de ANAF si de OASIS, independent de
codul asta, si se schimba cand se schimba legislatia. Folderul e in `.gitignore`;
doar fisierul de fata ramane.

Structura finala, dupa cei trei pasi de mai jos:

    schematron/
      ro16931-ubl-1.0.9/
        EN16931-CIUS_RO-UBL-validation.sch    <- din arhiva ANAF
        EN16931-CIUS_RO-UBL-validation.xsl    <- produs de scriptul de compilare
        abstract/ UBL/ codelist/ cius-ro/ preprocessed/
      ubl-2.1/
        xsd/maindoc/UBL-Invoice-2.1.xsd       <- de la OASIS
        xsd/common/

`SCHEMATRON_PATH` arata catre `schematron/`, adica radacina — nu catre
subdirectorul arhivei. Cautarea din `app/core/ubl/schematron.py` e recursiva,
deci ambele seturi trebuie sa fie sub aceeasi radacina.

## 1. Schematronul CIUS-RO

Arhiva `ro16931-ubl-1.0.9.zip` de la
[mfinante.gov.ro/web/efactura/informatii-tehnice](https://mfinante.gov.ro/web/efactura/informatii-tehnice),
despachetata in `schematron/`. Verifica versiunea inainte: 1.0.9 e in vigoare din
05.06.2024, dar se schimba.

## 2. Compilarea

**Arhiva contine doar sursele `.sch`, nu si XSLT-ul.** Sase fisiere legate prin
`<include>`, cu tipare abstracte neexpandate. Nu e nimic rulabil in ea.

    python scripts/compile-schematron.py

Rezultatul, `EN16931-CIUS_RO-UBL-validation.xsl` (~1,1 MB), sta langa sursa si e
preferat automat: `discover()` cauta intai `*.xslt`/`*.xsl` si abia apoi `.sch`.

Se ruleaza o data dupa despachetare, si din nou la fiecare versiune noua de la
ANAF. **Nu se compileaza la pornirea aplicatiei** — dureaza secunde bune si
rezultatul e identic de fiecare data.

Scriptul foloseste scheletul ISO Schematron din `vendor/iso-schematron/`, care e
in repo (vezi README-ul de acolo). Ii trebuie `saxonche`, deja in
`requirements.txt`.

## 3. XSD-ul UBL, optional dar recomandat

Nu vine in arhiva CIUS-RO. Se ia din distributia OASIS:

    curl -O https://docs.oasis-open.org/ubl/os-UBL-2.1/UBL-2.1.zip
    unzip UBL-2.1.zip 'xsd/maindoc/UBL-Invoice-2.1.xsd' \
                      'xsd/maindoc/UBL-CreditNote-2.1.xsd' \
                      'xsd/common/*' -d schematron/ubl-2.1/

Arhiva e de 58 MB; din ea ne trebuie ~3. `check()` ruleaza XSD-ul INAINTEA
regulilor si se opreste daca pica: intr-un document cu structura gresita,
rezultatele schematronului descriu ceva ce ANAF n-ar citi oricum. Aici pica
ordinea gresita a elementelor, cu mesaj in engleza despre secvente XML — de-asta
merita rulat primul.

## De ce iti trebuie un procesor XSLT 2.0

Schematroanele EN 16931, deci si CIUS-RO, folosesc `queryBinding="xslt2"`.

**libxslt, motorul din spatele lxml, implementeaza doar XSLT 1.0** si refuza
direct:

    XSLTApplyError: This implementation of ISO Schematron does not work with
    schemas using the "xslt2" query language.

De aceea `saxonche` (SaxonC-HE, wheel binar din pip, fara Java) e in
`requirements.txt`. Fara el, `schematron.available()` da False si validarea nu
ruleaza — nu esueaza tacut.

## Verificare

    SCHEMATRON_PATH=./schematron pytest tests/test_ubl_schematron.py -v

15 teste, toate trec. Doua sunt marcate `skipif` si se activeaza abia cand
artefactele sunt pe disc:

- `test_factura_valida_trece_schematronul_oficial` — o factura generata de noi
  trece si XSD-ul, si toate regulile EN 16931 + CIUS-RO.
- `test_bucuresti_fara_sector_pica_si_la_schematron` — contra-proba. Fara ea,
  primul test ar trece si cu artefactele incarcate degeaba.

Cand artefactele lipsesc, functiile ridica `FileNotFoundError` si cele doua teste
se sar. Nu exista varianta in care lipsa artefactelor sa arate ca o validare
trecuta.
