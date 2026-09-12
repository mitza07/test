# Propunere — ce folosești, cum, și ce mai contează

Am construit 39 de semnături ca să putem alege în cunoștință de cauză. Aici e alegerea,
cu motivele, pe baza a tot ce am aflat pe parcurs.

## Ce am aflat, pe scurt

1. **Pe mașina ta, imaginile locale nu se atașează.** Mecanismul companion (`_files`) a produs
   legături `file:///` moarte; nici `Send Pictures With Document`, nici scoaterea read-only
   n-au schimbat asta. Singura sursă de imagini care funcționează e una **remote** (GitHub raw).
2. **Imaginile remote sunt blocate implicit în Outlook Classic** la un destinatar care nu te
   are în Contacts / Safe Senders; apar după „Download pictures". În Gmail, Apple Mail,
   telefon și la cine te are în Contacts apar direct.
3. **Celulele și textul se văd oricum**, la toată lumea, mereu.
4. **Domeniul tău are o problemă reală de livrare** care contează mai mult decât orice
   semnătură — vezi mai jos.

Concluzia de design: semnătura de zi cu zi trebuie să arate bine **și** în starea cu
imaginile blocate, pentru că aceea e starea de la primul mesaj către un client nou pe Outlook.

## Alegerea

| Rol | Semnătura | De ce |
|---|---|---|
| **Mesaje noi** | `Mihai Zamfir - Aur` | Registrul negru/auriu pe care l-ai vrut (Theo Wilton), cu poza ta. Rama dublă, bara aurie, textul și linkurile sunt **celule** — se văd oricum. Singura imagine e portretul, mic (72 px), în medalion: dacă e blocat, rămâne o casetă mică în ramă aurie, nu o gaură în semnătură. |
| **Răspunsuri** | `Mihai Zamfir - Aur mini` | Un singur rând, același negru/auriu, **zero imagini**. Într-un fir de 5–6 răspunsuri nu se adună casete blocate și mesajul rămâne ușor (sub pragul la care Gmail taie cu „Message clipped"). |
| **Ocazii** (felicitări, oferte, mesaje unde vrei spectacol) | `Mihai Zamfir - Lux 2 (img)` sau `Lux 7 (img)` | Cea mai fidelă „luxury": mandale, rama floare, poza. E o imagine, deci la un client nou pe Outlook apare după „Download pictures" — de aceea nu e implicita, dar pentru un mesaj de sărbători către clienți care te au în contacte e exact ce trebuie. Se comută din `Message > Signature`. |

De ce **nu** Lux ca implicită, deși e cea mai spectaculoasă: în HTML are 2–3 imagini
(ornamente + poză), deci în starea blocată sunt 2–3 casete pe un card negru; ca imagine,
dispare toată în starea blocată. Aur are o singură imagine, mică, și tot restul din celule.

De ce **nu** Signet/Puls (zero imagini): sunt cele mai sigure, dar n-au poza și n-au
registrul auriu pe care l-ai cerut de la început. Rămân în pachet ca alternativă dacă vrei
vreodată „nimic de blocat" pur.

## Instalare pentru alegerea asta

Outlook închis, PowerShell fără admin:

```powershell
$d="$env:TEMP\itistul-sig"; Remove-Item $d -Recurse -Force -ErrorAction SilentlyContinue
git clone -q --depth 1 -b claude/outlook-signature-rgtetg https://github.com/mitza07/test $d
& "$d\email-signature\instalare\INSTALEAZA-SEMNATURA.cmd" aur raspuns=aur-mini
```

Adaugă `minimal` la sfârșit dacă vrei în Outlook doar cele două alese, nu toate 39.
Pentru ocazii, rulează fără `minimal` (le ai pe toate în listă) și comuți din mesaj.

## Ce contează mai mult decât semnătura: DNS-ul de pe itistul.ro

Am verificat înregistrările publice ale domeniului:

- **SPF: ai două înregistrări** (`v=spf1 include:relay.romarg.net include:spf.sendmachine.info -all`
  și `v=spf1 include:relay.romarg.net -all`). Standardul (RFC 7208) cere **exact una**; cu două,
  verificarea SPF dă *permerror* la Gmail, Microsoft și la orice server care respectă standardul —
  adică mesajele tale **nu trec SPF**, indiferent de semnătură. Remediul: ștergi una și păstrezi
  o singură înregistrare cu ambele `include`:
  `v=spf1 include:relay.romarg.net include:spf.sendmachine.info -all`.
- **DKIM** există (`default._domainkey`) — bine; asta te ține în picioare acum.
- **DMARC** e `p=none` fără adresă de rapoarte. Pasul corect: `v=DMARC1; p=none; rua=mailto:dmarc@itistul.ro`
  câteva săptămâni (primești rapoarte cine trimite în numele domeniului), apoi `p=quarantine`.

Asta se face din panoul DNS al domeniului (unde ai și înregistrările `google-site-verification`),
durează cinci minute și are efect mai mare asupra „să nu fiu blocat de servere" decât toate
cele 39 de semnături la un loc.

## Următorii pași, în ordinea în care merită făcuți

1. Corectezi SPF-ul (o singură înregistrare) și DMARC-ul cu `rua`.
2. Instalezi `aur raspuns=aur-mini`, îți trimiți un test la o adresă Gmail și una Outlook și te
   uiți la ambele stări (cu și fără „Download pictures").
3. Când ai o poză de la brâu în sus, o urci în același loc; regenerez cele trei panouri-bust
   (Noir 1, Mono 1–2) într-o comandă.
4. Opțional: dacă ai LinkedIn/Facebook de firmă, pun iconițele reale în locul celor de
   telefon/mail/web din Noir/Mono.
