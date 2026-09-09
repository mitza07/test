# Semnătură e-mail — Mihai Zamfir / ITISTUL.RO

Semnătură Outlook grafică și animată, **fără nimic de urcat pe site**.

![previzualizare](documentatie/previzualizare.png)

---

## Cum funcționează animația fără hosting

Banda animată stă local, în folderul companion al semnăturii:

```
%APPDATA%\Microsoft\Signatures\
    Mihai Zamfir.htm
    Mihai Zamfir_files\
        itistul-signal.gif      ← 11 KB
        filelist.xml
```

La fiecare mesaj, Outlook **atașează imaginea inline în mesaj** (`Content-ID`, sau
CID) și rescrie automat `src`-ul. Este exact mecanismul nativ pe care îl folosește
editorul de semnături din Outlook când inserezi o poză.

De aici vine avantajul real:

> Blocarea automată a imaginilor din clienții de mail se aplică **doar imaginilor
> remote**. O imagine atașată inline face parte din mesaj, deci se afișează
> întotdeauna — fără bara „Click here to download pictures".

Ce dispare complet față de varianta cu GIF hostat:

- nimic de urcat pe itistul.ro, nimic de întreținut;
- nicio cerere HTTP externă la deschiderea mesajului;
- niciun risc de hotlink 403, certificat expirat sau `Content-Type` greșit;
- nicio euristică de tracking pixel — nu există URL de urmărit;
- nicio gazdă de imagine expusă la liste URIBL.

Costul: mesajul crește cu 11 KB, iar unele gateway-uri foarte stricte scanează
atașamentele inline. În practică semnăturile cu imagini inline sunt printre cele
mai comune mesaje de pe internet, deci nu constituie un semnal de spam.

---

## Cum e construită

| Element | Cum e făcut | Dacă lipsește |
|---|---|---|
| Bloc bleumarin, bară de accent, pătrat logo | `bgcolor` pe `<td>` | nu se poate pierde |
| Nume, ITISTUL.RO, contacte, adresă, discipline | text HTML | nu se poate pierde |
| Banda de semnal animată | 1 GIF inline, 508×28, 11 KB | rămâne bleumarin curat |

Detalii care contează:

- Fundalul GIF-ului este **exact** `#0a1628`, aceeași valoare ca `bgcolor`-ul celulei
  care îl conține. Dacă din orice motiv banda nu ajunge la destinatar, în locul ei
  rămâne fundal bleumarin — nu o imagine ruptă, nu un gol alb, layout neschimbat.
- **Cadrul 1 este desenat separat**, cu traseu complet, marcaje și patru pachete
  distribuite pe lățime. Motorul Word din Outlook Classic desenează doar cadrul 1
  al oricărui GIF animat — nu e o limitare a acestui pachet și nu se poate ocoli,
  deci acel cadru trebuie să arate ca un grafic terminat.
- `width` și `height` declarate și ca atribut și în CSS: spațiul e rezervat înainte
  de încărcare, layout-ul nu sare.
- `alt=""` — element decorativ: cititoarele de ecran îl sar.

### Unde se vede animația

| Client | Animație |
|---|---|
| Outlook Web / new Outlook, Outlook Mac, Outlook iOS și Android | **da** |
| Gmail, Apple Mail, Thunderbird, Yahoo | **da** |
| **Outlook Classic pe Windows** | nu — doar cadrul 1, care e desenat să arate finisat |

---

## Instalare

1. Dezarhivează tot folderul pe disc (nu rula din interiorul arhivei).
2. Închide Outlook complet.
3. Dublu-clic pe `instalare/INSTALEAZA-SEMNATURA.cmd`.

Atât. Nu mai e niciun pas de upload.

Instalatorul este **batch pur** — fără PowerShell, fără `ExecutionPolicy Bypass`,
fără drepturi de administrator. Scrie doar în profilul tău (`HKCU` și `%APPDATA%`):

- face backup al semnăturii existente, inclusiv folderul companion, în
  `%APPDATA%\Microsoft\Signatures\_backup_ITISTUL\`;
- copiază `.htm`, `.rtf`, `.txt` **și** folderul `Mihai Zamfir_files\`;
- o setează implicită pentru mesaje noi și pentru răspunsuri;
- marchează `.htm` **read-only**, ca Outlook să nu rescrie fișierul prin
  serializatorul Word — cauza clasică pentru „mi s-a stricat semnătura singură";
- dezactivează **semnăturile roaming** Microsoft 365, care altfel suprascriu din
  cloud fișierul local.

Variantă fără nicio imagine: `INSTALEAZA-SEMNATURA.cmd fara-imagini`
Anulare completă: `instalare/DEZINSTALEAZA.cmd`

> Ca să poți edita din nou semnătura din Outlook:
> `attrib -R "%APPDATA%\Microsoft\Signatures\Mihai Zamfir.htm"`

### Manual, fără niciun script

Vezi `documentatie/INSTALARE-MANUALA.md` — acoperă Outlook Classic, new Outlook,
OWA, Mac și mobil.

---

## Cum transporți pachetul

**Nu trimite arhiva pe e-mail.** `.cmd`, `.ps1` și `.bat` sunt pe lista de extensii
blocate atât la Google Workspace cât și la Exchange Online Protection, iar blocarea
se aplică **și în interiorul unui `.zip`**, inclusiv unul cu parolă. Folosește USB
sau un folder din OneDrive/Google Drive.

Dacă totuși trebuie trimis pe mail, în pachet există `INSTALEAZA-SEMNATURA.cmd.txt` —
destinatarul șterge extensia `.txt` după descărcare.

---

## Varianta fără imagini

`semnatura/varianta-fara-imagini/` este **exact același design**, fără rândul cu
banda și fără folder companion. Zero imagini, mesaje mai mici. Folosește-o dacă
trimiți frecvent către domenii cu filtre foarte agresive pe atașamente.

---

## Structura pachetului

```
email-signature/
├─ semnatura/
│  ├─ Mihai Zamfir.htm          ← se copiază în %APPDATA%\Microsoft\Signatures
│  ├─ Mihai Zamfir.rtf
│  ├─ Mihai Zamfir.txt
│  ├─ Mihai Zamfir_files/       ← banda animată, atașată inline de Outlook
│  │  ├─ itistul-signal.gif
│  │  └─ filelist.xml
│  ├─ fragment.html             ← doar tabelul, pentru copy-paste
│  └─ varianta-fara-imagini/    ← același design, fără bandă
├─ instalare/
│  ├─ INSTALEAZA-SEMNATURA.cmd
│  ├─ INSTALEAZA-SEMNATURA.cmd.txt   ← copie transportabilă pe e-mail
│  └─ DEZINSTALEAZA.cmd
├─ documentatie/
│  ├─ INSTALARE-MANUALA.md
│  ├─ DE-CE-ASA.md              ← deciziile tehnice, cu motivul fiecăreia
│  └─ previzualizare.html       ← deschide în browser
├─ genereaza-gif.py             ← regenerează banda (culori, viteză, densitate)
└─ verifica.py                  ← 318 verificări pe pachet
```

## După orice modificare

```
python3 verifica.py
```
