# Program de facturare RO — context permanent

Citeste acest fisier la inceputul fiecarei sesiuni. Apoi `TODO.md`.

## Ce este

Program de facturare cu e-Factura (ANAF SPV) pentru doua firme proprii din Romania:
servicii IT si consultanta/marketing. Construit ca produs multi-tenant, rulat initial
doar intern. Monetizare posibila ulterior — deciziile de arhitectura o presupun.

Volum: intre 2 si 2000 de facturi pe luna. Recurentele sunt in MVP, nu extensie.

## Stack

Backend FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL 16. Cozi cu Redis + RQ.
PDF cu WeasyPrint, rulat EXCLUSIV in worker, niciodata in procesul API.
Frontend Next.js + TypeScript + Tailwind + shadcn/ui.
Docker, in spatele Traefik.

## Medii

- **dev** — Ubuntu Server in Hyper-V. Date de test. SPV pe `/test/`.
- **prod** — Hetzner. Date reale. SPV pe `/prod/`.

Codul circula intr-o singura directie: git -> imagine -> prod. Datele nu circula deloc.
Un dump din prod se anonimizeaza inainte sa ajunga in dev. Niciodata invers.

`ANAF_ENVIRONMENT` este variabila de INFRASTRUCTURA, nu setare de aplicatie.
In dev, API-ul refuza pornirea daca e setata pe `prod`.

## Constrangeri inviolabile

Nu le negocia, nu le simplifica, nu propune alternative. Sunt cerinte legale.

1. **Maximum 2 zecimale** la serializarea oricarei sume in UBL. Calculul intern poate
   folosi 4 zecimale, dar valoarea de linie se rotunjeste la 2 si totalurile se
   recalculeaza DIN valorile rotunjite.
2. **TVA se calculeaza pe baza AGREGATA per cota** (BG-23), nu ca suma a TVA-urilor de
   linie. Altfel pica corelatiile BR-CO cu diferente de un ban.
3. **Judetul este cod ISO 3166-2:RO** (`RO-B`, `RO-CJ`). Niciodata text liber.
4. **Daca judetul este `RO-B`, localitatea este `SECTOR1`..`SECTOR6`.** Nu "Bucuresti",
   nu "Sector 1".
5. **Unitatea de masura este cod UN/ECE Rec 20** (`H87` bucata, `HUR` ora, `MON` luna).
   Eticheta locala pentru afisare este camp separat.
6. **Factura emisa este imuabila.** Nu exista UPDATE pe document dupa emitere.
   Corectia se face prin storno cu referinta BG-3.
7. **Imuabilitatea acopera si reprezentarea.** PDF-ul emis se pastreaza cu hash si
   versiunea sablonului. O factura veche nu se regenereaza cu logo sau sablon nou.
8. **Stergerea** e permisa doar daca documentul e ultimul din serie SI nu are
   `index_incarcare`. Verificarea se face in ACEEASI tranzactie atomica cu stergerea.
9. **Numarul de serie se aloca DUPA ce validatorul local trece.** O factura care pica
   validarea nu consuma un numar. Fara gauri in serie.
10. **`TaxCode` (SAF-T) este obligatoriu pe fiecare linie.** Nu e cota de TVA.
11. **CUI-ul se normalizeaza la SALVARE**: fara spatii, fara prefix RO in campul numeric.
    Un spatiu invalideaza D406.
12. **Checksum CUI/CNP se verifica local.** Nu e in schematron; ANAF respinge separat
    cu `ERRIdentif`.
13. **Termenul legal e de 5 ZILE LUCRATOARE** de la emitere (OUG 89/2025), calculat cu
    calendarul de sarbatori legale. Nu `issue_date + 5`.
14. **Arhiva SPV se descarca in maximum 60 de zile.** Dupa, ANAF o sterge definitiv.
15. **Originalul legal e XML-ul semnat de ANAF.** PDF-ul are rol informativ.

## Decizii luate deja

- Multi-tenant din prima migratie, cu Row Level Security in Postgres pe `company_id`.
  Nu filtrare prin WHERE scris manual. Un query fara filtru returneaza zero randuri.
- Token SPV per firma, in `spv_credential`, criptat. Nu in variabila de mediu.
  Modelul ANAF suporta asta nativ: o aplicatie inregistrata, autorizare per client.
- Trei axe ortogonale de stare: `doc_status`, `payment_status`, `spv_status`.
  O factura poate fi emisa, respinsa de SPV si incasata simultan.
- `spv_status = 'unknown'` este stare valida. Timeout NU inseamna esec si NU
  autorizeaza retrimiterea.
- Emiterea in lot: tranzactie per document, nu una pentru tot lotul.
- Editorul implicit este grila operabila din tastatura, cu previzualizare PDF
  colapsata. Previzualizarea se genereaza dupa pauza de editare, nu la fiecare tasta.
  Daca PDF-ul afisat e vechi, interfata o spune.
- `fx_rate_date` este separat de `issue_date`. BNR publica la 13:00, aplicabil zilei
  urmatoare.

## Interzis

- Query fara `company_id` in context (RLS il prinde, dar nu te baza pe el).
- WeasyPrint in procesul API.
- `float` pentru sume. Doar `Decimal`.
- Retrimitere automata la timeout.
- Editarea unei facturi emise, sub orice forma.
- Sa presupui ca stii legislatia — verifica in `docs/efactura_spec.md`.

## Stil de lucru

Raspunde in romana. Concis, fara introduceri. Pasi numerotati doar pentru setup tehnic.
Diff-uri, nu fisiere intregi, cand iterezi pe cod existent.
Cand ceva din spec e ambiguu, intreaba — nu inventa.
