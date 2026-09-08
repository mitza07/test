# Decizii de arhitectura si de unde vin

Rezumatul cercetarii care a stat la baza proiectului: patru rapoarte independente
(Claude cu cautare web, ChatGPT, Gemini, DeepSeek) plus inspectia unui cont Oblio
si analiza a 17 platforme din 15 piete. Verificat 9 septembrie 2026.

## De la ChatGPT — cel mai riguros raport

**Imuabilitatea acopera si reprezentarea.** Daca regenerezi o factura veche cu logo
sau sablon nou, istoricul vizual se schimba. Se pastreaza PDF-ul emis, datele exacte
si versiunea sablonului. → `document.template_version`, `rendered_pdf_sha256`.

**"Ultimul din serie" e o conditie de concurenta.** Verificarea la randarea butonului
nu ajunge; intre click si executie poate aparea alt document. → `numbering.can_delete()`
cu `FOR UPDATE` in aceeasi tranzactie.

**Timeout nu inseamna esec.** Interfata are nevoie de "rezultat in curs de verificare",
distinct de eroare, ca sa nu se apese a doua oara "Emite". → `spv_status = 'unknown'`,
`efactura_job.is_unknown`.

**Restaurarea din backup poate reporni automatizari deja executate.** Un email trimis,
o recurenta generata exista extern dar lipsesc din copia bazei. → reconciliere inainte
de repornirea joburilor.

**Format, canal si dovada sunt trei obiecte diferite.** La noi: format = UBL/CIUS-RO,
canal = SPV, dovada = ZIP-ul cu sigiliul MF. → `efactura_job.channel`, `standard`,
`zip_path` separate.

**Trei axe ortogonale de stare**, nu una. → `doc_status`, `payment_status`, `spv_status`.

**Configurarile ireversibile trebuie explicate inainte de confirmare.** La QuickBooks,
activarea multivalutei nu se poate anula si moneda de baza nu se mai schimba.

**Integrarile au ciclu de viata.** Conectorul Chorus Pro al Pennylane a fost oprit la
1 septembrie 2026. "Integrarea exista" se inlocuieste cu "integrarea functioneaza
pentru acest cont si acest flux".

## De la Gemini

**Stergerea conditionata dublu:** ultimul din serie SI fara `index_incarcare`.
Odata ce ai index de incarcare, stergerea locala creeaza discrepanta permanenta cu ANAF.

**Data cursului valutar separata de data facturii.** BNR publica la 13:00, aplicabil
zilei urmatoare. → `fx_rate_date`.

**WeasyPrint blocheaza firul principal** prin operatiuni native C (Pango, Cairo,
libxml2). Ruleaza in worker separat, cu limite de resurse.

**Ascundere progresiva pe trei niveluri** in editor: campuri implicite pe rand,
optiuni UBL in popover, campuri conditionate de date (motivul de scutire apare
automat cand cota e 0%).

Atentie: raportul Gemini foloseste TVA 19% si mapeaza gresit `H87` pe ore.
Cota corecta e 21% din 1 august 2025; `H87` = bucata, `HUR` = ora.

## De la DeepSeek

**Fonturile pentru WeasyPrint** trebuie sa suporte diacriticele romanesti. Liberation
si DejaVu au probleme cu s si t cu virgula. → Noto Sans in Dockerfile.

Atentie: raportul DeepSeek sustine gresit ca facturile trimise la SPV trebuie semnate
de emitent si ca receptia facturilor nu conteaza. Ambele sunt false.

## De la analiza Oblio

Formularul lor de emitere expune direct codurile business term (BT-11, BT-12, BT-13,
BT-15, BT-16, BT-19, BT-46) — confirmarea ca modelul de date se construieste pe setul
BT din CIUS-RO, nu invers.

Seriile sunt pe tip de document, nu pe firma. Precizia e per document si e sursa de
respingere in SPV. Trimiterea automata e intarziata cu 1-4 zile, ca fereastra de editare.

## Descoperiri proprii, prin cautare

- Endpoint public de validare, fara OAuth:
  `POST https://webservicesp.anaf.ro/prod/FCTEL/rest/validare/FACT1`
- Checksum-ul CUI/CNP nu e in schematron; ANAF respinge separat cu `ERRIdentif`.
- Ordinea elementelor XML conteaza — XSD-ul OASIS impune secventa fixa.
- OAuth-ul e identic pentru test si productie; separarea e doar pe calea de API.
- Revocarea headless a tokenului nu functioneaza (zid F5 BIG-IP).
- Arhivare 5 ani, nu 10 (Legea 36/2023). XML-ul semnat e originalul legal.
- ANAF pastreaza factura in SPV doar 60 de zile.
- SAF-T D406: `TaxCode` obligatoriu pe fiecare linie; ANAF cross-verifica automat
  e-Factura cu sectiunea SalesInvoices.

