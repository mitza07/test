# Semnătură e-mail — Mihai Zamfir / ITISTUL.RO

Semnătură Outlook grafică și animată, construită astfel încât **animația să fie
singurul lucru care se poate pierde**. Toată identitatea — nume, logo, contacte,
structură, culori — este HTML pur. Dacă banda animată e blocată sau nu se încarcă,
în locul ei rămâne fundalul bleumarin al blocului și nimeni nu observă nimic.

![previzualizare](documentatie/previzualizare.png)

---

## Cum e construită

| Element | Cum e făcut | Ce se întâmplă dacă e blocat |
|---|---|---|
| Bloc bleumarin, bară de accent, pătrat logo | `bgcolor` pe `<td>` | nimic, nu se poate bloca |
| Nume, „ITISTUL.RO", contacte, adresă, discipline | text HTML | nimic, nu se poate bloca |
| Banda de semnal animată | 1 GIF, 508×28, **11 KB** | rămâne bleumarin curat |

O singură cerere externă la randare, pentru un fișier de 11 KB de pe domeniul tău.

### De ce e sigură deși are imagine

- GIF-ul are **exact culoarea de fundal a celulei** care îl conține (`#0a1628`),
  deci starea blocată nu lasă o gaură albă, ci se contopește cu blocul.
- **Primul cadru este desenat să arate complet** — traseu, marcaje și pachete
  distribuite pe toată lățimea. Contează pentru că Outlook Classic (motorul Word)
  desenează **doar cadrul 1** al oricărui GIF animat, în orice condiții.
- 11 KB și 14.224 px² de imagine, față de peste 400 de caractere de text: raportul
  text/imagine rămâne mult peste pragurile SpamAssassin `HTML_IMAGE_RATIO_*`.
- `width` și `height` declarate și ca atribut și în CSS, deci clientul rezervă
  spațiul corect chiar înainte să încarce imaginea și layout-ul nu sare.
- `alt=""` — banda e decorativă, deci cititoarele de ecran o sar, iar în starea
  blocată nu apare text alternativ peste bleumarin.

### Unde se vede animația

| Client | Animație |
|---|---|
| Outlook Web / new Outlook, Outlook Mac, Outlook iOS și Android | **da** |
| Gmail (web și mobil), Apple Mail, Thunderbird, Yahoo | **da** |
| **Outlook Classic pe Windows** | nu — doar cadrul 1, care e desenat să arate finisat |

Nicio limitare din tabelul de mai sus nu ține de pachetul acesta: motorul Word din
Outlook Classic nu a animat niciodată GIF-uri. De asta cadrul 1 e proiectat separat.

---

## Instalare

### Pasul 1 — urcă banda animată pe site

```
public_html/email-signature/itistul-signal.gif
```

Fișierul e în `UPLOAD-PE-SITE/email-signature/`. Verifică apoi în browser că se
deschide `https://www.itistul.ro/email-signature/itistul-signal.gif`.

### Pasul 2 — rulează instalatorul

1. Dezarhivează tot folderul pe disc (nu rula din interiorul arhivei).
2. Închide Outlook complet.
3. Dublu-clic pe `instalare/INSTALEAZA-SEMNATURA.cmd`.

Instalatorul este **batch pur** — fără PowerShell, fără `ExecutionPolicy Bypass`,
fără drepturi de administrator. Scrie doar în profilul tău (`HKCU` și `%APPDATA%`):

- face backup al semnăturii existente în `%APPDATA%\Microsoft\Signatures\_backup_ITISTUL\`;
- copiază `.htm`, `.rtf` și `.txt` în `%APPDATA%\Microsoft\Signatures\`;
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
se aplică **și în interiorul unui `.zip`**, inclusiv unul cu parolă. Folosește USB,
OneDrive/Google Drive, sau un link de descărcare de pe itistul.ro.

Dacă totuși trebuie trimis pe mail, în pachet există `INSTALEAZA-SEMNATURA.cmd.txt` —
destinatarul șterge extensia `.txt` după descărcare.

---

## Varianta fără imagini

`semnatura/varianta-fara-imagini/` este **exact același design**, fără rândul cu
banda. Zero cereri externe, nimic de blocat, nimic de urcat pe site. Folosește-o
dacă trimiți frecvent către domenii cu filtre foarte agresive.

---

## Structura pachetului

```
email-signature/
├─ semnatura/
│  ├─ Mihai Zamfir.htm          ← se copiază în %APPDATA%\Microsoft\Signatures
│  ├─ Mihai Zamfir.rtf
│  ├─ Mihai Zamfir.txt
│  ├─ fragment.html             ← doar tabelul, pentru copy-paste / new Outlook / OWA
│  ├─ itistul-signal.gif        ← copie de referință a benzii
│  └─ varianta-fara-imagini/    ← același design, fără bandă
├─ instalare/
│  ├─ INSTALEAZA-SEMNATURA.cmd
│  ├─ INSTALEAZA-SEMNATURA.cmd.txt   ← copie transportabilă pe e-mail
│  └─ DEZINSTALEAZA.cmd
├─ documentatie/
│  ├─ INSTALARE-MANUALA.md
│  ├─ DE-CE-ASA.md              ← deciziile tehnice, cu motivul fiecăreia
│  └─ previzualizare.html       ← deschide în browser
├─ UPLOAD-PE-SITE/email-signature/itistul-signal.gif
├─ genereaza-gif.py             ← regenerează banda (culori, viteză, densitate)
└─ verifica.py                  ← 312 verificări pe pachet
```

## După orice modificare

```
python3 verifica.py
```

Verifică toate constrângerile de motor Word, comportamentul la imagini blocate,
decodarea diacriticelor, integritatea datelor de contact, encoding-ul și instalatorul.
