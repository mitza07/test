/* ===========================================================================
   Construieste macheta de tipar: un fisier HTML pe care Paged.js il pagineaza
   in Chromium. Acelasi continut ca editia web, alta asezare.
   =========================================================================== */
import { readFileSync, writeFileSync } from 'fs'
import { HARTI } from '../build/harti.mjs'
import { cronograma, diagramaTeritoriu, diagramaPopulatie, diagramaLexic, diagramaEtnic } from '../build/diagrame.mjs'
import { PLAN, PLAN_TEME } from '../build/build.mjs'
import { bandaCronologica } from '../build/cronograf.mjs'
import { bandaVietilor } from '../build/vieti.mjs'
import { toateTabelele, sectiuneTabel, tabelHtml } from '../build/tabele.mjs'
import { aseaza } from '../build/asezare.mjs'
import { cifreleCartii, exactitateaHartilor } from '../build/cifre-carte.mjs'
import { creditScurt } from '../build/credit.mjs'
import { readFileSync as citeste, existsSync as exista, statSync as stat } from 'fs'
import { tipografic } from '../build/tipo.mjs'

/* --- ilustratiile de arhiva ---------------------------------------------- */
const RAD_C = new URL('./', import.meta.url).pathname
function incarcaIlustratii() {
  const cale = RAD_C + 'ilustratii/manifest.json'
  if (!exista(cale)) return {}
  const man = JSON.parse(citeste(cale, 'utf8'))
  const pe = {}
  for (const m of man) {
    const f = RAD_C + m.local
    if (!exista(f) || stat(f).size < 40000) continue
    ;(pe[m.cap] = pe[m.cap] || []).push(m)
  }
  return pe
}
const ILUSTRATII = incarcaIlustratii()
/* Care variantă de poze intră în pagină: cele de tipar, la 1.700 px, sau cele
   de ecran, la 900. A doua scoate copia de citit, de zece ori mai ușoară. */
const POZE = process.env.POZE === 'ecran' ? 'ecran' : 'tipar'
let nrIl = 0
const ilustratiiFolosite = []

/* creditul se scrie o singura data, in build/credit.mjs */

function figuraIlustratie(m) {
  const n = ++nrIl
  const id = 'il' + n
  ilustratiiFolosite.push({ ...m, n, id })
  /* Latimea din pagina se calculeaza din pixelii pe care ii avem cu adevarat:
     nicio ilustratie nu se intinde mai mult decat ii permit 260 de puncte pe
     tol. O gravura de 900 px ocupa 88 mm, nu toata oglinda de 117. */
  const OGLINDA = 117
  const px = m.pxLatime || m.latime || 0
  const latMm = px ? Math.min(OGLINDA, Math.round(px / 260 * 25.4)) : OGLINDA
  const lata = m.latime && m.inaltime && m.latime / m.inaltime > 1.28
  const stil = latMm < OGLINDA ? ` style="width:${latMm}mm"` : ''
  return `<figure class="ilustratie${lata ? ' lata' : ''}${latMm < OGLINDA ? ' ingusta' : ''}" id="${id}"${stil}>
<img src="ilustratii/${POZE}/${m.local.split('/').pop()}" alt="${esc(m.legenda)}"/>
<figcaption><span class="fig-nr">Ilustrația ${n}</span>${esc(m.legenda)}
<span class="credit">${esc(creditScurt(m))}</span></figcaption>
</figure>`
}
const ilustratiile = (cap) => (ILUSTRATII[cap] || []).map(figuraIlustratie).join('')

