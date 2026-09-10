/* ===========================================================================
   Asambleaza pagina finala dintr-un singur fisier HTML.
   =========================================================================== */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { HARTI } from './harti.mjs'
import { cronograma, diagramaTeritoriu, diagramaPopulatie, diagramaLexic, diagramaEtnic } from './diagrame.mjs'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/* --- planul volumului ---------------------------------------------------- */
export const PLAN = [
  { id: 'preistorie',   de: -1000, la: -514, per: 'c. 1000 – 514 î.Hr.' },
  { id: 'geti',         de: -514,  la: -300, per: '514 – 300 î.Hr.' },
  { id: 'burebista',    de: -300,  la: 87,   per: '300 î.Hr. – 87 d.Hr.', harti: ['daciaBurebista'] },
  { id: 'decebal',      de: 87,    la: 106,  per: '87 – 106' },
  { id: 'dacia-romana', de: 106,   la: 275,  per: '106 – 275', harti: ['daciaRomana'] },
  { id: 'migratii',     de: 275,   la: 1000, per: '275 – 1000', harti: ['migratii'] },
  { id: 'voievodate',   de: 1000,  la: 1330, per: '1000 – 1330' },
  { id: 'intemeiere',   de: 1330,  la: 1418, per: '1330 – 1418' },
  { id: 'cruciada',     de: 1418,  la: 1504, per: '1418 – 1504' },
  { id: 'otoman',       de: 1504,  la: 1601, per: '1504 – 1601', harti: ['treiTari', 'mihai1600'] },
  { id: 'brancoveanu',  de: 1601,  la: 1711, per: '1601 – 1711' },
  { id: 'fanarioti',    de: 1711,  la: 1821, per: '1711 – 1821', harti: ['pierderi1775'] },
  { id: 'renastere',    de: 1821,  la: 1866, per: '1821 – 1866', harti: ['unirea1859'] },
  { id: 'regat',        de: 1866,  la: 1914, per: '1866 – 1914', harti: ['regat1878'] },
  { id: 'mare-razboi',  de: 1914,  la: 1920, per: '1914 – 1920', harti: ['romaniaMare'] },
  { id: 'interbelic',   de: 1920,  la: 1939, per: '1920 – 1939' },
  { id: 'razboi2',      de: 1939,  la: 1944, per: '1939 – 1944', harti: ['anul1940', 'razboi1941'] },
  { id: 'comunism1',    de: 1944,  la: 1965, per: '1944 – 1965' },
  { id: 'ceausescu',    de: 1965,  la: 1989, per: '1965 – 1989', diagrame: ['populatie'] },
  { id: 'revolutia',    de: 1989,  la: 1990, per: 'decembrie 1989' },
  { id: 'tranzitie',    de: 1990,  la: 2007, per: '1990 – 2007' },
  { id: 'contemporan',  de: 2007,  la: 2026, per: '2007 – 2026', harti: ['azi'] },
]
export const PLAN_TEME = [
  { id: 'limba',      diagrame: ['lexic'] },
  { id: 'religie' },
  { id: 'minoritati', diagrame: ['etnic'] },
  { id: 'cultura' },
  { id: 'economie',   diagrame: ['teritoriu'] },
  { id: 'geografie' },
]

const DIAG = { populatie: diagramaPopulatie, lexic: diagramaLexic, etnic: diagramaEtnic, teritoriu: diagramaTeritoriu }
const SUBT_DIAG = {
  populatie: ['Populația României la recensăminte, 1859–2021', 'Creșterea până în 1992 și pierderea a 3,8 milioane de locuitori în cele trei decenii următoare — prin scăderea natalității și prin emigrare — sunt cele două fapte demografice majore ale istoriei recente.'],
  lexic: ['Din ce e făcută limba română', 'Proporțiile sunt calculate de Marius Sala pe vocabularul reprezentativ (2.581 de cuvinte). În lexicul fundamental, de circa 1.500 de cuvinte, ponderea latinei moștenite urcă spre 70%: cu cât cuvântul este mai frecvent, cu atât e mai probabil să fie latin.'],
  etnic: ['Structura etnică, 1930 și 2021', 'Omogenizarea nu este rezultatul unui singur proces: Holocaustul și emigrarea în Israel, deportarea și plecarea germanilor, pierderea Basarabiei și a Cadrilaterului, apoi asimilarea au acționat succesiv. La recensământul din 2021, circa 9% dintre locuitori nu și-au declarat etnia; procentele se raportează la cei care au declarat-o.'],
  teritoriu: ['Suprafața statului român, 1859–2026', 'Șapte configurații teritoriale în 167 de ani. Saltul din 1918 și prăbușirea din 1940 sunt cele mai mari variații de graniță din istoria modernă a Europei de Est în afara războaielor mondiale propriu-zise.'],
}

