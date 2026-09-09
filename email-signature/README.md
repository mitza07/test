# Semnătură e-mail — Mihai Zamfir / ITISTUL.RO

Semnătură Outlook reproiectată: **zero imagini**, construită exclusiv din tabele HTML
și CSS inline, ca să nu existe absolut nimic pe care un server sau un client de mail
să îl poată bloca.

![previzualizare](documentatie/previzualizare.png)

---

## Ce s-a schimbat față de varianta veche

| | Vechi | Nou |
|---|---|---|
| Lățime | 680 px | **520 px** (încape în panoul de citire și pe mobil) |
| Imagini | 1 GIF remote, 132 KB, 48 cadre | **niciuna** |
| Cereri externe la randare | 1 (GIF de pe itistul.ro) | **0** |
| Linkuri externe | 3 | 2 |
| Sursă HTML | 7.378 B | 6.257 B |
| Înălțime | ~304 px | 223 px |
| Blocuri `<div>` | 13 | 0 |
| Tabele suprapuse la nivel superior | 4 | 1 |

### De ce a dispărut banda animată din varianta implicită

1. **Outlook Classic (motorul Word) desenează doar primul cadru** al unui GIF. În
   clientul care era ținta principală, animația nu a funcționat niciodată.
2. Fiind o imagine **remote**, era blocată implicit până când destinatarul apăsa
   „Download pictures" — iar până atunci în semnătură apărea un pătrat gol cu iconița
   de imagine ruptă (se vede în comparația din `documentatie/`).
3. O imagine remote într-o semnătură este tratată euristic ca **tracking pixel** și
   crește scorul de spam.

Dacă vrei totuși animația, există în `semnatura/varianta-animata/` — vezi mai jos.

---

## Instalare

### Automat (Outlook Classic, Windows)

1. Dezarhivează tot folderul pe disc (nu rula din interiorul arhivei).
2. Închide Outlook complet.
3. Dublu-clic pe `instalare/INSTALEAZA-SEMNATURA.cmd`.

Instalatorul este **batch pur** — fără PowerShell, fără `ExecutionPolicy Bypass`, fără
drepturi de administrator. Scrie doar în profilul tău (`HKCU` și `%APPDATA%`). Face:

- backup al semnăturii existente în `%APPDATA%\Microsoft\Signatures\_backup_ITISTUL\`;
- copiază `.htm`, `.rtf` și `.txt` în `%APPDATA%\Microsoft\Signatures\`;
- setează semnătura ca implicită pentru mesaje noi și pentru răspunsuri;
- marchează `.htm` ca **read-only**, ca Outlook să nu rescrie fișierul prin
  serializatorul Word (asta e cauza clasică pentru „mi s-a stricat semnătura singură");
- dezactivează **semnăturile roaming** Microsoft 365, care altfel suprascriu din cloud
  fișierul local.

Pentru varianta animată: `INSTALEAZA-SEMNATURA.cmd animat`.

Anulare completă: `instalare/DEZINSTALEAZA.cmd`.

> Pentru a reveni la editarea semnăturii din Outlook:
> `attrib -R "%APPDATA%\Microsoft\Signatures\Mihai Zamfir.htm"`

### Manual (orice Outlook, inclusiv new Outlook, Web și Mac)

Vezi `documentatie/INSTALARE-MANUALA.md`. Nu necesită niciun script.

---

## Cum transporți pachetul

**Nu trimite arhiva pe e-mail.** `.cmd`, `.ps1` și `.bat` sunt pe lista de extensii
blocate atât la Google Workspace cât și la Exchange Online Protection, iar blocarea se
aplică **și în interiorul unui `.zip`**, inclusiv unul cu parolă. Folosește USB,
OneDrive/Google Drive, sau un link de descărcare de pe itistul.ro.

Dacă totuși trebuie trimis pe mail, în pachet există `INSTALEAZA-SEMNATURA.cmd.txt` —
destinatarul șterge extensia `.txt` după descărcare.

---

## Varianta animată (opțională)

`semnatura/varianta-animata/` conține aceeași semnătură plus o bandă animată de 472×24 px.

GIF-ul a fost refăcut de la zero: **8,4 KB** în loc de 132 KB, în paleta nouă, iar
**primul cadru arată complet și finisat** — pentru că în Outlook Classic acela este
singurul cadru care se vede vreodată.

Pași:

1. Urcă `UPLOAD-PE-SITE/email-signature/itistul-pulse.gif` pe hosting, în
   `public_html/email-signature/`.
2. Verifică în browser că se deschide:
   `https://www.itistul.ro/email-signature/itistul-pulse.gif`
3. Rulează `instalare/INSTALEAZA-SEMNATURA.cmd animat`.

Ce trebuie să știi înainte: în Outlook Classic banda va fi **statică**, la mulți
destinatari va fi **blocată** până apasă „Download pictures", și readuce în semnătură
o cerere HTTP externă. Celula care o conține are fundal alb declarat explicit, deci
starea blocată arată ca spațiu gol, nu ca o imagine ruptă.

Recomandarea rămâne varianta implicită, fără imagini.

---

## Structura pachetului

```
email-signature/
├─ semnatura/
│  ├─ Mihai Zamfir.htm          ← se copiază în %APPDATA%\Microsoft\Signatures
│  ├─ Mihai Zamfir.rtf
│  ├─ Mihai Zamfir.txt
│  ├─ fragment.html             ← doar tabelul, pentru copy-paste / new Outlook / OWA
│  └─ varianta-animata/         ← aceleași fișiere + banda GIF
├─ instalare/
│  ├─ INSTALEAZA-SEMNATURA.cmd
│  ├─ INSTALEAZA-SEMNATURA.cmd.txt   ← copie transportabilă pe e-mail
│  └─ DEZINSTALEAZA.cmd
├─ documentatie/
│  ├─ INSTALARE-MANUALA.md
│  ├─ DE-CE-ASA.md              ← deciziile tehnice, cu motivul fiecăreia
│  └─ previzualizare.html       ← deschide în browser
└─ UPLOAD-PE-SITE/email-signature/itistul-pulse.gif
```