## Descoperit la verificare, 08.09.2026

**RLS-ul e inert cu utilizatorul din `.env.example`.** Postgres ignora complet
politicile Row Level Security pentru rolurile `SUPERUSER` sau cu `BYPASSRLS`.
`FORCE ROW LEVEL SECURITY` din migratia 0002 rezolva doar cazul proprietarului
tabelei, nu si pe cel al superuserului.

Imaginea oficiala `postgres` creeaza `POSTGRES_USER` ca SUPERUSER, iar
`DATABASE_URL` din `.env.example` se conecteaza cu exact acel rol. Deci
politicile exista, se vad in `pg_policies`, si nu fac nimic.

Verificat pe Postgres 16, cu doua firme in baza:

| conexiune | `app.company_id` | randuri vizibile |
|---|---|---|
| superuser | nesetat | 2 — toate firmele |
| rol obisnuit | nesetat | 0 |
| rol obisnuit | firma A | 1 — doar firma A |

Esecul e tacut. Nimic nu se rupe pana cand un endpoint returneaza datele altui
client. → `app/core/rls.py:assert_enforced()`, de chemat la pornire, plus
`tests/test_rls.py` care demonstreaza si gaura, si remedierea.

Ramane de decis cum se leaga in deployment: doua roluri (unul privilegiat pentru
migratii, unul obisnuit pentru aplicatie) inseamna doua URL-uri de conexiune si
o parola in plus de administrat. Vezi TODO.md punctul 3.

**Politicile din 0002 acopereau doar tabelele cu `company_id`.** A doua gaura,
mai grava decat prima pentru ca persista si cu totul configurat corect: cele 12
politici din migratia 0002 stau pe tabelele care au coloana `company_id`.
Tabelele-copil nu o au — si exact ele contin continutul facturii.

Cu rol NEPRIVILEGIAT si `app.company_id` setat corect pe firma X:

    document       ->  1 rand
    document_line  ->  2 randuri   <- ambele firme
    efactura_job   ->  2 randuri   <- ambele firme

    SELECT bt153_name FROM document_line  ->  'SECRET FIRMA X', 'SECRET FIRMA Y'
    SELECT xml_ubl    FROM efactura_job   ->  facturile intregi, ale ambelor firme

→ migratia 0003 pune politici pe cele 11 tabele-copil. Politica delega catre
parinte, printr-o subinterogare care e ea insasi filtrata de politica parintelui:

    USING (EXISTS (SELECT 1 FROM document d WHERE d.id = document_line.document_id))

Fara coloana denormalizata, deci fara backfill si fara riscul ca `company_id` sa
ajunga desincronizat de parinte. Costul e o subinterogare pe rand; indexul pe
cheia straina o face ieftina, dar la scanari mari se simte.

**Ciorna nu putea exista fara numar.** A treia problema gasita ruland schema:

    number         bigint NOT NULL
    UNIQUE (company_id, doc_type, series_name, number)

Constrangerea 9 cere ca numarul sa se aloce dupa validare, deci o ciorna nu are
numar. Dar coloana e NOT NULL, iar daca toate ciornele poarta acelasi marcaj, a
doua din aceeasi serie pica pe cheia unica. Verificat pe Postgres 16.

Consecinta nu e cosmetica: blocheaza punctul 7 din TODO — „job de noapte:
genereaza ciornele lunii si le trece prin validator". Nu poti genera ciornele
lunii daca incape o singura ciorna pe serie.

→ migratia 0004 face `number` si `bt1_invoice_id` NULL-abile. In Postgres, `NULL`
nu e egal cu `NULL` intr-un index unic, deci constrangerea existenta accepta
oricate ciorne si ramane in vigoare pentru documentele emise. Fara index partial.

## Idei care nu apar in niciun produs analizat

**Numarul se aloca dupa validare.** O factura care pica validarea nu consuma un numar.
Lexware valideaza schema inainte de alocare, dar nimeni nu o trateaza ca decizie
arhitecturala centrala.

**Buton unic de remediere dupa respingere SPV.** Corect legal inseamna storno,
transmite stornoul, emite factura corecta, transmite-o — patru documente si opt
operatiuni pentru o virgula gresita. Niciunul din cele 17 produse analizate nu are
asta ca actiune unica.

**Ciorne recurente auto-validate peste noapte.** Job de noapte genereaza ciornele
lunii si le trece prin validator. Dimineata aprobi documente pre-verificate.

**Reguli de validare versionate cu data de intrare in vigoare.** Legislatia s-a
schimbat de patru ori in douasprezece luni. Cotele au deja `valid_from`; regulile
trebuie sa aiba la fel.
