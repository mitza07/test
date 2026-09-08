# Specificație de implementare — program de facturare RO

Versiune: 08.09.2026. Sursele primare sunt citate la fiecare secțiune.
Ce nu am putut verifica direct e marcat explicit la final.

---

## 1. Flux API ANAF — endpoint-uri exacte

### 1.1 OAuth 2.0 (Authorization Code)

```
GET  https://logincert.anaf.ro/anaf-oauth2/v1/authorize
       ?response_type=code
       &client_id=<CLIENT_ID>
       &redirect_uri=<CALLBACK_EXACT>
       &token_content_type=jwt

POST https://logincert.anaf.ro/anaf-oauth2/v1/token
       Authorization: Basic base64(client_id:client_secret)
       grant_type=authorization_code
       &code=<CODE>
       &redirect_uri=<ACELASI_CALLBACK>
```

Refresh:
```
POST https://logincert.anaf.ro/anaf-oauth2/v1/token
       grant_type=refresh_token&refresh_token=<RT>&client_id=...&client_secret=...
```

Endpoint-uri auxiliare (F5 BIG-IP APM, din OIDC discovery):
```
https://logincert.anaf.ro/f5-oauth2/v1/revoke
https://logincert.anaf.ro/f5-oauth2/v1/introspect
https://logincert.anaf.ro/f5-oauth2/v1/userinfo
https://logincert.anaf.ro/anaf-oauth2/v1/.well-known/openid-configuration
```

### 1.2 Durate de valabilitate

| Token | Valabilitate | Secunde |
|---|---|---|
| access_token (JWT) | 90 zile | 7.776.000 |
| refresh_token (JWT) | 365 zile | 31.536.000 |
| authorization code | ~5 minute | 300 |

Sursa: ANAF, *Procedura de înregistrare aplicații portal ANAF* —
`ACCES TOKEN JWT: 129600 minute = 90 zile`, `REFRESH TOKEN JWT: 525600 minute = 365 zile`.
Durata codului de autorizare nu e publicată de ANAF; valoarea de 5 minute e defaultul
documentat F5 pentru `auth-code-lifetime` — deducție, nu afirmație ANAF.

**Rotația refresh token-ului:** apelul de refresh returnează AMBELE valori noi, iar noul
refresh token e emis tot pe 365 de zile. ANAF nu precizează dacă termenul se resetează
sau rămâne ancorat la autorizarea inițială. Tratează ambele cazuri: monitorizează
`refresh_expires_at` și alertează cu 14 zile înainte.

**Pasul interactiv cere certificat digital calificat pe token USB/PKCS#11**, înregistrat în
SPV cu rol PJ. Nu poate fi automatizat — se face în browser, o singură dată.
Înrolare dezvoltator: portal ANAF → Servicii Online → Înregistrare utilizatori →
Dezvoltatori aplicații → Înregistrare pentru API-uri.

### 1.3 e-Factura — cele 4 apeluri

Producție: `https://webserviceapl.anaf.ro/prod/FCTEL/rest/...`
Test:      `https://webserviceapl.anaf.ro/test/FCTEL/rest/...`

**Upload B2B**
```
POST /prod/FCTEL/rest/upload?standard=UBL&cif=<CUI_FARA_RO>
     Authorization: Bearer <access_token>
     Content-Type: application/xml
     <body: XML brut, maxim 10 MB>
```

**Upload B2C**
```
POST /prod/FCTEL/rest/uploadb2c?standard=UBL&cif=<CUI_FARA_RO>
```

Parametri query:

| Parametru | Obligatoriu | Valori | Când |
|---|---|---|---|
| `standard` | da | `UBL`, `CII`, `CN`, `RASP` | CN = notă de creditare, RASP = răspuns cumpărător |
| `cif` | da | CUI numeric, fără prefix RO | destinatarul erorilor dacă emitentul nu e identificabil în XML |
| `extern` | nu | `DA` | cumpărător din afara României, fără CUI/NIF |
| `autofactura` | nu | `DA` | factura emisă de cumpărător în numele vânzătorului |
| `executare` | nu | `DA` | depusă de organ de executare judiciară |

Limită: 10 MB. Peste → HTTP 413.

Răspuns OK:
```json
{ "dateResponse": "202501011200", "ExecutionStatus": 0, "index_incarcare": "5001120362" }
```
Răspuns eroare:
```json
{ "dateResponse": "...", "ExecutionStatus": 1, "Errors": [ { "errorMessage": "..." } ] }
```

