# De ce arată codul așa

> Regulile de mai jos se aplică **ambelor** semnături: `semnatura/` (compactă) și
> `semnatura-clasic/` (designul original). Diferă compoziția, nu tehnica.
> Ce s-a schimbat concret în designul clasic față de pachetul original, și de ce,
> este în tabelul din `README.md`.

Fiecare decizie de mai jos are un motiv concret. Nu modifica fișierul fără să citești
secțiunea corespunzătoare — majoritatea „simplificărilor" evidente reintroduc un bug
care se vede doar pe ecranul destinatarului, niciodată pe al tău.

---

## 1. Imaginea nu vine de nicăieri din exterior

Semnătura conține exact un `<img>`: banda animată de 508×28. `src`-ul ei trimite
la folderul companion al semnăturii, nu la un site:

```html
<img src="Mihai%20Zamfir_files/itistul-signal.gif" width="508" height="28" ...>
```

La inserarea semnăturii, Outlook rezolvă calea relativă, atașează fișierul inline
în mesaj cu un `Content-ID` și rescrie `src`-ul în `cid:...`. Este mecanismul
nativ folosit de editorul de semnături din Outlook pentru orice poză inserată.

Consecința importantă: **blocarea automată a imaginilor se aplică doar imaginilor
remote.** O imagine atașată inline face parte din mesaj, deci se afișează
întotdeauna, fără bara „Click here to download pictures". Nu există URL de blocat,
de urmărit sau de pus pe liste, nici dependență de hotlink, certificat sau
`Content-Type` de pe vreun server.

Fișierul `filelist.xml` din folderul companion și `<link rel="File-List">` din
`<head>` reproduc formatul pe care Outlook îl generează singur. `<head>` e oricum
eliminat la inserare, dar păstrarea lui menține fișierul identic cu ce ar fi
produs Outlook.

Banda e construită să dispară elegant dacă totuși nu ajunge:

- fundalul GIF-ului este **exact** `#0a1628`, aceeași valoare ca `bgcolor`-ul
  celulei care îl conține — în locul benzii rămâne bleumarin, nu o gaură;
- `width` și `height` sunt declarate și ca atribut și în CSS, deci spațiul e
  rezervat înainte de încărcare și layout-ul nu sare;
- `alt=""` — element decorativ: cititoarele de ecran îl sar, iar în starea
  lipsă nu apare text alternativ peste bleumarin;
- 11 KB și 14.224 px² față de peste 400 de caractere de text, deci raportul
  text/imagine rămâne departe de pragurile `HTML_IMAGE_RATIO_*` din SpamAssassin.

Costul onest al metodei: mesajul crește cu 11 KB, iar gateway-urile foarte stricte
scanează atașamentele inline. În practică semnăturile cu imagine inline sunt
printre cele mai comune mesaje de pe internet.

Varianta din `semnatura/varianta-fara-imagini/` este același design fără rândul
benzii și fără folder companion — acolo nu există absolut nicio imagine.

## 1b. Primul cadru al GIF-ului este un design în sine

Motorul Word din Outlook Classic desenează **doar cadrul 1** al oricărui GIF
animat. Nu e o limitare a acestui pachet și nu se poate ocoli.

De aceea cadrul 1 nu e un cadru oarecare din animație: conține traseul complet,
toate marcajele și patru pachete distribuite pe lățime, ca să arate ca un grafic
terminat. Animația e un bonus pentru clienții care o pot reda; cadrul static este
livrabilul garantat.

GIF-ul se regenerează cu `genereaza-gif.py` — acolo se schimbă culorile, viteza,
numărul de pachete și poziția marcajelor. Bucla este perfectă prin construcție:
lățimea de wrap (560 px) este multiplu întreg al pasului pe cadru.

## 2. Un singur `<table>` la nivel superior

Motorul Word inserează un paragraf gol `MsoNormal` între două tabele adiacente.
Varianta veche avea 4 tabele suprapuse — de aici spațiile inegale între benzi.
Acum totul este un singur tabel cu rânduri.

## 3. `<p style="margin:0;padding:0">` în fiecare celulă cu text

Word **nu randează text „gol" într-o celulă** — îl împachetează într-un
`<p class=MsoNormal>` implicit, care moștenește `space-after` din stilul Normal al
**expeditorului** (tipic 8 pt ≈ 11 px). Fără paragraf propriu, sub fiecare rând apar
~11 px de spațiu mort, iar cele 223 px de înălțime devin peste 300 px.

`mso-line-height-rule:exactly` controlează interliniajul *în interiorul* liniei; nu are
niciun efect asupra `space-after`, care este o proprietate separată de paragraf.

## 4. `font-family` inline pe **fiecare** celulă și pe ambele tabele

Motorul Word nu propagă fiabil `font-family` de la un tabel părinte într-un tabel
imbricat. Orice text care s-ar baza pe moștenire ar cădea pe Calibri 11 pt din stilul
mesajului. Zero text moștenește ceva.

Stiva: `'Segoe UI','Helvetica Neue',Arial,sans-serif` — Segoe UI pe Windows (are
complet U+0218–U+021B, adică `Ș ș Ț ț` cu virgulă dedesubt), Helvetica Neue pe macOS,
Arial peste tot altundeva.

## 5. Fiecare `<a>` conține un `<span>` care repetă formatarea

Word aplică stilul de caracter **Hyperlink** peste orice `<a>` — culoare, subliniere
*și font*. `<span>`-ul interior anulează stilul. Se repetă `font-family`, `font-size`,
`color` și `text-decoration:none` pe **ambele** elemente, altfel la o reserializare a
semnăturii linkurile ies la 11 pt Calibri pe un rând de 14 px Segoe UI.

