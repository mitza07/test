# Instalare manuală — fără niciun script

Pachetul conține **trei** semnături. Repetă pașii de mai jos pentru fiecare:

- `Mihai Zamfir` — din folderul `semnatura/`
- `Mihai Zamfir - Clasic` — din folderul `semnatura-clasic/`
- `Mihai Zamfir - Signet` — din folderul `semnatura-signet/` (fără folder companion: n-are imagini)

Fiecare are folderul ei companion (`<nume>_files`), care trebuie copiat odată cu
fișierele.

Folosește această cale dacă `.cmd`-ul este blocat de politica firmei, de Defender,
de SmartScreen sau dacă pur și simplu preferi să faci totul de mână.

---

## Outlook Classic (Windows)

### Varianta A — prin dialogul Outlook (cea mai simplă)

1. Deschide `documentatie/previzualizare.html` în browser (Edge sau Chrome).
2. Selectează semnătura din caseta „NOU" — de la marginea din stânga a liniei
   albastre până sub rândul `INFRASTRUCTURĂ · SUPORT · …` — și **Ctrl+C**.
3. În Outlook: **File → Options → Mail → Signatures…**
4. **New**, denumește-o `Mihai Zamfir`, apoi **Ctrl+V** în caseta de editare.
5. Dreapta sus, la **Choose default signature**, alege `Mihai Zamfir` atât la
   **New messages** cât și la **Replies/forwards**.
6. **OK**, apoi trimite-ți un e-mail de test.

### Varianta B — copiere directă a fișierelor (mai fidelă)

1. Închide Outlook complet.
2. Apasă **Win+R**, scrie `%APPDATA%\Microsoft\Signatures` și Enter.
3. Copiază acolo cele trei fișiere din `semnatura/` **și folderul companion**:
   `Mihai Zamfir.htm`, `Mihai Zamfir.rtf`, `Mihai Zamfir.txt` și folderul
   `Mihai Zamfir_files\` cu tot ce e în el.

   Folderul companion este obligatoriu: de acolo ia Outlook banda animată și o
   atașează inline în fiecare mesaj. Fără el semnătura funcționează, dar în locul
   benzii rămâne fundalul bleumarin.
4. Clic-dreapta pe `Mihai Zamfir.htm` → **Properties** → bifează **Read-only** → OK.
   *(împiedică Outlook să rescrie fișierul prin serializatorul Word)*
5. Deschide Outlook → **File → Options → Mail → Signatures…** și alege
   `Mihai Zamfir` la **New messages** și la **Replies/forwards**.

---

## New Outlook (Windows) și Outlook pe web (OWA)

Aceste versiuni **nu citesc** `%APPDATA%\Microsoft\Signatures`. Semnătura se lipește
din browser, iar imaginea este preluată și încărcată automat de client la lipire:

1. Deschide `documentatie/previzualizare.html` în browser.
2. Selectează semnătura din caseta „NOU" și **Ctrl+C**.
3. **Settings (roata dințată) → Accounts → Signatures**.
4. **+ New signature**, denumește-o `ITISTUL`, **Ctrl+V** în editor.
5. Sub editor, alege semnătura pentru **New messages** și pentru **Replies/forwards**.
6. **Save**.

---

## Outlook pentru Mac

1. **Outlook → Settings → Signatures → +**
2. Lipește semnătura copiată din browser (pașii de mai sus).
3. La **Choose default signature**, selecteaz-o pentru contul tău.

---

## Outlook pentru iPhone / Android

Aplicațiile mobile acceptă doar **text simplu** la semnătură. Folosește conținutul din
`semnatura/Mihai Zamfir.txt`.

**Settings → contul tău → Signature**.

---

## Semnăturile roaming (Microsoft 365)

Dacă ai Microsoft 365 și semnătura se schimbă singură înapoi după câteva minute, cauza
sunt **semnăturile roaming**: Outlook sincronizează semnătura din cloud și suprascrie
fișierul local.

Dezactivare, în **Registry Editor** (`regedit`):

```
Cale:    HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Setup
Valoare: DisableRoamingSignaturesTemporaryToggle
Tip:     DWORD (32-bit)
Date:    1
```

Repornește Outlook după modificare.

---

## Verificare finală

Trimite-ți un e-mail de test și verifică:

- [ ] apare în Outlook Classic pe Windows;
- [ ] apare corect pe telefon (iPhone / Android);
- [ ] diacriticele sunt intacte: **MENTENANȚĂ**, **INFRASTRUCTURĂ**, **București**, **România**;
- [ ] numărul de telefon nu este rupt pe două rânduri;
- [ ] numele și numărul nu sunt subliniate albastru de detectorul iOS;
- [ ] răspunde la propriul mesaj de 2–3 ori și verifică cum arată citată repetat.
