# Nucleu — infrastructura care se demonstrează singură

**Nucleu** este o alternativă completă la un furnizor clasic de servicii IT administrate (managed IT / MSP pentru IMM-uri), gândită pentru 2026 și proiectată pornind de la ce nu se va schimba nici în 2126:

- **Dovada, nu promisiunea.** Fiecare afirmație despre IT-ul clientului are un ID de dovadă (`DOV-…`), un moment și o metodă. Backup-ul se demonstrează prin restaurări lunare cronometrate.
- **Riscul în lei, nu în culori.** Pierdere anuală așteptată = probabilitate × impact, cu formula la vedere, calculată pe **geamănul digital** al firmei (graf de dependențe).
- **Intenție, nu tichete.** „Ana începe luni” declanșează tot fluxul; oamenii intervin la ce e nou.
- **Cutia de sticlă.** Portalul clientului este consola furnizorului; jurnal complet, explicat.
- **Clauza de divorț.** Fără contract minim; export complet în 24 h, în formate deschise.
- **Prețul scade în fiecare an.** Per om protejat, totul inclus, −3%/an (dividendul de automatizare), credite SLA calculate automat.

Site-ul, motorul de risc, portalul demonstrativ, cele 10 instrumente gratuite și asistentul sunt în acest repository. Tot conținutul este în limba română; datele din demonstrații sunt fictive și marcate ca atare.

## Ce conține

| Zonă | Ce face | Unde |
|---|---|---|
| Site public | Acasă, Manifest 2126, 12 capabilități, Platformă, Securitate (7 straturi), Infrastructură (geamăn), Dovezi (8 scenarii), Prețuri + calculator, 5 pagini pe segmente, Garanție, Status public, Contact, Legal (incl. Clauza de divorț) | `src/app/**` |
| Motor de domeniu | Geamăn digital (graf), propagarea căderilor, pierderi în lei, registru de risc, postură pe 7 straturi, audit auto-servit (24 întrebări), model de preț cu credite SLA | `src/lib/twin/`, `src/lib/audit.ts`, `src/lib/pricing.ts` |
| Nucleu Console (demo) | 13 module: sumar, geamăn, simulări, intenții, inventar, identități, backup, securitate, risc, rapoarte, jurnal, documente, facturare; comutator orizont 2026 → 2126 | `/portal`, `src/components/portal/` |
| Instrumente gratuite | Audit IT, simulator „ce se întâmplă dacă”, verificare e-mail (SPF/DKIM/DMARC), igienă web, cost downtime, risc backup, quiz anti-phishing, calculator preț, test viteză, verificator parole (local) | `/instrumente/*`, `src/lib/tools/`, `src/app/api/instrumente/` |
| Asistent Vega | Răspunde din baza de cunoștințe a site-ului; opțional prin Claude API dacă există `ANTHROPIC_API_KEY` | `src/lib/assistant/`, `src/app/api/asistent/` |
| Teste | Vitest pentru motor, audit, prețuri, instrumente | `tests/` |

## Rulare locală

```bash
npm install
npm run dev        # http://localhost:3000
```

Verificări (aceleași ca în CI):

```bash
npm run lint
npm run typecheck  # next typegen + tsc
npm test           # vitest
npm run build
```

Variabile opționale (vezi `.env.example`):

- `ANTHROPIC_API_KEY` — activează răspunsurile generate de model pentru asistentul Vega; fără ea, asistentul răspunde din conținutul site-ului.
- `NEXT_PUBLIC_SITE_URL` — adresa publică (metadate, sitemap).

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS v4, fonturi Geist servite local, lucide-react, zod, Vitest, Playwright (doar pentru capturi de verificare: `node scripts/shot.mjs <url> <out.png> [light|dark] [width] [fullPage]`).

Fără cookie-uri de urmărire, fără scripturi terțe, fără fonturi externe. Light și dark mode (sistem + comutator).

## Structura

```
src/app/            rute (pagini, API, sitemap, robots, OG image)
src/components/     ui/ (primitive), charts/ (SVG), site/ (chrome + secțiuni), portal/, tools/
src/lib/twin/       tipuri, firma demo, simulare, risc & postură
src/lib/audit.ts    auditul auto-servit (întrebări, scenarii, scoruri, acțiuni)
src/lib/pricing.ts  planuri, extra-opțiuni, ofertă, credite SLA
src/lib/tools/      calculatoare și verificatoare (e-mail, web, backup, downtime, parole, phishing)
src/lib/content/    tot textul: site, principii, manifest, capabilități, dovezi, segmente, FAQ
src/lib/demo/       starea firmei demonstrative (jurnal, intenții, dovezi, factură)
tests/              teste unitare
```

## Principii de proiectare a codului

- Conținutul e date (TypeScript), nu text în componente: paginile îl randează.
- Motorul de risc e pur și testabil; UI-ul îl prezintă. Aceleași funcții alimentează site-ul, portalul și instrumentele.
- Nicio funcție nu trece din componente server în componente client; graficele primesc doar date.
- Numerele demonstrative derivă din motor (registrul de risc, postura), ca să nu existe două versiuni ale adevărului.
