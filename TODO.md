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

- [x] `app/core/ubl/generator.py` — UBL 2.1 / CIUS-RO din modelul de date.
      Invoice pentru 380/384/389/751, CreditNote pentru 381.
- [x] Ordinea elementelor, ca date verificabile in `app/core/ubl/sequence.py`,
      cu `violations()` care verifica un arbore intreg. TRANSCRISA din UBL 2.1,
      nu verificata inca pe XSD-ul oficial — vezi mai jos.
- [x] `app/core/ubl/schematron.py` — ruleaza artefactele oficiale, intoarce
      acelasi `Report` ca validatorul local.
- [ ] **Descarca `ro16931-ubl-1.0.9` in SCHEMATRON_PATH si ruleaza
      `pytest tests/test_ubl_schematron.py`.** Cele doua teste marcate `skipif`
      se activeaza singure. Pana atunci ordinea elementelor ramane o ipoteza.
      Vezi schematron/README.md — iti trebuie si `saxonche`, deja in
      requirements.txt: schematronul e XSLT 2.0, lxml face doar 1.0.
- [x] `app/core/anaf/validare.py` — endpointul public, fara OAuth. Esecul de
      retea da `ok=None`, nu `False`.
- [ ] Ruleaza o factura generata prin endpointul public ANAF, o data, manual.
- [x] Teste: o factura simpla, una in EUR, una cu storno, una cu taxare inversa.

## 3. Numerotare si emitere

- [x] **Rolul cu care se conecteaza aplicatia.** Doua roluri, doua URL-uri:
      `DATABASE_URL` pentru api/worker/scheduler, `ADMIN_DATABASE_URL` doar
      pentru alembic. Rolul aplicatiei e `NOSUPERUSER NOBYPASSRLS` si nu are
      drepturi de schema. `scripts/setup-db-roles.sh` il creeaza si verifica la
      final ca nu ocoleste RLS. In dev, `ADMIN_DATABASE_URL` poate lipsi.
      Ramane de rulat pe server, o data, inainte de primul `APP_ENV=prod`.
- [x] `app/core/numbering.py` — `SELECT ... FOR UPDATE` pe `doc_series`, alocarea
      numarului DUPA ce validatorul trece.
- [x] Emitere: `app/core/issue.py:issue()`. Ciorna -> validare -> alocare numar ->
      UBL -> job SPV cu termenul legal. Tot sub acelasi lock pe serie, deci nu
      exista fereastra intre „ce numar ar primi" si „il primeste".
      PDF-ul lipseste: e punctul 5.
- [x] `app/core/documents.py` — un singur dict intre baza de date, validator si
      generator. Instantaneele se ingheata la emitere (constrangerea 6 acopera
      si datele partilor).
- [x] Stergere: `issue.delete_document()`, prin `can_delete` in aceeasi tranzactie.
      Marcare, nu DELETE fizic.
- [x] Storno: `issue.create_storno()`. Cod 384 cu cantitati negate (pretul ramane
      pozitiv, BR-27), sau 381 nota de creditare cu cantitati pozitive. Rezultatul
      e ciorna: ia numar doar dupa ce valideaza, ca oricare alta.
- [x] Migratia 0004: ciorna nu are numar. Fara ea, a doua ciorna din aceeasi serie
      pica pe cheia unica — si atunci punctul 7 e imposibil de implementat.
- [x] Teste de concurenta: doua emiteri simultane pe aceeasi serie nu produc
      duplicat. `tests/test_numbering.py`, pe Postgres real, cu bariera care
      forteaza suprapunerea. Si varianta cu 10 fire. `numbering.py` era scris,
      dar nu fusese rulat niciodata pe o baza.

### Ramase de lamurit la punctul 3

- `PartyLegalEntity/CompanyID` cere numarul de la Registrul Comertului
  (`J40/1234/2020`, vezi specificatia sectiunea 1.6), dar schema nu are coloana
  pentru el: comentariul din `company` il pune in `bt33_legal_info`, amestecat cu
  capitalul social. Acum se scrie `bt32_legal_reg_id` (CUI-ul). Daca ANAF il vrea
  pe cel de la Registru, trebuie o coloana separata.
- PDF-ul si arhivarea din fluxul de emitere sunt la punctul 5. `issue()` creeaza
  jobul SPV, dar nu pune nimic in coada de randare.

## 4. Integrarea ANAF

- [x] `app/core/anaf/oauth.py` — flux authorization code, stocare criptata a tokenului
      (`app/core/crypto.py`, Fernet), refresh automat cu rotatia refresh tokenului,
      `expiring_soon()` pentru alerta la `refresh_expires_at - 14 zile`.
- [x] `app/core/anaf/efactura.py` — upload, stareMesaj, descarcare, listaMesajeFactura.
- [x] Rate limiting propriu: max 100 `stareMesaj`/zi/index, max 10 `descarcare`/zi/id.
      Contoarele stau in `efactura_job`, nu in memoria procesului: workerii sunt
      mai multi si repornesc.
- [x] Stare `unknown` la timeout. Fara retrimitere automata. `needs_resend_decision()`
      scoate lista care cere decizie de om; se lamureste cu `list_messages`.