const esc = (s) => tipografic(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/* Intervalul acoperit de volum, pentru strip-ul de context al fiecarei benzi */
const VOLUM_DE = -6000, VOLUM_LA = 2026
function figuraBanda(c) {
  const b = bandaCronologica(c, { de: VOLUM_DE, la: VOLUM_LA })
  if (!b) return ''
  return `<figure class="banda-cron"><svg viewBox="${b.vb}" role="img" aria-label="Reperele capitolului, la scară" preserveAspectRatio="xMidYMid meet">${b.body}</svg></figure>`
}

const ROMAN = ['', 'I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII',
  'XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV',
  'XXV','XXVI','XXVII','XXVIII','XXIX','XXX']

const TITLU = 'Istoria României'
const SUBTITLU = 'în 3.026 de ani'
const AN = '2026'

const DIAG = { populatie: diagramaPopulatie, lexic: diagramaLexic, etnic: diagramaEtnic, teritoriu: diagramaTeritoriu }
export const SUBT_DIAG = {
  populatie: ['Populația României la recensăminte, 1859–2021', 'Creșterea până în 1992 și pierderea a 3,8 milioane de locuitori în cele trei decenii următoare, prin scăderea natalității și prin emigrare, sunt cele două fapte demografice majore ale istoriei recente.'],
  lexic: ['Din ce e făcută limba română', 'Proporțiile sunt calculate de Marius Sala pe vocabularul reprezentativ, de 2.581 de cuvinte. În lexicul fundamental, de circa 1.500 de cuvinte, ponderea latinei moștenite urcă spre 70 la sută: cu cât cuvântul este mai frecvent, cu atât e mai probabil să fie latin.'],
  etnic: ['Structura etnică, 1930 și 2021', 'Omogenizarea nu este rezultatul unui singur proces: Holocaustul și emigrarea în Israel, deportarea și plecarea germanilor, pierderea Basarabiei și a Cadrilaterului, apoi asimilarea au acționat succesiv. La recensământul din 2021, circa 9 la sută dintre locuitori nu și-au declarat etnia; procentele se raportează la cei care au declarat-o.'],
  teritoriu: ['Suprafața statului român, 1859–2026', 'Șapte configurații teritoriale în 167 de ani. Saltul din 1918 și prăbușirea din 1940 sunt cele mai mari variații de graniță din istoria modernă a Europei de Est în afara războaielor mondiale propriu-zise.'],
}
const TEME_TITLU = {
  limba: 'Limba română', religie: 'Religie și Biserică', minoritati: 'Minoritățile',
  cultura: 'Cultură și știință', economie: 'Economia și societatea', geografie: 'Pământul și oamenii',
}

/* --- indice de nume ------------------------------------------------------- */
/* Vocabular controlat: numele din fisele de personaje, plus locurile care apar
   pe harti. Nu se extrag nume din proza, ca sa nu intre fals-pozitive.        */
const LOCURI_INDICE = [
  'Sarmizegetusa Regia','Alba Iulia','Târgoviște','Suceava','București','Iași','Cluj',
  'Timișoara','Constanța','Brașov','Sibiu','Oradea','Chișinău','Cernăuți','Cetatea Albă',
  'Chilia','Hotin','Brăila','Giurgiu','Galați','Ploiești','Sighet','Târgu Mureș','Blaj',
  'Focșani','Mărășești','Plevna','Călugăreni','Posada','Vaslui','Nicopole','Varna',
  'Rovine','Șelimbăr','Mirăslău','Stănilești','Turtucaia','Odesa','Transnistria',
  'Basarabia','Bucovina','Transilvania','Dobrogea','Cadrilaterul','Moldova','Muntenia',
  'Oltenia','Banatul','Crișana','Maramureșul','Histria','Tomis','Callatis','Porolissum',
  'Apulum','Napoca','Potaissa','Drobeta','Ulpia Traiana','Adamclisi','Timiș','Pitești',
  'Aiud','Gherla','Râmnicu Sărat','Sighetu Marmației','Colectiv','Rosia Montană',
]

function culegeTermeni(tot) {
  const t = new Set()
  for (const c of tot) for (const f of (c.figuri || [])) {
    let n = String(f.nume || '').trim()
    n = n.replace(/\s*\([^)]*\)\s*$/, '').trim()   /* taie parantezele explicative */
    if (n.length >= 4 && n.split(/\s+/).length <= 5) t.add(n)
  }
  for (const l of LOCURI_INDICE) t.add(l)
  /* termenii lungi se marcheaza primii, ca sa nu-i sparga cei scurti */
  return [...t].sort((a, b) => b.length - a.length)
}