const TEME_TITLU = {
  limba: 'Limba română', religie: 'Religie și Biserică', minoritati: 'Minoritățile',
  cultura: 'Cultură și știință', economie: 'Economia și societatea', geografie: 'Pământul și oamenii',
}

/* --- fragmente ----------------------------------------------------------- */
function figura(cheie) {
  const h = HARTI[cheie]
  if (!h) return ''
  const { vb, body } = h.spec()
  const leg = (h.legenda || []).map(([t, txt]) => {
    if (t === 'ceda') return `<span><i class="lin" style="border-top-color:var(--chinovar);border-top-style:dashed"></i>${esc(txt)}</span>`
    if (t === 'campanie') return `<span><i class="lin" style="border-top-color:var(--chinovar)"></i>${esc(txt)}</span>`
    if (t === 'hasu') return `<span><i class="hasu"></i>${esc(txt)}</span>`
    if (t === 'batalie') return `<span><i class="lin" style="border:0;color:var(--chinovar)">✕</i>${esc(txt)}</span>`
    if (t === 'sit') return `<span><i style="border:0;color:var(--chinovar)">▲</i>${esc(txt)}</span>`
    if (t === 'oras') return `<span><i style="border:0">●</i>${esc(txt)}</span>`
    if (t === 'capitala') return `<span><i style="border:0">◉</i>${esc(txt)}</span>`
    return `<span><i style="background:var(--m-${t})"></i>${esc(txt)}</span>`
  }).join('')
  return `<figure class="lat-plin"><div class="figura">
<svg viewBox="${vb}" role="img" aria-label="${esc(h.titlu)}" preserveAspectRatio="xMidYMid meet">${body}</svg>
${leg ? `<div class="legenda">${leg}</div>` : ''}
<figcaption><b>${esc(h.titlu)}</b> — ${esc(h.jos)}</figcaption>
</div></figure>`
}

function diagrama(cheie) {
  const gen = DIAG[cheie]; if (!gen) return ''
  const { vb, body } = gen()
  const [t, j] = SUBT_DIAG[cheie]
  return `<figure class="lat-plin"><div class="figura">
<svg class="diagrama" viewBox="${vb}" role="img" aria-label="${esc(t)}" preserveAspectRatio="xMidYMid meet">${body}</svg>
<figcaption><b>${esc(t)}</b> — ${esc(j)}</figcaption>
</div></figure>`
}

function corpCapitol(c) {
  const p = []
  if (c.rezumat) p.push(`<p class="cap-rezumat">${esc(c.rezumat)}</p>`)
  ;(c.sectiuni || []).forEach((s) => {
    p.push(`<section class="sectiune"><h3>${esc(s.subtitlu)}</h3><div class="proza">` +
      (s.paragrafe || []).map((x) => `<p>${esc(x)}</p>`).join('') + `</div></section>`)
  })
  return p.join('')
}