Adresa poștală este și ea într-un `<a>` — altfel detectorul de date din iOS o
transformă singur în link albastru subliniat, iar asta nu se poate opri fără un
bloc `<style>`, care în semnături nu supraviețuiește.

## 6. `bgcolor` **și** `background-color` pe toate cele 12 celule

Niciun `<td>` nu este transparent, iar culoarea textului este declarată pe **același**
element ca fundalul. Motivul este dark mode: Outlook, OWA și Apple Mail inversează
suprafețele și cerneala independent. Când ambele sunt pe același element, inversorul le
mută împreună și nu poate rezulta text alb pe alb sau negru pe negru.

Din același motiv pătratul „IT" este **navy `#0a1628` cu text alb** (18,13:1), nu
albastru `#0d84d8` cu text navy. Varianta albastră măsura 4,58:1 în light mode și
cădea la 1,8–3,4:1 la orice inversare — logo-ul devenea un pătrat gol. Albastrul de
brand rămâne pe bara verticală de 4 px.

Toate perechile text/fundal trec de 4,5:1.

## 7. Lățimile sunt declarate de două ori

Fiecare celulă și fiecare tabel au lățimea și ca atribut HTML **și** în CSS, cu aceeași
valoare. Word tratează atributul `width` de pe `<td>` ca lățime de **conținut**, nu ca
lățime totală. Coloanele însumează exact: `288+132+12+40 = 472` și `4+20+496 = 520`.

Nicio celulă purtătoare de lățime nu are `padding` orizontal — altfel layout-ul se
rezolvă diferit în funcție de cum citește clientul modelul de casetă.

## 8. Linia despărțitoare este `border-top`, nu un rând de 1 px

Metoda clasică — un `<td height="1" bgcolor="…">&nbsp;</td>` — depinde de
`font-size:0`, care este exact declarația cea mai probabil pierdută când Outlook
reserializează semnătura. Dacă se pierde, `&nbsp;`-ul se randează la 11 pt și linia de
1 px devine o **bandă gri de ~15 px** pe toată lățimea. Cu `border-top` pe celula
următoare, cel mai rău caz este că linia dispare — un eșec invizibil, nu unul urât.

Cele 3 celule rămase cu `&#160;` (bara albastră și cele două goluri) au `color` egal cu
`bgcolor`, deci chiar dacă `font-size:0` se pierde, nu se vede nimic.

## 9. Tot ce nu e ASCII este entitate numerică

Fișierul nu conține niciun octet peste `0x7F`. `Ă` este `&#258;`, `ș` este `&#537;`,
`Ț` este `&#538;`, `â` este `&#226;`, punctul median este `&#183;`.

Astfel niciun lanț de codificare — Outlook care rescrie fișierul, un gateway care
recodifică, un client care ghicește greșit charset-ul — nu poate strica diacriticele.
`Mihai Zamfir.htm` are în plus BOM UTF-8 și `<meta http-equiv="Content-Type">`, forma
veche pe care importatorul HTML din Word chiar o citește.

## 10. Separatori care se pot rupe, număr de telefon care nu

Separatorii sunt `&#160;&#183;` urmat de spațiu normal: rândul se poate rupe **după**
punct, niciodată înainte. Numărul de telefon este lipit cu `&#160;`
(`+40&#160;742&#160;932&#160;686`), deci nu se poate despărți pe două rânduri.

## 11. 520 px, nu 680 px

680 px depășește panoul de citire la o fereastră Outlook obișnuită și forțează scroll
orizontal pe mobil. 520 px încap peste tot și rămân lizibile citate de mai multe ori
într-un fir.

---

## Ce s-a eliminat deliberat

| Element | Motiv |
|---|---|
| GIF-ul remote de 132 KB, 640×36, 48 cadre | Înlocuit cu unul local de 11 KB, 508×28, atașat inline de Outlook, cu fundal identic cu celula și cadrul 1 desenat separat |
| Dependența de hosting pe itistul.ro | Eliminată complet — nu mai există nimic de urcat sau de întreținut |
| Butonul `OPEN ITISTUL.RO →` | Un buton CTA într-o semnătură citește ca reclamă și crește scorul de spam |
| Sloganul din subsol | Redundant cu banda de discipline |
| Etichetele `MOBILE` / `E-MAIL` / `ONLINE` / `HQ` | Conținutul se identifică singur; etichetele dublau înălțimea |
| Cele 13 `<div>` de layout | Word nu aplică fiabil `padding`/`margin` pe `<div>` |
| Bordura de 1 px din jurul cardului | `border` scurtătură peste care se scriau longhand-uri; înlocuită cu bara verticală |
| `font-weight:800` | Nesuportat de motorul Word; doar 400 și 700 |
| `10.5px` | Dimensiunile fracționare se rotunjesc imprevizibil; doar valori întregi pare |

---

## Constrângeri la editare

- Fără `<style>`, `class`, `id`, `@media`, comentarii condiționale — Outlook elimină
  `<head>` când inserează semnătura.
- Fără `border-radius`, `box-shadow`, gradient, `flex`, `grid`, `float`, `position`,
  `max-width`, `opacity`, `transform`.
- Fără `<div>`; tot spațierea stă pe `<td>`.
- `line-height` întotdeauna precedat de `mso-line-height-rule:exactly`.
- Orice `<td>` nou: `bgcolor` + `background-color` + `font-family` + `<p>` intern.
- Orice text nou: diacriticele ca entități numerice.

După orice modificare, rulează din nou verificările din `verifica.py`.