**Verificare stare**
```
GET /prod/FCTEL/rest/stareMesaj?id_incarcare=<index_incarcare>
```
Răspuns XML:
```xml
<header xmlns="mfp:anaf:dgti:efactura:stareMesajFactura:v1"
        stare="ok" id_descarcare="3001474425"/>
```

| `stare` | Semnificație | Acțiune |
|---|---|---|
| `in prelucrare` | încă se procesează | mai așteaptă |
| `ok` | validată și livrată; `id_descarcare` setat | descarcă |
| `nok` | respinsă; `id_descarcare` conține raportul de erori | descarcă și afișează erorile |
| `XML cu erori nepreluat de sistem` | respingere imediată, XML malformat | corectează și reîncarcă |

**Limită: maxim 100 interogări de stare pe zi per `id_incarcare`.** Poll la 5–30 secunde,
nu mai des.

**Descărcare**
```
GET /prod/FCTEL/rest/descarcare?id=<id_descarcare>
```
Returnează ZIP binar cu două fișiere:
- `<id>.xml` — factura procesată (dacă `ok`) sau raportul de erori (dacă `nok`)
- `<id>_semnatura.xml` — sigiliul electronic al Ministerului Finanțelor

**Limită: maxim 10 descărcări pe zi per `id`.**

**Listă mesaje primite (facturi de la furnizori)**
```
GET /prod/FCTEL/rest/listaMesajeFactura?cif=<CUI>&zile=<1..60>
GET /prod/FCTEL/rest/listaMesajePaginatieFactura   (pentru volume mari)
```

### 1.4 Serviciul de validare ANAF — fără OAuth

Există un endpoint public de validare, care nu cere token. Îl folosești ca a doua plasă
de siguranță, după schematronul local:

```
POST https://webservicesp.anaf.ro/prod/FCTEL/rest/validare/FACT1   (factură)
POST https://webservicesp.anaf.ro/prod/FCTEL/rest/validare/FCN     (notă de creditare)
     Content-Type: text/plain
     <body: XML brut>
```

Ministerul Finanțelor publică schematron și validator **numai pentru UBL**. RO_CIUS acoperă
formal și sintaxa CII, dar nu există artefacte oficiale pentru ea — nu genera CII.

### 1.5 Verificarea CUI/CNP nu e în schematron

