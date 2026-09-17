# Ilustrațiile de arhivă

## Ce am găsit

Douăzeci de imagini verificate una câte una: **nouăsprezece în domeniu public, una sub CC BY** (cere doar credit tipărit, nu contaminează cartea).

Am respins din start tot ce era **CC BY-SA** — share-alike ar obliga volumul întreg să fie relicențiat liber — și tot ce era **CC BY-NC**, care interzice vânzarea.

| Capitol | Imaginea | Licență |
|---|---|---|
| Zorii fierului | Câmpul de morminte de la Hallstatt, gravură 1886–1902 | domeniu public |
| Geții | Coiful din mormântul princiar de la Peretu, sec. IV î.Hr. | domeniu public |
| Burebista | Stater de aur KOΣΩN (Münzkabinett Berlin) | domeniu public |
| Burebista | *Murus dacicus* — tehnica zidurilor din Munții Orăștiei | domeniu public |
| Decebal | Detaliu din Columna lui Traian | domeniu public |
| Dacia romană | Miliarul de la Aiton, 108 d.Hr. — prima atestare a numelui Napoca | domeniu public |
| Migrațiile | Tezaurul de la Pietroasele, gravură 1889 | domeniu public |
| Voievodate | Filă din *Chronicon Pictum*, c. 1360 | domeniu public |
| Întemeierea | Basarab I | domeniu public |
| Cruciada târzie | Portretul de la Ambras al lui Vlad Țepeș | domeniu public |
| Mihai Viteazul | Gravura de epocă, 1601 (Rijksmuseum) | domeniu public |
| Brâncoveanu | Mănăstirea Hurezi | CC BY — credit obligatoriu |
| Fanarioți | Horea și Cloșca, gravură de secol XVIII | domeniu public |
| Fanarioți | Harta Principatelor, 1782 | domeniu public |
| Unirea | Alexandru Ioan Cuza, 1859 | domeniu public |
| Regatul | Carol I, bust de Frederic Storck, 1900 | domeniu public |
| Marele Război | Trupe române la Mărășești, 1917 | domeniu public |
| Interbelic | Sediul ziarului „Adevărul”, anii 1930 | domeniu public |
| Anul 1940 | Bistrița, 8 septembrie 1940 — intrarea trupelor maghiare | domeniu public |
| Minoritățile | Harta etnografică a lui Ami Boué, 1847 | domeniu public |

## Ce nu am găsit, și de ce

**Perioada de după 1945 e aproape goală în domeniul public.** Fotografiile din comunism, din decembrie 1989 și din protestele de după 2015 sunt aproape toate CC BY-SA, încărcate de fotografi contemporani. Nu e o scăpare a căutării — e felul în care s-au licențiat.

Ai trei variante pentru capitolele moderne:

1. **Lași hărțile și diagramele mele** acolo unde nu există imagine liberă. E onest și nu costă nimic.
2. **Cumperi licențe** de la AGERPRES (arhiva foto a agenției naționale) sau Getty/AP pentru câteva fotografii-cheie: 22 decembrie 1989, mineriada, Piața Victoriei 2017.
3. **Accepți CC BY-SA** — dar atunci cartea, ca operă derivată, ar trebui pusă sub aceeași licență. Pentru un volum pe care vrei să-l vinzi, nu ți-o recomand.

## Cum le descarci

Wikimedia limitează rata pe IP-ul partajat prin care ies eu în internet — primesc `429` la fiecare cerere. De pe conexiunea ta merge instant.

```bash
cd carte
bash descarca-ilustratii.sh
```

Durează câteva zeci de secunde. După aceea, macheta le preia automat: `node tipar.mjs && node pdf.mjs` le pune în carte, cu creditul sub fiecare imagine și cu lista completă de proveniență la sfârșitul volumului.

Dacă vreo descărcare eșuează, fișierul rămâne sub 20 KB și e ignorat — cartea se construiește fără el, nu se strică.

## Obligațiile care rămân

Pentru imaginea CC BY (Hurezi), creditul **trebuie tipărit**. Pentru cele din domeniul public nu există obligație legală, dar lista de proveniență se tipărește oricum — e practica normală și îi ajută pe cititori.

Sursele de căutat mai departe, dacă vrei să completezi: **Biblioteca Academiei Române** (colecții digitizate), **Europeana**, **Gallica/BnF**, **Arhivele Naționale**, **Fototeca Comunismului Românesc** (IICCMER) și **Library of Congress**. Am testat LoC, Met Museum și Archive.org — răspund, dar au puțin material românesc.