let nrAncora = 0
const ancore = []          /* {id, termen} */
function marcheaza(htmlEscapat, termeni) {
  let s = htmlEscapat
  for (const termen of termeni) {
    const re = new RegExp('(?<![\\p{L}\\p{N}])(' + termen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\p{L}\\p{N}])', 'gu')
    s = s.replace(re, (m) => {
      const id = 'ix' + (++nrAncora)
      ancore.push({ id, termen })
      return `<span class="ix" id="${id}">${m}</span>`
    })
  }
  return s
}

/* --- figuri --------------------------------------------------------------- */
let nrFig = 0
const figuriLista = []

function figuraHarta(cheie) {
  const h = HARTI[cheie]; if (!h) return ''
  const { vb, body } = h.spec()
  const n = ++nrFig
  const id = 'fig' + n
  figuriLista.push({ n, id, titlu: h.titlu, tip: 'Harta' })
  const leg = (h.legenda || []).map(([t, txt]) => {
    if (t === 'ceda')     return `<span><i style="border:0;border-top:1.4pt dashed #000;height:0"></i>${esc(txt)}</span>`
    if (t === 'campanie') return `<span><i style="border:0;border-top:1.4pt solid #000;height:0"></i>${esc(txt)}</span>`
    if (t === 'hasu')     return `<span><i style="background:repeating-linear-gradient(45deg,#000 0 .5pt,transparent .5pt 1.6pt)"></i>${esc(txt)}</span>`
    if (t === 'batalie')  return `<span><i style="border:0">✕</i>${esc(txt)}</span>`
    if (t === 'sit')      return `<span><i style="border:0">▲</i>${esc(txt)}</span>`
    if (t === 'oras')     return `<span><i style="border:0">●</i>${esc(txt)}</span>`
    if (t === 'capitala') return `<span><i style="border:0">◉</i>${esc(txt)}</span>`
    if (/^h[0-4]$/.test(t)) return `<span><i class="leg-${t}"></i>${esc(txt)}</span>`
    return `<span><i class="m-t${t}" style="background:currentColor"></i>${esc(txt)}</span>`
  }).join('')
  return `<figure id="${id}">
<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${body}</svg>
${leg ? `<div class="legenda">${leg}</div>` : ''}
<figcaption><span class="fig-nr">Harta ${n}</span><b>${esc(h.titlu)}</b> ${esc(h.jos)}</figcaption>
</figure>`
}

function figuraDiagrama(cheie) {
  const gen = DIAG[cheie]; if (!gen) return ''
  const { vb, body } = gen()
  const [t, j] = SUBT_DIAG[cheie]
  const n = ++nrFig
  const id = 'fig' + n
  figuriLista.push({ n, id, titlu: t, tip: 'Diagrama' })
  return `<figure id="${id}">
<svg class="diagrama" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${body}</svg>
<figcaption><span class="fig-nr">Diagrama ${n}</span><b>${esc(t)}</b> ${esc(j)}</figcaption>
</figure>`
}

/* --- corpul unei sectiuni ------------------------------------------------- */
/* Impartirea propriu-zisa sta in build/asezare.mjs, comuna celor patru formate.
   Aici raman numai randatoarele: cum arata fiecare bloc la tipar. */