ANAF verifică separat cifra de control a CUI-ului și a CNP-ului, în afara schematronului,
și respinge cu un cod propriu: `ERRIdentif` („CUI cumparator incorect", „CNP sau NIF
vanzator incorect").

**Consecință:** implementează validarea checksum-ului local, altfel treci de schematron și
pici la ANAF fără să înțelegi de ce.

CUI românesc: cifră de control mod-11 cu multiplicatorul `753217532`. Se elimină prefixul
`RO` opțional, se resping valorile nenumerice sau în afara intervalului. O valoare de
control 10 se mapează la 0. Regula se aplică doar numerelor românești — codurile de TVA
străine nu au acest checksum.

### 1.6 Antetul minim corect

```xml
<cbc:UBLVersionID>2.1</cbc:UBLVersionID>
<cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
<cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
<cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>
<cbc:TaxCurrencyCode>RON</cbc:TaxCurrencyCode>
```

**Ordinea elementelor contează.** XSD-ul OASIS UBL 2.1 impune o secvență fixă; ANAF respinge
pe schemă înainte să ajungă la regulile de business. Un element pus în ordinea greșită pică
fără mesaj de business rule.

Numărul de la Registrul Comerțului se pune în `PartyLegalEntity/CompanyID`, în formatul
`J{judet}/{numar}/{an}`.

### 1.7 Mediul de test — o singură înregistrare, două hosturi

**OAuth-ul e identic pentru test și producție.** Separarea test/producție se aplică doar
hosturilor de API, nu autorizării. Concret:

- Înregistrezi **o singură** aplicație pe portalul ANAF, obții **un singur** `client_id` +
  `client_secret`, autorizezi **o singură dată** cu certificatul digital.
- Același `access_token` funcționează pe ambele medii.
- Comuți între ele schimbând segmentul de cale: `/test/FCTEL/rest/...` versus
  `/prod/FCTEL/rest/...`.

Nu există înregistrare separată pentru test, nu există al doilea certificat, nu există un
sandbox care să te lase să dezvolți fără certificat. Certificatul rămâne condiția de intrare.

**Două hosturi de API, cu mecanisme de autentificare diferite:**

| Host | Autentificare | Note |
|---|---|---|
| `webserviceapl.anaf.ro` | certificat prezentat la fiecare apel | documentat în PDF-ul oficial MF; necesită certificatul instalat pe mașina care trimite |
| `api.anaf.ro` | OAuth2 Bearer | recomandat pentru server; certificatul se folosește o singură dată, la înrolare |

Pentru un stack în Docker cu deployment automat, `api.anaf.ro` cu OAuth2 e singura variantă
practică — altfel ai nevoie de token USB pe fiecare mașină care emite. Documentația ANAF
folosește ambele hosturi în exemple, fără să explice clar diferența.

Ce nu scrie în documentație și se află doar din practică: parametrul `?standard=UBL` e
obligatoriu la upload, iar în producție e obligatoriu și `&cif=`.

---

## 2. CIUS-RO — ce trebuie să conțină XML-ul

Standard: UBL 2.1, profil CIUS-RO, compatibil EN 16931.
Artefacte de validare (schematron) oficiale: `mfinante.gov.ro/web/efactura/informatii-tehnice`.
Versiunea curentă la data documentării: **ro16931-ubl-1.0.9**, valabilă din 05.06.2024.
**Descarcă arhiva și rulează schematronul local** — e singura validare care contează.

### 2.1 Identificatorul specificației (BT-24) — `cbc:CustomizationID`

```
urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1
```
Regula **BR-RO-001**. Nu modifica ordinea, majusculele sau separatorii `#` și `:`.

### 2.2 Tipul documentului (BT-3) — `cbc:InvoiceTypeCode`

Regula **BR-RO-020_1**. Coduri permise, exact, fără spații:

| Cod | Semnificație |
|---|---|
| `380` | Factură |
| `381` | Notă de creditare |
| `384` | Factură corectată |
| `389` | Autofactură |
| `751` | Informativ contabil |

Pentru CreditNote (`cbc:CreditNoteTypeCode`) e permis **DOAR `381`** — regula BR-RO-020_2.

### 2.3 Grupuri și termeni obligatorii

**Antet**
- BT-1 număr factură — max 200 caractere, **trebuie să conțină cel puțin o cifră** (BR-RO-010)
- BT-2 data emiterii — `YYYY-MM-DD` exact 10 caractere (BR-RO-DT001)
- BT-5 moneda documentului
- BT-6 moneda TVA — **dacă BT-5 ≠ RON, BT-6 trebuie să fie RON** (BR-RO-030)
- BT-7 data exigibilității TVA — format `YYYY-MM-DD` (BR-RO-DT002)
- BT-8 codul datei de exigibilitate — doar `3` (data emiterii), `35` (data livrării), `432` (data plății) (BR-RO-040)
- BT-9 data scadenței — `YYYY-MM-DD`
- BT-10 referință cumpărător
- BT-12 contract, BT-13 comandă, BT-14 sales order, BT-15 recepție, BT-16 expediție, BT-17 ofertă/lot — fiecare max 200
- BT-19 referință contabilă cumpărător — max 100
- BT-20 termeni de plată — max 300
- BT-22 comentariu factură — max 300, **maxim 20 apariții** (BR-RO-A020)
- BT-24 CustomizationID (vezi 2.1)
- BT-25/BT-26 referință factură precedentă — obligatorii la storno

**Vânzător (BG-4)**
- BT-27 nume — max 200
- BT-31 cod TVA / BT-32 identificator înregistrare / BT-63 TVA reprezentant fiscal —
  **cel puțin unul obligatoriu** (BR-RO-065)
- BT-33 informații juridice — max 1000
- BT-35 adresa linia 1 — **obligatorie** (BR-RO-081), max 150
- BT-37 localitate — **obligatorie** (BR-RO-091), max 50
- BT-38 cod poștal — max 20
- BT-39 subdiviziune țară — **cod ISO 3166-2:RO** (BR-RO-110)
- BT-40 țară

**Cumpărător (BG-7)**
- BT-44 nume — max 200
- BT-47 identificator / BT-48 cod TVA — **cel puțin unul obligatoriu** (BR-RO-120)
- BT-50 adresa linia 1 — **obligatorie** (BR-RO-082)
- BT-52 localitate — **obligatorie** (BR-RO-092)
- BT-53 cod poștal max 20, BT-54 subdiviziune ISO (BR-RO-111)

**Livrare (BG-13), dacă există**
- BT-70 nume parte livrare, BT-71 identificator locație
- BT-72 data livrării efective — `YYYY-MM-DD` (BR-RO-DT004)
- BT-75 adresa linia 1 — **obligatorie dacă există adresă de livrare** (BR-RO-180)
- BT-77 localitate — **obligatorie** (BR-RO-201)
- BT-78 cod poștal max 20
- BT-79 subdiviziune — **obligatorie** (BR-RO-211), cod ISO (BR-RO-212)

**Plată (BG-16)**
- BT-81 cod mijloc de plată, BT-82 descriere instrument — max 100
- BT-83 referință plată — max 140
- BT-84 IBAN, BT-85 nume cont — max 200, BT-86 BIC
- BT-88 nume deținător card — max 200

**Defalcare TVA (BG-23)** — obligatorie, câte un grup per cotă
- BT-116 bază impozabilă, BT-117 valoare TVA, BT-118 cod categorie, BT-119 procent
- BT-120/BT-121 motiv și cod de scutire — obligatorii pentru cotele exceptate

**Totaluri (BG-22)**
- BT-106 total linii, BT-107 total deduceri, BT-108 total taxe suplimentare
- BT-109 total fără TVA, BT-110 total TVA, BT-111 TVA în moneda contabilă
- BT-112 total cu TVA, BT-113 sume plătite în avans, BT-114 rotunjire, BT-115 total de plată

**Linie (BG-25)**
- BT-126 identificator linie, BT-127 notă — max 300
- BT-129 cantitate, BT-130 cod unitate de măsură (**UN/ECE Rec 20**, nu „buc")
- BT-131 valoare netă linie — max 2 zecimale
- BT-133 referință contabilă linie — max 100
- BT-146 preț unitar net — **nu poate fi negativ** (BR-27)
- BT-153 nume articol — **max 100 caractere**
- BT-154 descriere articol — max 200
- BT-155 cod vânzător, BT-156 cod cumpărător, BT-157 EAN/GTIN
- BT-158 cod clasificare (CPV, NC) cu schemeID
- BT-159 țara de origine
- BG-32 atribute articol — maxim 50; BT-160 nume max 50, BT-161 valoare max 100

### 2.4 Regula București — cea mai frecventă respingere

Dacă `Country = RO` și `CountrySubentity = RO-B`, atunci `CityName` **trebuie** să fie
`SECTOR1` … `SECTOR6`. Nu `Bucuresti`, nu `Sector 1`, nu `București`.

Reguli: BR-RO-100 (vânzător), BR-RO-101 (cumpărător), BR-RO-160 (reprezentant fiscal),
BR-RO-202 (livrare).

Județul se scrie **numai** ca ISO 3166-2:RO: `RO-B`, `RO-IF`, `RO-CJ`, `RO-AB` etc.
Niciodată text liber. Reguli: BR-RO-110, BR-RO-111, BR-RO-170, BR-RO-212.

### 2.5 Zecimale — maxim 2, peste tot

Regula schematron aplicată: `string-length(substring-after(valoare,'.')) <= 2`.

Se aplică la: BT-92, BT-93 (deduceri document), BT-99, BT-100 (taxe document),
BT-106 → BT-115 (toate totalurile), BT-110, BT-111 (TVA), BT-116, BT-117 (TVA pe categorie),
BT-131 (valoare netă linie), BT-136, BT-137 (deduceri linie), BT-141, BT-142 (taxe linie).

Coduri: BR-DEC-RO-01 … BR-DEC-RO-28, BR-DEC-RO-1009, BR-DEC-RO-1010.

**Consecință de proiectare:** opțiunea „precizie 3 sau 4 zecimale" nu poate ajunge în SPV.
Blochează precizia la 2 pentru orice document care se transmite, sau calculează intern la
4 și rotunjește la 2 la serializare, cu recalcularea totalurilor din valorile rotunjite —
altfel pică corelațiile aritmetice.

### 2.6 Discounturi

Prețul unitar nu poate fi negativ (BR-27). Discounturile se exprimă exclusiv prin
`cac:AllowanceCharge` (BG-20 la nivel de document, BG-27 la nivel de linie), cu
`ChargeIndicator=false`. Motivul deducerii: max 100 caractere (BR-RO-L1017, L1022, L1023).

---

## 3. Validator local — checklist implementabil

Rulează înainte de orice upload. Fiecare punct blochează trimiterea.

**Identificare**
1. BT-1 conține cel puțin o cifră, ≤ 200 caractere
2. Vânzător: cel puțin unul dintre BT-31 / BT-32 / BT-63
3. Cumpărător: cel puțin unul dintre BT-47 / BT-48
4. BT-3 ∈ {380, 381, 384, 389, 751}; pentru CreditNote doar 381
5. BT-24 exact șirul CIUS-RO

**Adrese** (pentru vânzător, cumpărător, reprezentant fiscal, livrare)
6. Adresa linia 1 completată, ≤ 150
7. Localitate completată, ≤ 50
8. Subdiviziune = cod ISO 3166-2:RO valid
9. Dacă subdiviziune = `RO-B` → localitate ∈ {SECTOR1..SECTOR6}
10. Cod poștal ≤ 20

**Date calendaristice**
11. BT-2, BT-7, BT-9, BT-72, BT-73, BT-74 în format `YYYY-MM-DD`, exact 10 caractere
12. BT-74 ≥ BT-73
13. BT-8 ∈ {3, 35, 432}

**Monedă**
14. Dacă BT-5 ≠ RON → BT-6 = RON obligatoriu

**Numere**
15. Toate sumele au maxim 2 zecimale
16. BT-146 ≥ 0 pe fiecare linie
17. Suma BT-131 pe linii = BT-106
18. BT-109 = BT-106 − BT-107 + BT-108
19. BT-112 = BT-109 + BT-110
20. BT-115 = BT-112 − BT-113 + BT-114
21. Suma BT-116 pe grupurile BG-23 = BT-109
22. Suma BT-117 pe grupurile BG-23 = BT-110
23. Pentru fiecare grup BG-23: BT-117 = round(BT-116 × BT-119 / 100, 2)

**Lungimi**
24. BT-153 ≤ 100, BT-154 ≤ 200, BT-127 ≤ 300, BT-22 ≤ 300 și maxim 20 apariții
25. BT-19, BT-133, motivele de deducere/taxă ≤ 100
26. BT-20 ≤ 300, BT-33 ≤ 1000, BT-83 ≤ 140
27. Numele părților ≤ 200

**Unități de măsură**
28. BT-130 este cod valid UN/ECE Rec 20 (`H87` = bucată, `HUR` = oră, `KGM` = kg,
    `MTR` = metru, `LTR` = litru, `MTK` = m², `MTQ` = m³, `DAY` = zi, `MON` = lună)

**Scutiri**
29. Dacă BT-118 ∈ {E, K, G, O, AE, Z} → BT-120 sau BT-121 obligatoriu

**Storno**
30. BT-3 = 384 sau document de tip CreditNote cu 381; BG-3 (BT-25, BT-26) completat cu
    seria și numărul facturii corectate

---

## 4. Obligații legale — stare la 08.09.2026

**e-Factura**
- B2B obligatoriu din 1 iulie 2024; B2C din 1 ianuarie 2025.
- **Termenul de transmitere: 5 zile LUCRĂTOARE de la data emiterii**, dar nu mai târziu de
  5 zile lucrătoare de la data-limită de emitere din art. 319 alin. (16) Cod fiscal.
  Art. 10 alin. (7) din OUG 120/2021, modificat prin **OUG 89/2025** (MO 1203/24.12.2025),
  în vigoare de la **1 ianuarie 2026**. Până la 31.12.2025 erau 5 zile calendaristice
  (OUG 69/2024) — o factură emisă în 2025 se supune regulii de la data emiterii.
- Calculul termenului se face conform **Regulamentului (CEE, Euratom) nr. 1182/71**:
  curge de la începutul primei ore a primei zile și se încheie la expirarea ultimei ore a
  ultimei zile. Sâmbetele, duminicile și sărbătorile legale nu se numără.
  **Consecință de implementare:** îți trebuie un calendar de sărbători legale în DB, nu
  un simplu `issue_date + 5`.
- **Amenzi** (art. 13² din OUG 120/2021), pentru nerespectarea termenului:
  - 5.000–10.000 lei — contribuabili mari
  - 2.500–5.000 lei — contribuabili mijlocii
  - 1.000–2.500 lei — celelalte persoane juridice și persoanele fizice
  Se aplică **per factură**, nu o singură dată. Nu beneficiază de reducerea de 50% din
  minim prevăzută de OG 2/2001.
- **Sancțiune suplimentară în B2B: 15% din valoarea totală a facturii**, aplicabilă atât
  emitentului care nu transmite prin sistem, cât și destinatarului care primește și
  înregistrează o factură B2B pe alt canal. Cele două amenzi se pot cumula.
- **De la 1 ianuarie 2026** se transmit în e-Factura și facturile către persoane impozabile
  nestabilite în România, dar înregistrate aici în scopuri de TVA.
- **Legea 88/2026** (MO 459/29.05.2026, în vigoare 1 iunie 2026) a modificat art. 10¹⁰ din
  OUG 120/2021: persoanele fizice care se identifică fiscal prin **CNP** nu mai au
  obligația de a folosi RO e-Factura — utilizarea devine opțională. Exceptați și
  agricultorii persoane fizice cu regim special, și institutele/centrele culturale
  străine care activează pe baza unor acorduri interguvernamentale. Punere în aplicare
  prin **Ordinul ANAF 1.021/2026** (MO 3 septembrie 2026).
  - Formular **082** — înscriere în Registrul RO e-Factura obligatoriu (cei cu CUI)
  - Formular **081** — Registrul opțional, înscriere sau radiere
  - PFA, ÎI și ÎF care se identifică prin **CUI rămân obligate**, din 1 iunie 2026.
- Corectarea unei facturi deja transmise: storno → transmite stornoul → emite factura
  corectă → transmite factura corectă. Patru documente, nu unul.
- Facturile se păstrează 5 ani de la 1 iulie a anului următor exercițiului financiar
  (art. 25, Legea contabilității 82/1991). Pentru arhivarea electronică a XML-ului și a
  sigiliului MF, termenul practic recomandat în industrie e 10 ani.

**TVA**
- Cota standard **21%**, cotă redusă unică **11%**, din 1 august 2025 (Legea 141/2025,
  MO 699/25.07.2025). Cotele de 9% și 5% au fost comasate în 11%.
- 9% rămâne tranzitoriu pentru locuințe. Surse contradictorii pe data-limită:
  31 iulie 2026 vs 30 septembrie 2026.
- Plafon de înregistrare în scopuri de TVA: **395.000 lei** cifră de afaceri anuală,
  majorat de la 300.000 lei prin **OG 22/2025**, în vigoare din 1 septembrie 2025
  (transpunerea Directivei UE 2020/285). Confirmat de nota ANAF Cluj
  CJR_DEC-16.104/08.09.2025 și de formularul 700 actualizat de ANAF pe 05.09.2025.
- **La depășire** (art. 310 alin. (6) Cod fiscal): înregistrarea se solicită **cel târziu
  la data depășirii plafonului**, prin formularul 700 depus în SPV. Regimul normal de
  taxare se aplică **chiar de la tranzacția care depășește pragul** — factura respectivă
  se emite cu TVA. Nu există termen de grație de 10 zile; sursele care îl invocă citează
  regula veche. Data de la care ești plătitor e data depășirii, nu data deciziei ANAF.
  Dacă nu depui la timp, ANAF te poate înregistra din oficiu retroactiv
  (art. 310 alin. (6¹)), cu TVA de plată suportat din buzunar plus accesorii.
  **Consecință de implementare:** contor de cifră de afaceri cumulată de la 1 ianuarie,
  cu alertă la 80% din plafon.
- TVA la încasare: plafon 4.500.000 lei la început de 2026, majorat la 5.000.000 lei
  din 1 martie 2026 prin OUG 8/2026; programat 5.500.000 lei din 1 ianuarie 2027.
- RO e-TVA: din 1 ianuarie 2026 s-a abrogat obligația de a răspunde la notificarea de
  conformare. Pentru TVA la încasare, anumite dispoziții rămân suspendate până la
  30 septembrie 2026.

**SAF-T (D406)**
- Din exercițiul fiscal 2026, obligatoriu pentru **toate persoanele juridice**, inclusiv
  SRL-uri mici, microîntreprinderi și neplătitori de TVA. Exceptate expres: PFA, ÎI, ÎF, CMI
  (Ordinul ANAF 1783/2021). Firmele tale sunt SRL-uri, deci intră.
- Din 2026 **nu mai există perioadă de grație**.
- Periodicitate după perioada fiscală TVA: lunar dacă TVA e lunar, trimestrial altfel.
  Termen: ultima zi a lunii următoare perioadei raportate.
- Secțiunea Active: anual. Secțiunea Stocuri: doar la solicitarea ANAF, minim 30 de zile.
- Amenzi: 1.000–5.000 lei nedepunere, 500–1.500 lei raportare incompletă.
- Se testează cu D406T. Atenție la namespace: declarația de test folosește
  `mfp:anaf:dgti:d406t:declaratie:v1`, cea reală `mfp:anaf:dgti:d406:declaratie:v1`.
  Confuzia dintre cele două e cea mai frecventă eroare de structură raportată pe forumuri.

**Structura fișierului XML** — patru blocuri, șapte secțiuni:

```
AuditFile
├── Header
├── MasterFiles
│   ├── GeneralLedgerAccounts   plan de conturi cu solduri initiale si finale
│   ├── Customers               clienti, codificati dupa tara si status TVA
│   ├── Suppliers               furnizori
│   ├── TaxTable                tabelul de coduri de taxa
│   ├── Products / UOMTable     produse si unitati de masura
│   └── Owners, Assets          proprietari, mijloace fixe (anual)
├── GeneralLedgerEntries        registrul jurnal, cu TaxInformation pe fiecare linie
└── SourceDocuments
    ├── SalesInvoices           facturi emise, la nivel de LINIE
    ├── PurchaseInvoices        facturi primite, la nivel de linie
    ├── Payments                incasari si plati
    └── MovementOfGoods         miscari de stoc
```

**Fiecare factură se raportează în două locuri simultan:** în `SourceDocuments` cu toate
liniile, și în `GeneralLedgerEntries` cu impactul contabil. Programul tău alimentează prima
secțiune; contabilul o alimentează pe a doua. Punctul de contact trebuie să fie identic.

**Ce înseamnă pentru programul de facturare — patru consecințe directe:**

1. **`TaxCode` e obligatoriu pe fiecare linie de factură.** Nu e cota de TVA, e codul din
   `TaxTable`. Lipsa lui e eroarea numărul unu raportată la validare:
   *„elementul TaxCode ar fi trebuit să apară de minimum 1 ori, dar apare efectiv de 0 ori"*.
   Schema ta stochează `bt152_vat_percent` și `vat_name`, dar nu un `tax_code` SAF-T.
   Trebuie adăugat pe `vat_rate` și copiat pe linie.

2. **Referința e-Factura intră în D406.** Schema XSD curentă (v2.4.5) include un câmp de
   referință e-Factura. ANAF cross-verifică automat: orice factură transmisă prin e-Factura
   trebuie să apară identic — sume, date, CUI — în `SalesInvoices`. Divergențele declanșează
   control. `index_incarcare` și `id_descarcare` nu mai sunt doar date operaționale, sunt
   date de raportare.

3. **CUI-ul fără spații.** Eroare listată explicit: un spațiu în codul fiscal al partenerului
   invalidează fișierul. Normalizează la salvare, nu la export.

4. **Nomenclatoare ANAF obligatorii**, care trebuie mapate:
   tipurile de facturi emise și primite, mecanismele de plată/încasare, județe, țări, valute,
   planul de conturi. Enum-ul tău de `payment_type` (Chitanță, Bon fiscal, Ordin de plată...)
   trebuie să aibă o coloană de mapare către nomenclatorul ANAF, altfel exportul nu trece.

**Consecință strategică:** dacă programul tău e sursa de adevăr pentru facturi, trebuie să
producă un export care se mapează 1:1 pe `SalesInvoices` și `Payments`. Nu trebuie să
genereze tot D406-ul — asta rămâne treaba programului de contabilitate — dar trebuie să
livreze aceste două secțiuni fără reintroducere manuală.

---

## 5. Decizii de proiectare care rezultă din tot ce e mai sus

1. **Modelul de date se construiește pe BT/BG, nu pe UI.** Câmpurile din formular sunt
   proiecții ale BT-urilor, nu invers.
2. **Precizia se blochează la 2 zecimale** pentru orice document destinat SPV.
3. **Județul e enum, nu text.** Tabel cu cele 42 de coduri ISO 3166-2:RO, cu regula
   specială pentru RO-B.
4. **Unitatea de măsură e cod UN/ECE**, cu etichetă locală separată pentru afișare.
5. **Discountul e AllowanceCharge**, la nivel de document sau de linie, niciodată preț negativ.
6. **Defalcarea TVA (BG-23) se calculează și se stochează**, nu se derivă la generare —
   altfel nu poți audita de ce a picat o factură.
7. **Cota TVA se salvează pe linie** (nume + procent), nu doar ca referință — cotele
   se schimbă.
8. **Storno = document nou** cu referință BG-3 la factura corectată.
9. **Ștergere doar pentru ultimul document din serie**; în rest doar anulare reversibilă.
10. **Monitorizare activă a `refresh_expires_at`** cu alertă la 14 zile.
11. **Rate limiting propriu**: max 100 `stareMesaj` per `id_incarcare` pe zi,
    max 10 `descarcare` per `id` pe zi. Ține contoarele în DB, nu spera că nu le atingi.
12. **Arhivare 5 ani**, calculați de la 1 iulie a anului următor exercițiului financiar
    (art. 25 Legea 82/1991, modificat prin Legea 36/2023 — termenul general era 10 ani
    până la 30.06.2023). Excepție: situațiile financiare, 10 ani (art. 28 alin. 2¹).
    **Formatul legal de arhivat este XML-ul semnat de ANAF.** PDF-ul e reprezentare
    grafică cu rol informativ, nu ține loc de document fiscal original.
    **ANAF păstrează factura în SPV doar 60 de zile.** După aceea, obligația de arhivare
    e integral a ta. Deci descărcarea arhivei ZIP nu e opțională și nu poate fi amânată —
    e o operațiune cu fereastră fixă.

---

## 6. Ce rămâne neverificat — de confirmat înainte de producție

### Închise între timp

- Termenul de transmitere: **5 zile lucrătoare**, OUG 89/2025, din 1 ianuarie 2026.
  Calcul conform Regulamentului (CEE, Euratom) 1182/71. Vezi secțiunea 4.
- Cuantumul amenzilor: 1.000–10.000 lei pe categorii, plus 15% în B2B. Art. 13² OUG 120/2021.
- Formularul 700 la depășirea plafonului TVA: **cel târziu la data depășirii**,
  art. 310 alin. (6) Cod fiscal. Nu există termen de 10 zile.
- Versiunea artefactelor de validare: **ro16931-ubl-1.0.9**, în vigoare din 05.06.2024,
  confirmată ca fiind încă cea curentă. Artefactele EN 16931 europene au ajuns la v1.3.16
  (10.04.2026), dar România **nu** substituie versiunea europeană în pachetul național.
- **Mediul de test:** o singură înregistrare OAuth pentru ambele medii; se comută prin
  segmentul de cale `/test/` vs `/prod/`. Vezi secțiunea 1.7.
- **Arhivarea: 5 ani**, nu 10, de la 1 iulie a anului următor (Legea 36/2023). XML-ul semnat
  e originalul legal, PDF-ul e informativ. ANAF păstrează în SPV doar 60 de zile.
- **Structura SAF-T D406** și cele patru consecințe pentru schema de date. Vezi secțiunea 4.
- **D394 e în vigoare în 2026**, actualizată cu cotele de la 1 august 2025. Se discută
  eliminarea după generalizarea e-Factura și SAF-T, dar nu e programată.

### Rămase deschise

1. **Rotația refresh token-ului ANAF.** Apelul de refresh returnează un refresh token nou,
   emis tot pe 365 de zile, dar ANAF nu precizează dacă termenul se resetează sau rămâne
   ancorat la autorizarea inițială. Tratează ambele: monitorizează `refresh_expires_at`.
2. **Durata codului de autorizare** — 5 minute, dedus din defaultul F5, nu afirmat de ANAF.
3. **Revocarea headless a token-ului nu funcționează.** Testat live: `/f5-oauth2/v1/revoke`
   răspunde 302 către zidul de politică F5 BIG-IP. Token-urile se termină prin expirare sau
   prin „Renunțare OAuth" din portal. Nu construi un flux de revocare programatică.
4. **Lista completă a codurilor de eroare ANAF.** Se obține rulând schematronul oficial.
5. **Structura completă D394** — ce cod de produs și tip de partener cere, și cum se
   corelează cu e-Factura. Nu blochează construcția, dar afectează exportul contabil.
6. **ViDA (VAT in the Digital Age).** Directiva UE care impune raportare digitală pentru
   tranzacțiile intracomunitare, orizont 2030–2035. Neanalizată. Relevantă doar dacă
   facturezi clienți din UE.
7. **Taxare inversă intracomunitară și autofacturare (cod 389)**, cu verificare VIES.
   Flux curent pentru servicii IT către UE, neanalizat.
8. **Dobânda legală penalizatoare** — formula și rata de referință BNR, pentru relansare
   automată cu calcul de penalități.
9. **GDPR.** Ești operator de date. Temeiul legal, durata de păstrare care se ciocnește cu
   obligația fiscală, jurnalul de acces. Neanalizat de nimeni.
10. **e-Transport** — cod UIT pentru transporturi de bunuri. Irelevant pentru servicii IT.

Punctele 1–4 se închid cu certificatul în mână și schematronul rulat local. 5–9 nu blochează
MVP-ul. 10 probabil nu te privește niciodată.