function anexeCapitol(c) {
  const p = []
  if (c.citat && c.citat.text) {
    p.push(`<figure class="citat"><blockquote>„${esc(c.citat.text)}”</blockquote>
<figcaption><b style="font-family:var(--sans);letter-spacing:.05em">${esc(c.citat.autor)}</b>${c.citat.context ? ' — ' + esc(c.citat.context) : ''}</figcaption></figure>`)
  }
  if (c.cifre && c.cifre.length) {
    p.push(`<div class="cifre">` + c.cifre.map((x) =>
      `<div class="cifra"><b>${esc(x.valoare)}</b><span>${esc(x.eticheta)}</span><small>${esc(x.nota)}</small></div>`).join('') + `</div>`)
  }
  if (c.figuri && c.figuri.length) {
    p.push(`<div class="figuri">` + c.figuri.map((x) =>
      `<div class="pers"><div class="pers-cap"><span class="pers-nume">${esc(x.nume)}</span><span class="pers-ani">${esc(x.ani)}</span></div><div class="pers-rol">${esc(x.rol)}</div><p>${esc(x.descriere)}</p></div>`).join('') + `</div>`)
  }
  if (c.cronologie && c.cronologie.length) {
    p.push(`<div class="cronologie"><div class="rubrica-m">Repere</div><dl class="cron-lista">` +
      c.cronologie.map((x) => `<dt>${esc(x.an)}</dt><dd>${esc(x.eveniment)}</dd>`).join('') + `</dl></div>`)
  }
  if (c.controversa) {
    p.push(`<div class="controversa"><div class="rubrica">Dispută istoriografică</div><p>${esc(c.controversa)}</p></div>`)
  }
  return p.join('')
}

