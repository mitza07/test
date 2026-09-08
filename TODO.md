# Ordinea de atac

Fiecare punct se termina cu teste care trec. Nu treci mai departe altfel.

## 0. Setup (o data)

- [ ] `cp .env.example .env` si completeaza
- [ ] `docker compose -f docker-compose.dev.yml up -d db redis`
- [ ] `alembic upgrade head`
- [ ] `pytest` — testele existente trebuie sa treaca

## 1. Nucleul de calcul si validare — PRIMUL, inainte de orice UI

Aici e toata valoarea. Daca astea sunt corecte, restul e munca obisnuita.

- [ ] `app/core/rounding.py` — rotunjire pe linie la 2 zecimale, TVA pe baza agregata
      per cota. Teste: cazul 3 x 0,03 la 21%.
- [ ] `app/core/validation/cui.py` — checksum CUI (cheia 753217532) si CNP.
- [ ] `app/core/validation/holidays.py` — sarbatori legale RO, Paste ortodox calculat.
- [ ] `app/core/validation/deadline.py` — 5 zile lucratoare de la emitere.
- [ ] `app/core/validation/br_ro.py` — cele 30 de reguli din `docs/efactura_spec.md` §3.
      Fiecare regula returneaza cod (`BR-RO-100`), severitate, camp si mesaj in romana.
- [ ] Teste pentru fiecare caz de esec: Bucuresti fara sector, 3 zecimale, CUI cu spatiu,
      CUI cu cifra de control gresita, linie fara TaxCode, moneda != RON fara TaxCurrency.

## 2. Generatorul UBL

- [ ] `app/core/ubl/generator.py` — UBL 2.1 / CIUS-RO din modelul de date.
      Atentie la ORDINEA elementelor: XSD-ul OASIS impune secventa fixa.
- [ ] Validare locala cu schematronul oficial (`ro16931-ubl-1.0.9`, descarcat separat).
- [ ] Validare la endpointul public ANAF, fara OAuth:
      `POST https://webservicesp.anaf.ro/prod/FCTEL/rest/validare/FACT1`
- [ ] Teste: o factura simpla, una in EUR, una cu storno, una cu taxare inversa.

## 3. Numerotare si emitere

- [ ] `app/core/numbering.py` — `SELECT ... FOR UPDATE` pe `doc_series`, alocarea
      numarului DUPA ce validatorul trece.
- [ ] Emitere: draft -> validare -> alocare numar -> UBL -> PDF -> arhivare.
- [ ] Stergere: verificare "ultimul din serie" + fara `index_incarcare`, atomic.
- [ ] Storno: document nou cu `ref_kind='storno'` si BG-3 completat.
- [ ] Teste de concurenta: doua emiteri simultane pe aceeasi serie nu produc duplicat.

## 4. Integrarea ANAF

- [ ] `app/core/anaf/oauth.py` — flux authorization code, stocare criptata a tokenului,
      refresh automat, alerta la `refresh_expires_at - 14 zile`.
- [ ] `app/core/anaf/efactura.py` — upload, stareMesaj, descarcare, listaMesajeFactura.
- [ ] Rate limiting propriu: max 100 `stareMesaj`/zi/index, max 10 `descarcare`/zi/id.
- [ ] Stare `unknown` la timeout. Fara retrimitere automata.
- [ ] `download_deadline = sent_at + 60 zile`, cu alerta la 45.
- [ ] Testeaza pe `/test/` inainte de orice apel pe `/prod/`.

## 5. PDF si arhivare

- [ ] Sablon WeasyPrint, versionat. Font cu suport Romanian Extended (Noto Sans),
      NU Liberation sau DejaVu — au probleme cu s si t cu virgula.
- [ ] Rulare exclusiv in worker RQ, cu timeout si limita de memorie.
- [ ] La emitere: salveaza PDF-ul cu hash si `template_version`.
- [ ] `retain_until` = 1 iulie a anului urmator + 5 ani.

## 6. API si frontend

- [ ] Endpointuri REST pentru documente, clienti, produse, serii, incasari.
- [ ] Editor: grila operabila din tastatura. Tab, Enter linie noua, Ctrl+S ciorna,
      Ctrl+Enter verificare (NU emitere directa).
- [ ] Lista cu trei coloane de stare separate.
- [ ] Previzualizare PDF colapsata, generata dupa pauza, marcata cand e veche.

## 7. Recurente

- [ ] Sabloane cu client + linii + frecventa.
- [ ] Job de noapte: genereaza ciornele lunii si le trece prin validator.
- [ ] Dimineata: ecran de aprobare in bloc, doar documente pre-verificate.
- [ ] Emitere in lot cu tranzactie per document.

## 8. Export contabil

- [ ] CSV jurnal de vanzari.
- [ ] Sectiunile `SalesInvoices` si `Payments` pentru SAF-T D406, cu `TaxCode`
      si referinta e-Factura (`index_incarcare`).
- [ ] Arhiva ZIP lunara: PDF-uri + XML-uri semnate + recipise.

## Puncte deschise — de clarificat inainte sa le atingi

Vezi `docs/efactura_spec.md` §6. Cele care conteaza:
taxare inversa intracomunitara + VIES, GDPR, dobanda legala penalizatoare, D394.