function blocuri(c, termeni) {
  return aseaza(c, {
    poze: ILUSTRATII[c.id] || [],
    rezumat: (c) => c.rezumat ? `<p class="cap-rezumat">${marcheaza(esc(c.rezumat), termeni)}</p>` : '',
    proza: (s) => `<section class="sectiune"><h3>${esc(s.subtitlu)}</h3><div class="proza">` +
      (s.paragrafe || []).map((x) => `<p>${marcheaza(esc(x), termeni)}</p>`).join('') + `</div></section>`,
    ilustratie: figuraIlustratie,
    harta: figuraHarta,
    diagrama: figuraDiagrama,
    tabel: (t) => `<div class="tabel-cap" id="${t.id}"><div class="cap-mic">${esc(t.titlu)}</div>
<p class="tabel-intro">${esc(t.intro)}</p>${tabelHtml(t, { esc, legaturi: false })}</div>`,
    citat: (c) => c.citat && c.citat.text
      ? `<div class="citat"><blockquote>${esc(c.citat.text)}</blockquote>
<div class="sursa"><b>${esc(c.citat.autor)}</b>${c.citat.context ? ' · ' + esc(c.citat.context) : ''}</div></div>`
      : '',
    cifre: (c) => (c.cifre || []).length
      ? `<div class="cifre"><div class="cap-mic">Cifre</div>` + c.cifre.map((x) =>
        `<div class="cifra"><b>${esc(x.valoare)}</b><div><span>${esc(x.eticheta)}</span><small>${esc(x.nota)}</small></div></div>`).join('') + `</div>`
      : '',
    vieti: (c) => {
      if (!(c.figuri || []).length) return ''
      const bv = bandaVietilor(c, { de: c.de, la: c.la })
      return bv ? `<div class="vieti"><div class="cap-mic">Cine trăiește când</div>
<figure class="banda-cron banda-vieti"><svg viewBox="${bv.vb}" role="img" aria-label="Viețile oamenilor capitolului, la scară" preserveAspectRatio="xMidYMid meet">${bv.body}</svg></figure></div>` : ''
    },
    figuri: (c) => (c.figuri || []).length
      ? `<div class="figuri"><div class="cap-mic">Figuri</div>` + c.figuri.map((x) =>
        `<div class="pers"><div class="pers-cap">${marcheaza(esc(x.nume), termeni)} <span class="pers-ani">${esc(x.ani)}</span></div>
<div class="pers-rol">${esc(x.rol)}</div><p>${marcheaza(esc(x.descriere), termeni)}</p></div>`).join('') + `</div>`
      : '',
    /* Nu grid: Paged.js nu pastreaza atribuirea pe coloane cand grila se rupe
       peste pagina — perechile se decaleaza cu o celula si anul ajunge in
       coloana larga, iar textul in cea ingusta. Alineat atarnat, care se
       fragmenteaza corect fiindca e simplu text curgator. */
    cronologie: (c) => (c.cronologie || []).length
      ? `<div class="cronologie"><div class="cap-mic">Repere</div><div class="cron-lista">` +
        c.cronologie.map((x) => `<p class="cron-r"><b>${esc(x.an)}</b>${marcheaza(esc(x.eveniment), termeni)}</p>`).join('') + `</div></div>`
      : '',
    controversa: (c) => c.controversa
      ? `<div class="controversa"><div class="cap-mic">Dispută istoriografică</div><p>${marcheaza(esc(c.controversa), termeni)}</p></div>`
      : '',
  }).join('')
}

/* ========================================================================== */
/* ---------------------------------------------------------------------------
   Volumele. La 6x9 inch, KDP nu leaga peste 828 de pagini, indiferent de hartie
   si de cerneala; cu peste doua sute de ilustratii, cartea trece de 870. Taietura
   cade unde o cere si structura: Partea intai, cronologia, intr-un volum; Partea
   a doua, privirile transversale si plansa cartografica, in celalalt.
   volum: 0 = totul intr-un fisier (pentru ecran), 1 sau 2 = volumul tiparit.
   --------------------------------------------------------------------------- */
const TITLU_VOLUM = {
  1: ['Volumul I', 'Cronologia', 'de la 1000 î.Hr. până azi'],
  2: ['Volumul II', 'Priviri transversale', 'și atlasul hărților vechi'],
}

