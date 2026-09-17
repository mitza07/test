/* ===========================================================================
   EPUB 3 — construit direct, fara biblioteci, ca sa controlam exact ce intra.
   Hartile raman SVG, deci scaleaza fara pierdere la orice marime de ecran.
   =========================================================================== */
import { writeFileSync, mkdirSync, rmSync, cpSync, readFileSync, existsSync } from 'fs'
import { execFileSync } from 'child_process'
import { HARTI } from '../build/harti.mjs'
import { bandaCronologica } from '../build/cronograf.mjs'
import { bandaVietilor } from '../build/vieti.mjs'
import { toateTabelele, sectiuneTabel } from '../build/tabele.mjs'
import { diagramaTeritoriu, diagramaPopulatie, diagramaLexic, diagramaEtnic } from '../build/diagrame.mjs'
import { PLAN, PLAN_TEME } from '../build/build.mjs'
import { tipografic } from '../build/tipo.mjs'

const RAD = new URL('./', import.meta.url).pathname
const OUT = RAD + '.epub-lucru'
const esc = (s) => tipografic(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ROMAN = ['', 'I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII',
  'XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV',
  'XXV','XXVI','XXVII','XXVIII']

const TITLU = 'Istoria României'
const SUBTITLU = 'în 3.026 de ani'
const AUTOR = '[numele autorului]'
const LIMBA = 'ro'
const UID = 'urn:uuid:3c0a6f2e-9b41-4d77-8e55-istoria-romaniei-2026'

const DIAG = { populatie: diagramaPopulatie, lexic: diagramaLexic, etnic: diagramaEtnic, teritoriu: diagramaTeritoriu }
const SUBT_DIAG = {
  populatie: ['Populația României la recensăminte, 1859–2021', 'Creșterea până în 1992 și pierderea a 3,8 milioane de locuitori în cele trei decenii următoare sunt cele două fapte demografice majore ale istoriei recente.'],
  lexic: ['Din ce e făcută limba română', 'Proporțiile sunt calculate de Marius Sala pe vocabularul reprezentativ, de 2.581 de cuvinte.'],
  etnic: ['Structura etnică, 1930 și 2021', 'La recensământul din 2021, circa 9 la sută dintre locuitori nu și-au declarat etnia; procentele se raportează la cei care au declarat-o.'],
  teritoriu: ['Suprafața statului român, 1859–2026', 'Șapte configurații teritoriale în 167 de ani.'],
}
const TEME_TITLU = { limba: 'Limba română', religie: 'Religie și Biserică', minoritati: 'Minoritățile',
  cultura: 'Cultură și știință', economie: 'Economia și societatea', geografie: 'Pământul și oamenii' }

const STIL = `
@font-face { font-family: "Literata"; font-weight: normal; font-style: normal;
  src: url("fonturi/Literata-400.ttf"); }
@font-face { font-family: "Literata"; font-weight: normal; font-style: italic;
  src: url("fonturi/Literata-400i.ttf"); }
@font-face { font-family: "Literata"; font-weight: bold; font-style: normal;
  src: url("fonturi/Literata-600.ttf"); }
@font-face { font-family: "Spectral"; font-weight: normal; font-style: normal;
  src: url("fonturi/Spectral-300.ttf"); }
@font-face { font-family: "Spectral"; font-weight: bold; font-style: normal;
  src: url("fonturi/Spectral-600.ttf"); }

html, body { margin: 0; padding: 0; }
body { font-family: "Literata", Georgia, serif; line-height: 1.55; text-align: justify;
  hyphens: auto; -epub-hyphens: auto; padding: 0 0.6em; }
h1, h2, h3 { font-family: "Spectral", Georgia, serif; font-weight: normal;
  text-align: left; hyphens: none; page-break-after: avoid; line-height: 1.2; }
h1 { font-size: 1.7em; margin: 1.4em 0 0.2em; }
h2 { font-size: 1.15em; font-weight: bold; margin: 1.6em 0 0.4em; }
p { margin: 0; text-indent: 1.3em; }
p.prim, p.rezumat, p.fara-alineat { text-indent: 0; }
p + p { margin-top: 0; }
.eticheta { font-size: 0.72em; letter-spacing: 0.14em; text-transform: uppercase;
  opacity: 0.62; text-align: left; text-indent: 0; margin-bottom: 0.4em; }
.perioada { font-size: 0.82em; opacity: 0.68; text-align: left; text-indent: 0;
  border-top: 1px solid currentColor; padding-top: 0.4em; margin: 0.6em 0 1.4em; }
.rezumat { font-family: "Spectral", Georgia, serif; font-style: italic; opacity: 0.86;
  margin-bottom: 1.4em; }
figure { margin: 1.6em 0; page-break-inside: avoid; text-align: center; }
figure svg { max-width: 100%; height: auto; }
figure.ilustratie img { max-width: 100%; max-height: 88vh; height: auto; }
figure.ilustratie figcaption .sursa { display: block; margin-top: .35em;
  font-size: .88em; opacity: .82; font-style: italic; }
figcaption { font-size: 0.76em; line-height: 1.45; opacity: 0.78; text-align: left;
  margin-top: 0.5em; padding-top: 0.4em; border-top: 1px solid currentColor; hyphens: none; }
blockquote { margin: 1.4em 0; padding-left: 1em; border-left: 2px solid currentColor;
  font-family: "Spectral", Georgia, serif; font-style: italic; }
blockquote p { text-indent: 0; }
.sursa { font-size: 0.78em; opacity: 0.7; text-align: left; text-indent: 0; margin-top: 0.5em; }
.cifra { margin-bottom: 0.7em; text-indent: 0; text-align: left; }
.cifra b { font-size: 1.05em; }
.cifra em { display: block; font-size: 0.85em; opacity: 0.7; font-style: normal; }
.pers { margin-bottom: 1em; text-indent: 0; text-align: left; }
.pers .nume { font-family: "Spectral", Georgia, serif; font-weight: bold; }
.pers .ani { font-size: 0.85em; opacity: 0.68; }
.pers .rol { font-style: italic; opacity: 0.8; display: block; font-size: 0.9em; }
dl { margin: 1em 0; }
dt { font-weight: bold; font-size: 0.86em; margin-top: 0.7em; }
dd { margin: 0.1em 0 0 0; font-size: 0.92em; text-align: left; }
.caseta { border: 1px solid currentColor; padding: 0.8em; margin: 1.5em 0; font-size: 0.92em;
  text-align: left; }
.caseta p { text-indent: 0; }
.coperta { text-align: center; margin: 0; padding: 0; }
/* Fara plafon de inaltime, coperta de 1600x2560 se taie jos intr-un cititor
   paginat — si acolo sta numele autorului. */
.coperta img { max-width: 100%; max-height: 96vh; width: auto; height: auto; }
table { border-collapse: collapse; width: 100%; font-size: 0.78em; }
th, td { text-align: left; vertical-align: top; padding: 0.3em 0.5em 0.3em 0;
  border-bottom: 1px solid currentColor; hyphens: none; }
td, th { border-bottom-color: currentColor; }
tbody td { opacity: 0.92; }
th { font-size: 0.86em; letter-spacing: 0.07em; text-transform: uppercase; opacity: 0.66;
  border-bottom: 1px solid currentColor; }
td.num, th.num { white-space: nowrap; }
.tabel-intro { text-indent: 0; font-size: 0.85em; opacity: 0.72; margin-bottom: 0.8em; }
figure.banda-timp { margin: 1.1em 0; page-break-inside: avoid; }
figure.banda-timp svg { width: 100%; height: auto; display: block; }
.legenda-harta { text-indent: 0; text-align: left; font-size: 0.72em; line-height: 1.7;
  opacity: 0.82; margin: 0.4em 0 0; }
.legenda-harta span { margin-right: 1.1em; white-space: nowrap; }
.legenda-harta i { display: inline-block; width: 1.5em; height: 0.72em; margin-right: 0.35em;
  vertical-align: -0.08em; border: 1px solid currentColor; font-style: normal; }
.legenda-harta i.simb { border: 0; width: auto; height: auto; }
.legenda-harta i.lin { border: 0; border-top: 2px solid #a6321c; height: 0; vertical-align: 0.2em; }
.legenda-harta i.lin-punct { border: 0; border-top: 2px dashed #a6321c; height: 0; vertical-align: 0.2em; }
`


/* --- stilul hartilor, diagramelor si benzilor cronologice ------------------
   SVG-urile vin din atlas.js si din diagrame.mjs cu clase, nu cu culori scrise
   in cale. Fara regulile lor, un cititor de carti electronice umple fiecare
   cale cu negru: pana acum fiecare harta din EPUB era un dreptunghi negru.
   Se scot deci regulile din foaia de stil a editiei de web si se pun aici, cu
   variabilele deja rezolvate — unele cititoare nu le inteleg. */
/* Clasele folosite in SVG-urile chiar generate. Se string pe masura ce se
   compun figurile, ca foaia de stil sa fie facuta dupa ele, nu dupa o lista
   scrisa de mana care ramane in urma la fiecare clasa noua. Exact asa au ajuns
   hartile sa fie dreptunghiuri negre: clasa exista, regula nu. */
const CLASE_SVG = new Set()
function strangeClase(svg) {
  for (const m of String(svg).matchAll(/class="([^"]+)"/g))
    for (const c of m[1].trim().split(/\s+/)) if (c) CLASE_SVG.add(c)
  return svg
}

function stilulFigurilor(caleCss, folosite) {
  const css = readFileSync(caleCss, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

  /* Blocurile de variabile: cel luminos si cel intunecat. Se duc asa cum sunt
     in foaia EPUB-ului, nu se rezolva pe loc. Diagramele au culorile scrise in
     atribut — fill="var(--m-a)" — si o regula copiata nu le ajuta cu nimic:
     fara variabile, cititorul umple bara cu negru. Asa se pastreaza si
     varianta de noapte, pe care majoritatea cititoarelor o au. */
  const bloc = (dela) => {
    const k = css.indexOf('{', dela)
    return css.slice(k + 1, css.indexOf('}', k))
  }
  const variabile = (text) => [...text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
    .map((m) => `  ${m[1]}: ${m[2].trim()};`).join('\n')

  const zi = variabile(bloc(css.indexOf(':root')))
  const iNoapte = css.indexOf(':root[data-theme="dark"]')
  const noapte = iNoapte > 0 ? variabile(bloc(iNoapte)) : ''

  const vrem = (sel) => {
    const clase = [...sel.matchAll(/\.([\w-]+)/g)].map((m) => m[1])
    return clase.length > 0 && clase.some((c) => folosite.has(c))
  }
  /* blocurile @media poarta varianta intunecata a regulilor; se scot, fiindca
     variabilele de mai sus fac aceeasi treaba, o singura data */
  let curat = '', ii = 0
  for (; ii < css.length; ii++) {
    if (css.startsWith('@media', ii)) {
      let k = css.indexOf('{', ii), m = 0
      do { if (css[k] === '{') m++; if (css[k] === '}') m--; k++ } while (m > 0 && k < css.length)
      ii = k - 1
      continue
    }
    curat += css[ii]
  }

  const out = [], petice = []
  for (const b of curat.split('}')) {
    const k = b.indexOf('{')
    if (k < 0) continue
    const sel = b.slice(0, k).trim(), corp = b.slice(k + 1).trim()
    if (!vrem(sel) || !corp) continue
    out.push(`${sel} { ${corp} }`)
    /* petecul din legenda e un <i> de HTML: "fill" nu-l coloreaza, ii trebuie
       fundal. Se ia chiar valoarea din regula tonului, ca sa nu se desparta. */
    const t = sel.match(/^\.(m-t[a-g])$/)
    const f = corp.match(/fill:\s*([^;]+)/)
    if (t && f) petice.push(`.legenda-harta i.${t[1]} { background: ${f[1].trim()}; }`)
    const h = sel.match(/^\.(leg-h[0-4])$/)
    if (h) petice.push(`.legenda-harta i.${h[1]} { ${corp} }`)
  }
  return `:root {\n${zi}\n}\n` +
    (noapte ? `@media (prefers-color-scheme: dark) {\n:root {\n${noapte}\n}\n}\n` : '') +
    out.concat(petice).join('\n')
}

/* ---- continut ------------------------------------------------------------ */
const continut = JSON.parse(readFileSync(RAD + '../build/continut.json', 'utf8'))
const capById = Object.fromEntries(continut.capitole.map((c) => [c.id, c]))
const temeById = Object.fromEntries(continut.teme.map((c) => [c.id, c]))
const cap = PLAN.map((p) => ({ ...p, ...(capById[p.id] || {}) })).filter((c) => c.sectiuni?.length)
const teme = PLAN_TEME.map((p) => ({ ...p, titlu: TEME_TITLU[p.id], ...(temeById[p.id] || {}) })).filter((c) => c.sectiuni?.length)

let nrFig = 0
function figHarta(cheie) {
  const h = HARTI[cheie]; if (!h) return ''
  const { vb, body } = h.spec()
  const n = ++nrFig
  /* legenda lipsea din EPUB: fara ea, tonurile hartii nu spun nimic */
  const semn = (t) => {
    if (t === 'ceda') return '<i class="lin-punct"></i>'
    if (t === 'campanie') return '<i class="lin"></i>'
    if (t === 'hasu') return '<i class="hasu"></i>'
    if (t === 'batalie') return '<i class="simb">✕</i>'
    if (t === 'sit') return '<i class="simb">▲</i>'
    if (t === 'oras') return '<i class="simb">●</i>'
    if (t === 'capitala') return '<i class="simb">◉</i>'
    return `<i class="${/^h[0-4]$/.test(t) ? "leg-" + t : "m-t" + t}"></i>`
  }
  const leg = (h.legenda || []).map(([t, txt]) => `<span>${strangeClase(semn(t))}${esc(txt)}</span>`).join('')
  CLASE_SVG.add('diagrama')
  return `<figure><svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(h.titlu)}">${strangeClase(body)}</svg>
${leg ? `<p class="legenda-harta">${leg}</p>` : ''}
<figcaption><b>Harta ${n}. ${esc(h.titlu)}</b> ${esc(h.jos)}</figcaption></figure>`
}
function figDiagrama(cheie) {
  const gen = DIAG[cheie]; if (!gen) return ''
  const { vb, body } = gen()
  const [t, j] = SUBT_DIAG[cheie]
  const n = ++nrFig
  return `<figure><svg xmlns="http://www.w3.org/2000/svg" class="diagrama" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(t)}">${strangeClase(body)}</svg>
<figcaption><b>Diagrama ${n}. ${esc(t)}</b> ${esc(j)}</figcaption></figure>`
}

/* --- ilustratiile de arhiva ------------------------------------------------ */
const ILUSTRATII = {}
if (existsSync(RAD + 'ilustratii/manifest.json'))
  for (const m of JSON.parse(readFileSync(RAD + 'ilustratii/manifest.json', 'utf8'))) {
    /* varianta de ecran, nu cea de tipar: un EPUB de 136 MB s-ar plati la
       livrare, pe megaoctet, la fiecare exemplar vandut */
    const redus = RAD + (process.env.EPUB_MIC ? 'ilustratii/il/' : 'ilustratii/ecran/') + m.local.split('/').pop()
    if (!existsSync(redus)) continue
    ;(ILUSTRATII[m.cap] = ILUSTRATII[m.cap] || []).push({ ...m, redus })
  }
let nrIl = 0
const pozeIncluse = []
function figIlustratie(m) {
  const n = ++nrIl
  const nume = `il/${String(n).padStart(3, '0')}.jpg`
  cpSync(m.redus, OUT + '/OEBPS/' + nume)
  pozeIncluse.push(nume)
  const credit = [m.autor, m.data, m.sursa, /domeniu public/i.test(m.tipLicenta) ? 'domeniu public' : m.licenta]
    .filter(Boolean).join(' · ')
  return `<figure class="ilustratie"><img src="${nume}" alt="${esc(m.legenda).slice(0, 200)}"/>
<figcaption><b>Ilustrația ${n}.</b> ${esc(m.legenda)} <span class="sursa">${esc(credit)}</span></figcaption></figure>`
}

/* Benzile de timp lipseau cu totul din EPUB, desi sunt in web si in tipar:
   inca un caz in care acelasi continut ajunge intr-un format si nu in altul. */
function banda(b, eticheta) {
  if (!b) return ''
  return `<figure class="banda-timp"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(eticheta)}">${strangeClase(b.body)}</svg></figure>`
}

function corpul(c) {
  let s = ''
  if (c.rezumat) s += `<p class="rezumat">${esc(c.rezumat)}</p>`
  s += banda(bandaCronologica(c, { de: -6000, la: 2026 }), 'Reperele capitolului, la scară')
  /* pozele se intercaleaza intre sectiuni, ca in editia tiparita */
  const poze = ILUSTRATII[c.id] || []
  const sectiuni = c.sectiuni || []
  const intre = sectiuni.length > 1 ? Math.floor(poze.length / sectiuni.length) : 0
  let k = 0
  sectiuni.forEach((sec, j) => {
    s += `<h2>${esc(sec.subtitlu)}</h2>`
    ;(sec.paragrafe || []).forEach((p, i) => { s += `<p${i === 0 ? ' class="prim"' : ''}>${esc(p)}</p>` })
    if (j < sectiuni.length - 1) { s += poze.slice(k, k + intre).map(figIlustratie).join(''); k += intre }
  })
  s += poze.slice(k).map(figIlustratie).join('')
  s += (c.harti || []).map(figHarta).join('')
  s += (c.diagrame || []).map(figDiagrama).join('')
  if (c.citat?.text) s += `<blockquote><p>${esc(c.citat.text)}</p></blockquote>
<p class="sursa"><b>${esc(c.citat.autor)}</b>${c.citat.context ? ' · ' + esc(c.citat.context) : ''}</p>`
  if (c.cifre?.length) { s += `<h2>Cifre</h2>` + c.cifre.map((x) =>
    `<p class="cifra"><b>${esc(x.valoare)}</b> — ${esc(x.eticheta)}<em>${esc(x.nota)}</em></p>`).join('') }
  if (c.figuri?.length) {
    s += `<h2>Cine trăiește când</h2>` + banda(bandaVietilor(c, { de: c.de, la: c.la }), 'Viețile oamenilor capitolului, la scară')
    s += `<h2>Figuri</h2>` + c.figuri.map((x) =>
    `<p class="pers"><span class="nume">${esc(x.nume)}</span> <span class="ani">${esc(x.ani)}</span>
<span class="rol">${esc(x.rol)}</span>${esc(x.descriere)}</p>`).join('')
  }
  if (c.cronologie?.length) { s += `<h2>Repere</h2><dl>` + c.cronologie.map((x) =>
    `<dt>${esc(x.an)}</dt><dd>${esc(x.eveniment)}</dd>`).join('') + `</dl>` }
  if (c.controversa) s += `<div class="caseta"><p class="eticheta">Dispută istoriografică</p><p>${esc(c.controversa)}</p></div>`
  return s
}

const pag = (titlu, corp, clasa = '') => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${LIMBA}" xml:lang="${LIMBA}">
<head><meta charset="utf-8"/><title>${esc(titlu)}</title>
<link rel="stylesheet" type="text/css" href="stil.css"/></head>
<body${clasa ? ` class="${clasa}"` : ''}>${corp}</body></html>`

/* ---- fisierele ----------------------------------------------------------- */
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT + '/META-INF', { recursive: true })
mkdirSync(OUT + '/OEBPS/fonturi', { recursive: true })
mkdirSync(OUT + '/OEBPS/il', { recursive: true })

writeFileSync(OUT + '/mimetype', 'application/epub+zip')
writeFileSync(OUT + '/META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`)
/* stil.css se scrie la sfarsit, dupa ce s-au compus toate paginile: abia
   atunci se stie ce clase folosesc SVG-urile. Vezi mai jos. */
for (const f of ['Literata-400.ttf','Literata-400i.ttf','Literata-600.ttf','Spectral-300.ttf','Spectral-600.ttf'])
  cpSync(RAD + 'fonturi/' + f, OUT + '/OEBPS/fonturi/' + f)

/* Coperta de carte electronica: cea a volumului intreg. Daca lipseste — se
   face cu "node coperta.mjs <pagini>", fara --volum — se ia a volumului intai,
   dar se spune, ca sa nu plece la vanzare o coperta veche fara sa stie nimeni. */
const caleCop = [RAD + 'coperta-ebook.png', RAD + 'coperta-ebook-vol1.png'].find((f) => existsSync(f))
const areCoperta = Boolean(caleCop)
if (caleCop && !caleCop.endsWith('coperta-ebook.png'))
  console.warn('ATENȚIE: lipsește coperta-ebook.png; se folosește ' + caleCop.split('/').pop())
if (areCoperta) cpSync(caleCop, OUT + '/OEBPS/coperta.png')

const fisiere = []
if (areCoperta) {
  writeFileSync(OUT + '/OEBPS/coperta.xhtml', pag('Copertă',
    `<div class="coperta"><img src="coperta.png" alt="${esc(TITLU)}"/></div>`, 'coperta'))
  fisiere.push({ id: 'coperta', href: 'coperta.xhtml', titlu: 'Copertă', inToc: false })
}

writeFileSync(OUT + '/OEBPS/titlu.xhtml', pag('Pagina de titlu',
  `<h1>${esc(TITLU)}</h1><p class="fara-alineat" style="font-style:italic;color:#555">${esc(SUBTITLU)}</p>
<p class="fara-alineat" style="margin-top:2em">${esc(AUTOR)}</p>
<div class="caseta" style="margin-top:3em"><p class="eticheta">Notă asupra redactării</p>
<p>Textul acestui volum a fost redactat cu ajutorul unui model de limbaj și trecut printr-o
a doua verificare, tot automată, care a corectat 818 de erori de date, nume și cifre.
Verificarea automată nu înlocuiește lectura unui istoric asupra izvoarelor. Volumul se
citește ca sinteză, nu ca lucrare de referință.</p>
<p style="margin-top:.7em">Hărțile și diagramele sunt originale, generate din contururi în
coordonate geografice reale. Culegere cu caracterele Literata și Spectral, distribuite sub
licența SIL Open Font License 1.1.</p></div>`))
fisiere.push({ id: 'titlu', href: 'titlu.xhtml', titlu: 'Pagina de titlu', inToc: true })

writeFileSync(OUT + '/OEBPS/argument.xhtml', pag('Argument',
  `<p class="eticheta">Argument</p><h1>Ce se poate spune cu certitudine</h1>
<p class="prim">Istoria acestui spațiu este scrisă, mai mult decât altele din Europa, în jurul unei întrebări de identitate: de unde vin românii. Întrebarea a fost pusă politic încă din secolul al XVIII-lea, când Școala Ardeleană avea nevoie de argumentul latinității pentru a cere drepturi în Transilvania, și a fost pusă din nou, cu semn contrar, de istoriografia maghiară și de cea sovietică. Răspunsul onest este că izvoarele scrise tac aproape o mie de ani, între retragerea aureliană și primele mențiuni medievale, și că arheologia nu poate confirma o etnie.</p>
<p>Volumul acesta încearcă altceva: să spună ce se poate documenta, să numească explicit ce este disputat și să nu confunde tradiția istoriografică romantică cu faptul stabilit. Fiecare capitol are, la sfârșit, o notă despre principala controversă a epocii, cu ambele poziții expuse corect. Paginile dificile — Holocaustul din România, colaborarea cu Germania nazistă, represiunea comunistă, robia romilor, mineriadele — sunt tratate la fel de detaliat ca victoriile.</p>
<p>Hărțile nu sunt ilustrații decorative. Sunt desenate din coordonate geografice reale, iar fiecare hotar istoric este definit o singură dată și reutilizat, astfel încât suprafețele să fie comparabile de la o hartă la alta.</p>`))
fisiere.push({ id: 'argument', href: 'argument.xhtml', titlu: 'Argument', inToc: true })

cap.forEach((c, i) => {
  const f = `cap-${c.id}.xhtml`
  writeFileSync(OUT + '/OEBPS/' + f, pag(c.titlu,
    `<p class="eticheta">Capitolul ${ROMAN[i + 1]}</p><h1>${esc(c.titlu)}</h1>
<p class="perioada">${esc(c.per)}</p>${corpul(c)}`))
  fisiere.push({ id: 'cap-' + c.id, href: f, titlu: `${ROMAN[i + 1]}. ${c.titlu}`, inToc: true })
})
teme.forEach((c) => {
  const f = `tema-${c.id}.xhtml`
  writeFileSync(OUT + '/OEBPS/' + f, pag(c.titlu,
    `<p class="eticheta">Priviri transversale</p><h1>${esc(c.titlu)}</h1>
<p class="perioada">de la antichitate până azi</p>${corpul(c)}`))
  fisiere.push({ id: 'tema-' + c.id, href: f, titlu: c.titlu, inToc: true })
})

/* --- materialul final: tabelele -------------------------------------------
   Nimic nou in ele; numai ce e deja raspandit prin carte, asezat ca sa poata fi
   cautat. Intr-un EPUB conteaza cu atat mai mult, fiindca nu are numere de
   pagina la care sa trimita un indice. */
{
  const TABELE = toateTabelele([...cap, ...teme.map((t) => ({ ...t, tema: true, per: 'transversal' }))])
  for (const t of TABELE) {
    writeFileSync(OUT + `/OEBPS/tabel-${t.id}.xhtml`, pag(t.titlu,
      `<p class="eticheta">Material final</p>` + sectiuneTabel(t, { esc, nivel: 'h1', legaturi: false })))
    fisiere.push({ id: 'tabel-' + t.id, href: `tabel-${t.id}.xhtml`, titlu: t.titlu, inToc: true })
  }
}

/* --- plansa cartografica --------------------------------------------------- */
if ((ILUSTRATII.atlas || []).length) {
  writeFileSync(OUT + '/OEBPS/atlas.xhtml', pag('Cum a fost desenat acest pământ',
    `<p class="eticheta">Planșă cartografică</p><h1>Cum a fost desenat acest pământ</h1>
<p class="rezumat">Hărțile de mai jos nu sunt ilustrații ale textului, ci izvoare în sine. Fiecare arată nu numai un teritoriu, ci și ce știa și ce voia să arate cel care a desenat-o.</p>
${ILUSTRATII.atlas.map(figIlustratie).join('')}`))
  fisiere.push({ id: 'atlas', href: 'atlas.xhtml', titlu: 'Cum a fost desenat acest pământ', inToc: true })
}

writeFileSync(OUT + '/OEBPS/nota.xhtml', pag('Notă asupra metodei',
  `<h1>Notă asupra metodei</h1>
<p class="prim">Volumul a fost redactat capitol cu capitol și trecut apoi printr-o verificare factuală separată, care a urmărit datele, numele proprii, cifrele și atribuirea citatelor. Au rezultat 818 de corecții. Acolo unde o cifră este disputată în literatura de specialitate — numărul victimelor răscoalei din 1907, bilanțul Holocaustului din România, numărul morților din decembrie 1989 — ea este dată ca interval, cu menționarea disputei.</p>
<h2>Despre hărți</h2>
<p class="prim">Cele douăsprezece hărți sunt desenate din coordonate geografice reale. Fiecare hotar istoric este definit o singură dată și reutilizat, astfel încât suprafețele să se îmbine exact. Ariile calculate se abat cu mai puțin de un procent de la cele reale: România Mare 296.108 km² față de 295.049, România de azi 237.307 față de 238.397, Dobrogea 15.519 față de 15.485.</p>
<h2>Ce lipsește</h2>
<p class="prim">O sinteză nu înlocuiește lectura specialiștilor. Volumul nu are note de subsol și nu indică sursa fiecărei afirmații în parte.</p>`))
fisiere.push({ id: 'nota', href: 'nota.xhtml', titlu: 'Notă asupra metodei', inToc: true })

/* --- cuprinsul navigabil --------------------------------------------------- */
const navPuncte = fisiere.filter((f) => f.inToc)
writeFileSync(OUT + '/OEBPS/nav.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${LIMBA}" xml:lang="${LIMBA}">
<head><meta charset="utf-8"/><title>Cuprins</title><link rel="stylesheet" type="text/css" href="stil.css"/></head>
<body><nav epub:type="toc" id="toc"><h1>Cuprins</h1><ol>
${navPuncte.map((f) => `<li><a href="${f.href}">${esc(f.titlu)}</a></li>`).join('\n')}
</ol></nav></body></html>`)

writeFileSync(OUT + '/OEBPS/toc.ncx', `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="${UID}"/><meta name="dtb:depth" content="1"/>
<meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>
<docTitle><text>${esc(TITLU)}</text></docTitle>
<navMap>
${navPuncte.map((f, i) => `<navPoint id="np${i + 1}" playOrder="${i + 1}">
<navLabel><text>${esc(f.titlu)}</text></navLabel><content src="${f.href}"/></navPoint>`).join('\n')}
</navMap></ncx>`)

/* --- manifestul ------------------------------------------------------------ */
const azi = new Date(Date.UTC(2026, 8, 17)).toISOString().replace(/\.\d+Z$/, 'Z')
writeFileSync(OUT + '/OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="${LIMBA}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:identifier id="uid">${UID}</dc:identifier>
  <dc:title>${esc(TITLU)}</dc:title>
  <dc:creator>${esc(AUTOR)}</dc:creator>
  <dc:language>${LIMBA}</dc:language>
  <dc:date>2026</dc:date>
  <dc:publisher>[editura]</dc:publisher>
  <dc:subject>Istorie</dc:subject>
  <dc:subject>România</dc:subject>
  <dc:description>${esc(SUBTITLU)}. Douăzeci și trei de capitole cronologice și șaptesprezece priviri transversale, cu douăsprezece hărți desenate din coordonate geografice reale și peste două sute de ilustrații de arhivă.</dc:description>
  <dc:rights>Toate drepturile rezervate.</dc:rights>
  <meta property="dcterms:modified">${azi}</meta>
  ${areCoperta ? '<meta name="cover" content="img-coperta"/>' : ''}
</metadata>
<manifest>
  <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  <item id="css" href="stil.css" media-type="text/css"/>
  ${areCoperta ? '<item id="img-coperta" href="coperta.png" media-type="image/png" properties="cover-image"/>' : ''}
  ${['Literata-400','Literata-400i','Literata-600','Spectral-300','Spectral-600']
    .map((f) => `<item id="f-${f}" href="fonturi/${f}.ttf" media-type="font/ttf"/>`).join('\n  ')}
  ${fisiere.map((f) => `<item id="${f.id}" href="${f.href}" media-type="application/xhtml+xml" properties="svg"/>`).join('\n  ')}
  ${pozeIncluse.map((n, i) => `<item id="il${i + 1}" href="${n}" media-type="image/jpeg"/>`).join('\n  ')}
</manifest>
<spine toc="ncx">
  ${fisiere.map((f) => `<itemref idref="${f.id}"/>`).join('\n  ')}
  <itemref idref="nav" linear="no"/>
</spine>
</package>`)

/* --- ambalarea: mimetype primul, necomprimat -------------------------------- */
/* Ediția compactă merge la numele ei: altfel a doua rulare o scria peste cea
   întreagă, iar diferența — de trei ori mai mare — nu se vedea decât la KDP. */
/* Acum, cu toate paginile compuse, se stie ce clase apar in SVG-uri. */
const STIL_FIGURI = stilulFigurilor(RAD + '../build/stil.css', CLASE_SVG)
writeFileSync(OUT + '/OEBPS/stil.css', STIL + '\n' + STIL_FIGURI)
const totCss = STIL + STIL_FIGURI
const nedefinite = [...CLASE_SVG].filter((c) => !new RegExp('\\.' + c + '\\b').test(totCss))
if (nedefinite.length) console.warn('ATENȚIE: clase folosite în SVG dar fără regulă: ' + nedefinite.join(', '))

const epub = RAD + (process.env.EPUB_MIC ? 'Istoria-Romaniei-compact.epub' : 'Istoria-Romaniei.epub')
rmSync(epub, { force: true })
execFileSync('zip', ['-X0', epub, 'mimetype'], { cwd: OUT })
execFileSync('zip', ['-Xr9D', epub, 'META-INF', 'OEBPS'], { cwd: OUT })

const { statSync } = await import('fs')
console.log(`${epub.split('/').pop()} · ${fisiere.length} documente · ${nrFig} hărți/diagrame · ${nrIl} ilustrații · ${(statSync(epub).size / 1048576).toFixed(1)} MB`)