- [x] `download_deadline = sent_at + 60 zile`, cu alerta la 45
      (`download_window_alerts`). Plus `transmission_overdue()` pentru termenul legal.
- [x] **Workerii care cheama toate astea.** `app/workers/`: cozile RQ (`queues.py`),
      joburile SPV (`spv.py`), alertele (`alerts.py`) si programatorul
      (`scheduler.py` — exact ce porneste serviciul `scheduler` din
      docker-compose.prod.yml, care pana acum nu exista).
- [x] `app/db.py` — engine, `tenant_session()` care fixeaza firma pe fiecare
      tranzactie, si verificarea RLS la pornire: refuza in prod, avertizeaza in dev.
- [ ] **Testeaza pe `/test/` inainte de orice apel pe `/prod/`.** Cere certificatul
      pe token USB si o autorizare in browser — nu se poate automatiza.

## 5. PDF si arhivare

- [x] Sablon WeasyPrint versionat, in `app/templates/invoice/v1/`. Nu se editeaza
      dupa ce a randat o factura emisa; pentru o schimbare se copiaza in v2.
- [x] Noto Sans, verificat pe PDF-ul randat, nu doar declarat in CSS. Testul a
      prins doua esecuri tacute: autoescape strica stiva de fonturi, iar cutia
      `@bottom-center` din `@page` nu mosteneste de la `body`.
- [x] `app/workers/pdf.py` — coada `pdf`, separata, cu `job_timeout` propriu.
      Nu ruleaza niciodata in procesul API.
- [x] La emitere: `rendered_pdf_sha256` + `template_version` pe document, plus
      intrare in `archive_entry` cu `is_legal_original = false` (originalul e
      XML-ul semnat de ANAF).
- [x] `retain_until` = 1 iulie a anului urmator + 5 ani (`pdf.retention_deadline`).
- [ ] Limita de memorie pe worker: e in `docker-compose.prod.yml` (`deploy.resources`),
      dar nu e verificata nicaieri si Docker Compose fara Swarm o ignora.

## 6. API si frontend

- [x] Endpointuri REST pentru documente, clienti, produse, serii, incasari.
- [ ] Editor: grila operabila din tastatura. Tab, Enter linie noua, Ctrl+S ciorna,
      Ctrl+Enter verificare (NU emitere directa).
- [ ] Lista cu trei coloane de stare separate.
- [ ] Previzualizare PDF colapsata, generata dupa pauza, marcata cand e veche.

## 7. Recurente

- [x] Sabloane cu client + linii + frecventa (migratia 0005, `app/core/recurring.py`).
      `day_of_month` e limitat la 28: cu 31, februarie ar fi sarita tacut.
- [x] Job de noapte: `recurring.generate_all()`, in scheduler. Genereaza ciornele
      SI le trece prin validator. Idempotent prin `UNIQUE (template_id, period)`,
      nu prin disciplina — o repornire sau o restaurare din backup nu produce
      ciorne duplicate.
- [x] Dimineata: `pending_approval()` arata doar ce a trecut validarea;
      `rejected()` arata restul, cu raportul salvat de noaptea trecuta. O aprobare
      in bloc care contine documente picate e un buton care produce erori in bloc.
- [x] `approve()` emite in lot, cu tranzactie per document. Refuza rulele care nu
      sunt `validated`.
- [x] `recurring.check()` — validare fara alocare de numar. E si ce trebuie legat
      pe Ctrl+Enter in editor (punctul 6): verificare, NU emitere.

## 8. Export contabil

- [x] CSV jurnal de vanzari (`app/core/export/journal.py`). Separator `;` si
      zecimal virgula, ca sa se deschida corect in Excel-ul romanesc. Coloane pe
      cota, plus coloane separate pentru scutit si taxare inversa.
- [x] Sectiunile `SalesInvoices` si `Payments` (`app/core/export/saft.py`), cu
      `TaxCode` pe fiecare linie si `index_incarcare` pe factura. O linie fara
      `saft_tax_code` opreste exportul — mai bine eroare aici decat D406 respins.
- [x] Arhiva ZIP lunara (`app/core/export/archive.py`): `zip_spv/` (originalele
      legale), `xml/`, `pdf/`, jurnalul si cele doua sectiuni. Raporteaza ce
      lipseste; `CITESTE.txt` spune care fisiere sunt documentul fiscal.
- [ ] **Valideaza sectiunile pe XSD-ul D406 v2.4.5.** Numele de elemente sunt
      transcrise din arborele documentat in `docs/efactura_spec.md` §4, nu dintr-o
      schema. Aceeasi disciplina ca la `app/core/ubl/sequence.py`: structura sta
      intr-un loc, marcata ca ipoteza pana o confirma XSD-ul.
      Namespace-ul e deja tratat explicit (`variant='test'` da `d406t`), pentru ca
      e cea mai frecventa eroare de structura.

## Puncte deschise — de clarificat inainte sa le atingi

Vezi `docs/efactura_spec.md` §6. Cele care conteaza:
taxare inversa intracomunitara + VIES, GDPR, dobanda legala penalizatoare, D394.