/* --- pagina -------------------------------------------------------------- */
export function construieste(continut) {
  const css = readFileSync(new URL('./stil.css', import.meta.url), 'utf8')
  const capById = Object.fromEntries((continut.capitole || []).map((c) => [c.id, c]))
  const temeById = Object.fromEntries((continut.teme || []).map((c) => [c.id, c]))

  const cap = PLAN.map((pl) => ({ ...pl, ...(capById[pl.id] || {}) }))
    .filter((c) => c.sectiuni && c.sectiuni.length)
  const teme = PLAN_TEME.map((pl) => ({ ...pl, titlu: TEME_TITLU[pl.id], ...(temeById[pl.id] || {}) }))
    .filter((c) => c.sectiuni && c.sectiuni.length)

  const cuvinte = [...cap, ...teme].reduce((n, c) =>
    n + (c.sectiuni || []).reduce((m, s) => m + s.paragrafe.join(' ').split(/\s+/).length, 0), 0)
  const nrHarti = new Set(cap.flatMap((c) => c.harti || [])).size

  /* cronograma foloseste planul complet, ca scara sa nu sara intre versiuni */
  const crono = cronograma(PLAN.map((p) => ({ ...p, titlu: (capById[p.id] || {}).titlu || p.id })))

  /* --- rail: inaltimi proportionale cu durata reala --------------------- */
  const A0 = -1000, A1 = 2026
  const rail = PLAN.map((p) => {
    const top = ((p.de - A0) / (A1 - A0)) * 100
    const h = ((Math.min(p.la, A1) - p.de) / (A1 - A0)) * 100
    const c = capById[p.id]
    return `<a class="rail-ep${h < 1.6 ? ' mic' : h < 5 ? ' fara-titlu' : ''}" href="#${p.id}" data-id="${p.id}" data-per="${esc(p.per)}" data-titlu="${esc((c || {}).titlu || '')}" style="top:${top.toFixed(3)}%;height:${h.toFixed(3)}%" title="${esc(p.per)} — ${esc((c || {}).titlu || '')}">
<span><i>${esc(p.per)}</i><b>${esc((c || {}).titlu || '')}</b></span></a>`
  }).join('')

  const cuprins = [...cap, ...teme].map((c) =>
    `<a href="#${c.id}"><b>${esc(c.per === 'transversal' ? '—' : c.per)}</b><span>${esc(c.titlu)}</span></a>`).join('')

  const corpCapitole = cap.map((c, i) => {
    const fig = (c.harti || []).map(figura).join('')
    const dia = (c.diagrame || []).map(diagrama).join('')
    const ani = Math.abs(c.la - c.de)
    return `<article class="capitol" id="${c.id}">
<header class="cap-cap"><div class="cap-meta">
<span class="cap-per">${esc(c.per)}</span>
<span class="cap-durata">${ani >= 2 ? ani + ' ani' : 'un an'} · capitolul ${i + 1} din ${cap.length}</span>
</div><h2 class="cap-titlu">${esc(c.titlu)}</h2></header>
<div class="corp">${corpCapitol(c)}</div>
${fig}${dia}
<div class="corp">${anexeCapitol(c)}</div>
</article>`
  }).join('')

  const corpTeme = teme.map((c) => {
    const dia = (c.diagrame || []).map(diagrama).join('')
    return `<article class="capitol" id="${c.id}">
<header class="cap-cap"><div class="cap-meta">
<span class="cap-per">Secțiune tematică</span>
<span class="cap-durata">de la antichitate până azi</span>
</div><h2 class="cap-titlu">${esc(c.titlu)}</h2></header>
<div class="corp">${corpCapitol(c)}</div>
${dia}
<div class="corp">${anexeCapitol(c)}</div>
</article>`
  }).join('')

  return `<title>Istoria României</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=Spectral:ital,wght@0,300;0,600;1,300;1,400&family=IBM+Plex+Sans+Condensed:wght@400;500;600&display=swap">
<style>${css}</style>

<header class="frontispiciu">
  <div class="banda">
    <div class="fr-grid">
      <div>
        <div class="rubrica">Volum enciclopedic ilustrat</div>
        <h1 class="fr-titlu">Istoria<br>României<br><em>în 3.026 de ani</em></h1>
        <p class="fr-sub">De la depozitele de bronzuri ale primei epoci a fierului până la alegerile din 2025: o istorie a spațiului carpato-danubiano-pontic, cu hărțile desenate din coordonate reale și cu paginile ei dificile lăsate la vedere.</p>
        <div class="fr-date">
          <div><b>${cap.length}</b><span>capitole</span></div>
          <div><b>${teme.length}</b><span>secțiuni tematice</span></div>
          <div><b>${nrHarti}</b><span>hărți originale</span></div>
          <div><b>${(Math.round(cuvinte / 500) / 2).toLocaleString('ro-RO')}k</b><span>cuvinte</span></div>
        </div>
      </div>
      <div class="fr-teza">
        <p>Statul român în hotarele de azi are 79 de ani. Numele „România” are 165. Limba are aproximativ o mie cinci sute. Locul are trei mii.</p>
        <p>Cele patru nu se suprapun, iar cea mai mare parte a confuziilor din istoria acestei țări vine din a le trata ca și cum s-ar suprapune.</p>
      </div>
    </div>
    <figure class="fr-crono"><div class="figura" style="background:var(--surface2)">
    <svg class="diagrama" viewBox="${crono.vb}" role="img" aria-label="Cronograma celor 3.026 de ani, la scară" preserveAspectRatio="xMidYMid meet">${crono.body}</svg>
    <figcaption>Fiecare bandă este un capitol, lată cât durata lui reală. Ultima sută de ani ocupă <b>3% din timp</b> și aproape jumătate din text — nu din patriotism, ci fiindcă densitatea izvoarelor crește exponențial.</figcaption>
    </div></figure>
  </div>
</header>

<main class="banda schela">
  <nav class="rail" aria-label="Cronologie">
    <div class="rail-cap rubrica-m">Cronologic</div>
    <div class="rail-scara">${rail}</div>
    <div class="rail-legenda" id="rail-activ" aria-live="polite"></div>
    <div class="rail-nota">Înălțimea fiecărei benzi este durata ei reală.</div>
  </nav>
  <div>
    <section class="capitol" id="argument" style="border-top:0">
      <div class="corp">
        <div class="rubrica">Argument</div>
        <h2 class="cap-titlu" style="margin-top:.4rem">Ce se poate spune cu certitudine</h2>
        <div class="proza" style="margin-top:1.2rem">
          <p>Istoria acestui spațiu este scrisă, mai mult decât altele din Europa, în jurul unei întrebări de identitate: de unde vin românii. Întrebarea a fost pusă politic încă din secolul al XVIII-lea, când Școala Ardeleană avea nevoie de argumentul latinității pentru a cere drepturi în Transilvania, și a fost pusă din nou, cu semn contrar, de istoriografia maghiară și de cea sovietică. Răspunsul onest este că izvoarele scrise tac aproape o mie de ani, între retragerea aureliană și primele mențiuni medievale, și că arheologia nu poate confirma o etnie.</p>
          <p>Volumul acesta încearcă altceva: să spună ce se poate documenta, să numească explicit ce este disputat și să nu confunde tradiția istoriografică romantică cu faptul stabilit. Fiecare capitol are, la sfârșit, o notă despre principala controversă a epocii, cu ambele poziții expuse corect. Paginile dificile — Holocaustul din România, colaborarea cu Germania nazistă, represiunea comunistă, mineriadele, eșecurile tranziției — sunt tratate la fel de detaliat ca victoriile.</p>
          <p>Hărțile nu sunt ilustrații decorative. Sunt desenate din coordonate geografice reale, iar fiecare hotar istoric — Carpații, Prutul, Nistrul, Oltul, Milcovul, linia Dictatului de la Viena — este definit o singură dată și reutilizat, astfel încât suprafețele să fie comparabile de la o hartă la alta. Ariile calculate se abat cu mai puțin de un procent de la cele reale.</p>
        </div>
      </div>
      ${diagrama('teritoriu')}
      <div class="corp">
        <div class="cuprins">${cuprins}</div>
      </div>
    </section>
    ${corpCapitole}
    ${corpTeme}
  </div>
</main>

<footer class="colofon">
  <div class="banda">
    <h2>Notă asupra metodei</h2>
    <p>Textul a fost redactat capitol cu capitol și trecut apoi printr-o verificare factuală separată, care a urmărit datele, numele proprii, cifrele și atribuirea citatelor. Acolo unde o cifră este disputată în literatura de specialitate — numărul victimelor răscoalei din 1907, bilanțul Holocaustului din România, numărul morților din decembrie 1989 — este dată ca interval, cu menționarea disputei, nu ca valoare unică.</p>
    <p>Hărțile sunt originale, generate din contururi în coordonate geografice; nu reproduc hărți existente. Diagramele folosesc date de recensământ și suprafețe oficiale. Proporțiile lexicale ale limbii române urmează calculele lui Marius Sala pe vocabularul reprezentativ.</p>
    <p style="color:var(--muted);font-size:.86em;margin-top:1.4rem">O lucrare de sinteză nu înlocuiește lectura specialiștilor. Pentru fiecare epocă există bibliografii mult mai bogate decât ce încape într-un volum ilustrat, iar unele dintre judecățile de aici sunt, inevitabil, discutabile.</p>
  </div>
</footer>

<script>
(function () {
  var ep = Array.prototype.slice.call(document.querySelectorAll('.rail-ep'))
  if (!ep.length || !('IntersectionObserver' in window)) return
  var harta = {}
  ep.forEach(function (a) { harta[a.dataset.id] = a })
  var vizibile = {}
  var obs = new IntersectionObserver(function (intrari) {
    intrari.forEach(function (i) { vizibile[i.target.id] = i.isIntersecting })
    var activ = null
    for (var k in harta) if (vizibile[k]) { activ = k; break }
    ep.forEach(function (a) { a.classList.toggle('activ', a.dataset.id === activ) })
    var cutie = document.getElementById('rail-activ')
    if (cutie && activ && harta[activ]) {
      cutie.innerHTML = '<i></i><b></b>'
      cutie.firstChild.textContent = harta[activ].dataset.per
      cutie.lastChild.textContent = harta[activ].dataset.titlu
    }
  }, { rootMargin: '-15% 0px -70% 0px' })
  document.querySelectorAll('article.capitol[id]').forEach(function (n) { obs.observe(n) })
})()
</script>`
}

/* --- rulare -------------------------------------------------------------- */
const caleContinut = new URL('./continut.json', import.meta.url)
const continut = existsSync(caleContinut) ? JSON.parse(readFileSync(caleContinut, 'utf8')) : { capitole: [], teme: [] }
const html = construieste(continut)
writeFileSync(new URL('../istoria-romaniei.html', import.meta.url), html)
console.log(`scris: ${(html.length / 1024).toFixed(0)} KB · ${continut.capitole?.length || 0} capitole · ${continut.teme?.length || 0} teme`)