export function construiesteTipar(continut, optiuni = {}) {
  nrFig = 0; nrAncora = 0; figuriLista.length = 0; ancore.length = 0
  nrIl = 0; ilustratiiFolosite.length = 0
  const volum = Number(optiuni.volum || 0)
  const capById = Object.fromEntries((continut.capitole || []).map((c) => [c.id, c]))
  const temeById = Object.fromEntries((continut.teme || []).map((c) => [c.id, c]))
  const totCap = PLAN.map((pl) => ({ ...pl, ...(capById[pl.id] || {}) })).filter((c) => c.sectiuni?.length)
  const totTeme = PLAN_TEME.map((pl) => ({ ...pl, titlu: TEME_TITLU[pl.id], ...(temeById[pl.id] || {}) })).filter((c) => c.sectiuni?.length)
  const cap = volum === 2 ? [] : totCap
  const teme = volum === 1 ? [] : totTeme
  /* termenii indicelui se culeg din tot volumul dublu: un nume care apare in
     amandoua partile trebuie marcat la fel in amandoua */
  const termeni = culegeTermeni([...totCap, ...totTeme])

  /* corpul se compune intai, ca sa se numere figurile si sa se aseze ancorele */
  const corpCap = cap.map((c, i) => `<article class="capitol" id="${c.id}">
<header class="cap-cap">
<div class="cap-nr">Capitolul ${ROMAN[i + 1]}</div>
<h2 class="cap-titlu">${esc(c.titlu)}</h2>
<div class="cap-per">${esc(c.per)}</div>
</header>
${figuraBanda(c)}
${blocuri(c, termeni)}
</article>`).join('')

  const corpTeme = teme.map((c) => `<article class="capitol" id="${c.id}">
<header class="cap-cap">
<div class="cap-nr">Priviri transversale</div>
<h2 class="cap-titlu">${esc(c.titlu)}</h2>
<div class="cap-per">de la antichitate până azi</div>
</header>
${figuraBanda(c)}
${blocuri(c, termeni)}
</article>`).join('')

  /* cuprins */
  /* Tabelele materialului final: nimic nou, numai ce e deja in carte, asezat
     la un loc ca sa poata fi cautat. */
  /* Cate harti are chiar volumul care se tipareste, si cat de departe cad ariile
     calculate de cele reale — socotite, nu scrise de mana. Pana azi scria
     "douasprezece harti" si "sub un procent"; sunt treisprezece si pana la 2,2. */
  const NUM = cifreleCartii(volum)
  const NR_LIT = { 1: 'O singură hartă e desenată', 2: 'Cele două hărți sunt desenate',
    3: 'Cele trei hărți sunt desenate', 12: 'Cele douăsprezece hărți sunt desenate',
    13: 'Cele treisprezece hărți sunt desenate' }
  const TEXT_HARTI = NUM.harti
    ? `${NR_LIT[NUM.harti] || `Cele ${NUM.harti} hărți sunt desenate`} din coordonate geografice reale.`
    : 'Hărțile volumului sunt desenate din coordonate geografice reale.'
  const EX = exactitateaHartilor()
  const TEXT_ARII = `Ariile calculate se abat de cele reale cu cel mult ` +
    `${EX.abatereMax.toFixed(1).replace('.', ',')} la sută: ` +
    EX.arii.map((a) => `${a.nume} ${a.km2.toLocaleString('ro')} km² față de ${a.real.toLocaleString('ro')}`).join(', ') + '.'

  const TABELE = toateTabelele([...cap, ...teme.map((t) => ({ ...t, tema: true, per: 'transversal' }))])
  const tabelHtmlTipar = (t) => sectiuneTabel(t, { esc }).replace(/^<h2>[\s\S]*?<\/p>\n/, '')

  const cuprins = (cap.length ? `<div class="grup">Partea întâi · Cronologia</div><ol>` +
    cap.map((c, i) => `<li><a class="pg" href="#${c.id}"></a><span class="nr">${ROMAN[i + 1]}</span><span class="tit">${esc(c.titlu)}</span>
<span class="per">${esc(c.per)}</span></li>`).join('') +
    `</ol>` : '') +
    (teme.length ? `<div class="grup">Partea a doua · Priviri transversale</div><ol>` +
    teme.map((c) => `<li class="fara-nr"><a class="pg" href="#${c.id}"></a><span class="nr"></span><span class="tit">${esc(c.titlu)}</span></li>`).join('') + `</ol>` : '') +
    `<div class="grup">Material final</div><ol>` +
    [...TABELE.map((t) => [t.id, t.titlu]),
      ['lista-figuri', 'Lista hărților și a diagramelor'], ['indice', 'Indice de nume și locuri'], ['nota-metoda', 'Notă asupra metodei']]
      .map(([id, t]) => `<li class="fara-nr"><a class="pg" href="#${id}"></a><span class="nr"></span><span class="tit">${esc(t)}</span></li>`).join('') + `</ol>`

  const listaFig = `<ol>` + figuriLista.map((f) =>
    `<li><a class="pg" href="#${f.id}"></a><span class="nr">${f.tip === 'Harta' ? 'H' : 'D'}${f.n}</span><span>${esc(f.titlu)}</span></li>`).join('') + `</ol>`

  /* indicele se completeaza la a doua trecere, cand se stiu paginile */
  const indice = optiuni.indice || '<p style="color:#888;font-size:8pt">Indicele se generează la a doua trecere.</p>'

  const cssBaza = readFileSync(new URL('./tipar.css', import.meta.url), 'utf8')
  const cssCol = optiuni.color ? readFileSync(new URL('./culoare.css', import.meta.url), 'utf8') : ''

  return { html: `<!DOCTYPE html>
<html lang="ro"><head><meta charset="utf-8">
<title>${esc(TITLU)}</title>
<style>${cssBaza}${cssCol}</style>
</head><body>
<div style="string-set: titlu-carte '${TITLU.toUpperCase()}'; height:0"></div>

<section class="semititlu"><h1>${esc(TITLU)}</h1>${volum ? `<div class="semi-vol">${esc(TITLU_VOLUM[volum][0])} · ${esc(TITLU_VOLUM[volum][1])}</div>` : ''}</section>
<section class="alba"></section>

<section class="foaie-titlu">
  <div class="supra">${volum ? esc(TITLU_VOLUM[volum][0]) + ' din două' : 'Volum enciclopedic ilustrat'}</div>
  <h1>${esc(TITLU)}</h1>
  <div class="subtitlu">${esc(volum ? TITLU_VOLUM[volum][1] + ' — ' + TITLU_VOLUM[volum][2] : SUBTITLU)}</div>
  <div class="rigla-titlu"></div>
  <div class="jos">${AN}</div>
</section>

<section class="caseta">
  <div class="cip">
    <b>Descrierea CIP a Bibliotecii Naționale a României</b>
    [Se completează cu descrierea primită de la Centrul Național CIP și se tipărește
    aici, în forma exactă în care a fost transmisă. Fără ea, exemplarele de depozit
    legal nu sunt conforme.]
  </div>
  <p>ISBN [se completează]</p>
  <p>Ediția întâi, ${AN}.</p>
  <p>Hărțile și diagramele sunt originale, generate din contururi în coordonate
  geografice reale. Nu reproduc hărți publicate.</p>
  <p>Culegere cu caracterele Literata, Spectral și IBM Plex Sans Condensed,
  distribuite sub licența SIL Open Font License 1.1.</p>
  <div class="avertisment">
    <p><b>Notă asupra redactării.</b> Textul acestui volum a fost redactat cu ajutorul
    unui model de limbaj și trecut printr-o a doua verificare, tot automată, care a
    corectat 818 de erori de date, nume și cifre. Verificarea automată nu înlocuiește
    lectura unui istoric asupra izvoarelor. Cititorul este avertizat că, în absența
    unei verificări de specialitate, volumul trebuie citit ca sinteză, nu ca lucrare
    de referință, iar afirmațiile importante merită confruntate cu bibliografia
    indicată în nota finală.</p>
  </div>
</section>

<section class="cuprins" id="cuprins"><h2>Cuprins</h2>${cuprins}</section>

${corpCap}
${corpTeme}

${volum === 1 ? '' : `
<section class="capitol" id="atlas-vechi">
<header class="cap-cap">
<div class="cap-nr">Plansa cartografica</div>
<h2 class="cap-titlu">Cum a fost desenat acest pământ</h2>
<div class="cap-per">1513 – 1920</div>
</header>
<div class="corp"><p class="cap-rezumat">Hărțile de mai jos nu sunt ilustrații ale textului, ci izvoare în sine. Fiecare arată nu numai un teritoriu, ci și ce știa și ce voia să arate cel care a desenat-o: un cartograf venețian de secol XVI care nu văzuse niciodată Carpații, un geograf grec care pregătea o insurecție, un statistician maghiar care apăra la Paris hotarele unui regat pe cale să dispară.</p></div>
${ilustratiile('atlas')}
</section>`}

${TABELE.map((t) => `<section class="anexa" id="${t.id}">
  <h2>${esc(t.titlu)}</h2>
  <p class="tabel-intro">${esc(t.intro)}</p>
  ${tabelHtmlTipar(t)}
</section>`).join('\n')}

<section class="anexa" id="lista-figuri">
  <h2>Lista hărților și a ilustrațiilor</h2>
  <div class="lista-figuri">${listaFig}</div>
  <h3>Proveniența ilustrațiilor</h3>
  <div class="proveniente">${ilustratiiFolosite.map((m) =>
    `<p><b>Ilustrația ${m.n}.</b> ${esc(m.legenda.slice(0, 90))}… ${esc(creditScurt(m))}. ${esc(m.pagina)}</p>`).join('')}</div>
</section>

<section class="anexa" id="indice">
  <h2>Indice de nume și locuri</h2>
  <div class="indice">${indice}</div>
</section>

<section class="anexa" id="nota-metoda">
  <h2>Notă asupra metodei</h2>
  <p>Volumul a fost redactat capitol cu capitol și trecut apoi printr-o verificare
  factuală separată, care a urmărit datele, numele proprii, cifrele și atribuirea
  citatelor. Au rezultat 818 de corecții, consemnate în aparatul de lucru al ediției.
  Acolo unde o cifră este disputată în literatura de specialitate — numărul victimelor
  răscoalei din 1907, bilanțul Holocaustului din România, numărul morților din
  decembrie 1989 — ea este dată ca interval, cu menționarea disputei, nu ca valoare
  unică.</p>
  <p>Fiecare capitol se încheie cu o notă despre principala dispută istoriografică a
  epocii, cu ambele poziții expuse. Paginile dificile ale acestei istorii — Holocaustul
  din România, colaborarea cu Germania nazistă, represiunea comunistă, robia romilor,
  mineriadele — sunt tratate la fel de detaliat ca victoriile.</p>
  <h3>Despre hărți</h3>
  <p>${TEXT_HARTI} Fiecare
  hotar istoric — Carpații, Prutul, Nistrul, Oltul, Milcovul, Cerna, Mureșul, Dunărea,
  linia Dictatului de la Viena — este definit o singură dată și reutilizat, astfel încât
  suprafețele să se îmbine exact și să rămână comparabile de la o hartă la alta.
  Hotarele care merg pe apă sunt decupate din cursul real al râului, luat din Natural
  Earth; relieful vine din ETOPO1, modelul de teren al NOAA. Amândouă sunt în domeniul
  public. ${TEXT_ARII}</p>
  <h3>Ce lipsește</h3>
  <p>O sinteză nu înlocuiește lectura specialiștilor. Pentru fiecare epocă există
  bibliografii mult mai bogate decât ce încape într-un volum ilustrat, iar unele dintre
  judecățile de aici sunt, inevitabil, discutabile. Volumul nu are note de subsol și nu
  indică sursa fiecărei afirmații în parte — o carte care ar face asta ar fi de trei ori
  mai lungă și ar fi altceva decât își propune aceasta.</p>
</section>

</body></html>`, ancore, figuri: figuriLista }
}

/* --- rulare de test ------------------------------------------------------- */
if (process.argv[1] && process.argv[1].endsWith('tipar.mjs')) {
  const continut = JSON.parse(readFileSync(new URL('../build/continut.json', import.meta.url), 'utf8'))
  const color = process.argv.includes('--color')
  const volum = Number((process.argv.find((x) => x.startsWith('--volum=')) || '').split('=')[1] || 0)
  const { html, ancore: a, figuri } = construiesteTipar(continut, { color, volum })
  const nume = `./tipar-${volum ? 'v' + volum + '-' : ''}${color ? 'color' : 'ab'}.html`
  writeFileSync(new URL(nume, import.meta.url), html)
  console.log(`${nume.slice(2)} · ${(html.length / 1024).toFixed(0)} KB · ${figuri.length} figuri · ${a.length} ancore`)
}
