# Ilustrațiile de arhivă

**331 de ilustrații**, toate verificate una câte una: **309 în domeniul public, 22 sub
CC BY** (cere doar credit tipărit, nu contaminează cartea).

## Cum au fost găsite

Nu una câte una, ci printr-o căutare sistematică pe Wikimedia Commons: **nouăsprezece
fonduri tematice** care au dat material — hărți, antichitate, ev mediu, artă
brâncovenească, portrete, tipărituri, secolul XIX, orașe vechi, secolul XX, preistorie,
aromâni, Basarabia, femei, sport, hrană, medicină, mediu, comunism, vederi — fiecare cu
rădăcinile lui de categorii, coborâte un nivel în arborele de subcategorii.

Au rezultat **5.106 fișiere** care trec verificarea de licență. Un scor de relevanță a
reținut din ele cele mai bune câteva sute, descărcate la 500 px și așezate în planșe de
contact — treizeci de imagini pe planșă. Alegerea s-a făcut cu ochiul, pe planșe, nu
după numele fișierului.

## Verificarea de licență

Fiecare fișier e citit cu `extmetadata` din API și trecut printr-o poartă care acceptă
numai:

- **domeniu public** (`PD-old`, `PD-art`, `CC0`, „no restrictions")
- **CC BY** — cere credit tipărit, atât

și respinge:

- **CC BY-SA** — share-alike ar obliga volumul întreg să fie relicențiat liber
- **CC BY-NC** — interzice vânzarea
- **CC BY-ND**, **GFDL** — incompatibile cu o carte ilustrată vândută

Asta explică de ce perioada de după 1945 e rară: fotografia contemporană de pe Commons
e aproape toată share-alike. Nu e o scăpare a căutării, e felul în care s-a licențiat.

## Controlul vizual

Licența și scorul de relevanță nu văd ce vede ochiul. După descărcare, toate ilustrațiile
au fost puse în planșe de control și privite una câte una. **Nouă au fost respinse**, cu
motivul consemnat în `program2.mjs`:

| Ce era | De ce a căzut |
|---|---|
| Panorama amfiteatrului de la Ulpia Traiana | 22.501 px lățime: în pagină ar fi o dungă |
| Tabula Peutingeriana, sulul întreg | 26.381 px; în planșă intră cele două segmente decupate |
| „Principatus Moldaviae", Cantemir | scanarea e **versoul alb** al foii, nu harta |
| Interiorul sinagogii Status Quo, Târgu Mureș | decupaj îngust, ilizibil la dimensiunea paginii |
| Retezat, lacul Bucura | panoramă, raport de laturi inutilizabil |
| „A reverie of Prince Demetrius Cantemir" | scanare cu riglă de culoare alături |
| Trei pagini din *National Geographic*, 1923 | pagini de carte fotografiate, cu riglă de culoare |

A treia linie e cazul care contează: fișierul avea licență bună, titlu bun, rezoluție
bună — și era o foaie goală. Nicio verificare automată nu prinde asta.

Izvoarele sub 1.100 px sunt așezate pe două treimi din oglinda paginii, ca densitatea la
tipar să rămână onestă; cele mai late decât înalte umplu oglinda.

## Ce e greu de găsit liber

| Subiect | Situație |
|---|---|
| Comunismul, 1948–1989 | fotografii de agenție, aproape toate încă sub drepturi |
| Decembrie 1989 | idem; câteva cadre există sub CC BY-SA, inutilizabile aici |
| Etnografie, costum popular | plăci vechi puține; fotografia modernă e share-alike |
| Industrie, căi ferate | idem |
| Sport | foarte puțin înainte de 1960 în domeniul public |

Pentru capitolele acestea, alternativele sunt: licențe cumpărate de la **AGERPRES**
(arhiva agenției naționale), **Fototeca Comunismului Românesc** (IICCMER), **Arhivele
Naționale**, sau lăsate pe hărțile și diagramele originale ale volumului.

## Obligațiile care rămân

Pentru cele 22 de imagini **CC BY**, creditul trebuie tipărit — e în legendă și în lista
de proveniență de la sfârșitul volumului. Pentru domeniul public nu există obligație
legală, dar lista se tipărește oricum: e practica normală și îi ajută pe cititori să
ajungă la izvor.

## Cum se reface totul

```bash
cd carte
node cauta-mare.mjs              # strânge fondul (lung: ritmul e limitat de Commons)
node planse.mjs <grup> 60        # planșe de contact pentru ales
node program2.mjs                # descarcă selecția la 1.920 px
node optim.mjs                   # reduce la rezoluția de tipar
node verifica-poze.mjs           # planșe de control, pentru privit
```

Două lucruri învățate pe pielea noastră, amândouă consemnate în cod:

**Lățimile.** Commons pre-generează miniaturi **numai la lățimi standard** — 250, 330,
500, 960, 1280, 1920, 3840 — și răspunde cu `429` la orice altă lățime **și la orice
cerere de original**. Cererile la 2.400 px eșuau una din două; la 1.920 nu mai eșuează
niciuna.

**Ritmul pe API.** Când se depășește rata permisă, `api.php` răspunde cu text simplu,
nu cu JSON. `JSON.parse` pică, iar căutarea pare pur și simplu să nu fi găsit nimic —
cea mai perfidă formă de eșec. Șase fonduri tematice au raportat zero fișiere din cauza
asta. Acum răspunsul e verificat înainte de parsare și ritmul crește după fiecare refuz.
