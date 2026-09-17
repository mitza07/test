/* ===========================================================================
   COPERTA — fata, cotor si spate, intr-o singura plansa, cu bleed.
   Desenul de pe fata este chiar teza volumului: cele sapte configuratii
   teritoriale ale statului roman, suprapuse. Conturul plin este Romania de
   azi; celelalte sunt, in ordine, 1859, 1878, 1918 si 1940.
   =========================================================================== */
import { writeFileSync, readFileSync } from 'fs'
import { FRONTIERE, ZONE } from '../build/geo.js'

const RAD = new URL('./', import.meta.url).pathname
const IN = 25.4
const PAGINI = Number(process.argv[2] || 488)
const HARTIE = process.argv.includes('--alba') ? 'alba' : 'crem'
/* --volum=1 sau --volum=2 pentru editia in doua tomuri */
const VOLUM = Number((process.argv.find((x) => x.startsWith('--volum=')) || '').split('=')[1] || 0)
const VOL = {
  1: { nr: 'Volumul I', tit: 'Cronologia', sub: 'de la 1000 î.Hr. până azi',
       desc: 'Douăzeci și trei de capitole, de la primele comunități neolitice până la România din Uniunea Europeană. Fiecare capitol se încheie cu principala dispută istoriografică a epocii, cu ambele poziții expuse corect.' },
  2: { nr: 'Volumul II', tit: 'Priviri transversale', sub: 'și atlasul hărților vechi',
       desc: 'Șaptesprezece priviri care taie cronologia de-a curmezișul — limba, credința, minoritățile, evreii, romii, aromânii, Basarabia, orașul, femeile, hrana, boala, sportul, mediul — și o planșă de hărți vechi, de la Mercator la harta etnografică de la Trianon.' },
}[VOLUM]
const GROSIME = HARTIE === 'alba' ? 0.002252 : 0.0025

const cotor = PAGINI * GROSIME * IN            /* mm */
const bleed = 0.125 * IN                       /* 3,175 mm */
const latTrim = 6 * IN, inaltTrim = 9 * IN
const W = bleed + latTrim + cotor + latTrim + bleed
const H = bleed + inaltTrim + bleed

/* ---- proiectia hartii, aceeasi ca in atlas ------------------------------- */
const LAT0 = 45.8, LON0 = 25.0, K = 100
const kx = Math.cos((LAT0 * Math.PI) / 180) * K
const proj = ([lon, lat]) => [(lon - LON0) * kx, -(lat - LAT0) * K]
const cale = (ring) => ring.map(proj).map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('') + 'Z'

/* cadrul hartii, in unitati de proiectie */
const [x0, y1] = proj([19.7, 42.4])
const [x1, y0] = proj([31.4, 49.1])
const vb = `${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}`

const STRATURI = [
  { d: cale(FRONTIERE.principate1859), an: '1859', cul: '#b8862c', gros: 2.4, extra: '' },
  { d: cale(FRONTIERE.regat1878),      an: '1878', cul: '#e0a93e', gros: 2.4, extra: '' },
  { d: cale(FRONTIERE.romaniaMare),    an: '1918', cul: '#7fb2d8', gros: 3.2, extra: '' },
  { d: cale(ZONE.vienaNV),             an: '1940', cul: '#d4593a', gros: 2.8, extra: 'stroke-dasharray:11 6;' },
  { d: cale(FRONTIERE.romaniaAzi),     an: 'azi',  cul: '#ffffff', gros: 5.2, extra: '' },
]

const desen = `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet"
  style="position:absolute;inset:0;width:100%;height:100%">
  <g fill="none" stroke-linejoin="round">
    <path d="${cale(FRONTIERE.romaniaMare)}" fill="#152b3e" opacity=".5" stroke="none"/>
    <path d="${cale(FRONTIERE.romaniaAzi)}" fill="#1d3b53" opacity=".85" stroke="none"/>
    ${STRATURI.map((s) => `<path d="${s.d}" style="stroke:${s.cul};stroke-width:${s.gros};${s.extra}"/>`).join('\n    ')}
  </g>
</svg>`

const blurb = `Trei mii de ani de istorie a spațiului dintre Carpați, Dunăre și Marea Neagră,
de la depozitele de bronzuri ale primei epoci a fierului până la alegerile din 2025.`

const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><style>
@font-face { font-family: Spectral; font-weight: 300; src: url("fonturi/Spectral-300.ttf") format("truetype"); }
@font-face { font-family: Spectral; font-weight: 400; font-style: italic; src: url("fonturi/Spectral-400i.ttf") format("truetype"); }
@font-face { font-family: Spectral; font-weight: 600; src: url("fonturi/Spectral-600.ttf") format("truetype"); }
@font-face { font-family: Literata; font-weight: 400; src: url("fonturi/Literata-400.ttf") format("truetype"); }
@font-face { font-family: "Plex Cond"; font-weight: 400; src: url("fonturi/IBMPlexSansCondensed-400.ttf") format("truetype"); }
@font-face { font-family: "Plex Cond"; font-weight: 600; src: url("fonturi/IBMPlexSansCondensed-600.ttf") format("truetype"); }
@page { size: ${W.toFixed(2)}mm ${H.toFixed(2)}mm; margin: 0; }
* { box-sizing: border-box; margin: 0; }
body { width: ${W.toFixed(2)}mm; height: ${H.toFixed(2)}mm; background: #0c1620;
  color: #e8edf2; font-family: Literata, serif; display: flex; overflow: hidden; }
.spate, .fata { width: ${latTrim.toFixed(2)}mm; height: 100%; position: relative; }
.spate { padding: ${(bleed + 16).toFixed(1)}mm 14mm ${(bleed + 14).toFixed(1)}mm ${(bleed + 14).toFixed(1)}mm; }
.cotor { width: ${cotor.toFixed(2)}mm; height: 100%; background: #0a121b;
  border-left: .3mm solid rgba(255,255,255,.09); border-right: .3mm solid rgba(255,255,255,.09);
  display: flex; align-items: center; justify-content: center; }
.fata { padding: ${(bleed + 17).toFixed(1)}mm ${(bleed + 14).toFixed(1)}mm ${(bleed + 15).toFixed(1)}mm 14mm;
  display: flex; flex-direction: column; }

/* --- fata --- */
.harta { position: absolute; left: 1mm; right: 1mm; top: 46mm; bottom: 24mm; }
.supra { font-family: "Plex Cond"; font-size: 8pt; letter-spacing: .26em; text-transform: uppercase;
  color: #c9a13f; position: relative; z-index: 2; }
.titlu { font-family: Spectral; font-weight: 300; font-size: 46pt; line-height: .97;
  letter-spacing: -.015em; margin-top: 7mm; position: relative; z-index: 2; }
.sub { font-family: Spectral; font-weight: 300; font-style: italic; font-size: 19pt;
  color: #9dc0dc; margin-top: 4mm; position: relative; z-index: 2; }
.autor { margin-top: auto; font-family: "Plex Cond"; font-size: 11pt; letter-spacing: .14em;
  text-transform: uppercase; color: #e8edf2; position: relative; z-index: 2; }
.legenda-ani { position: absolute; right: ${(bleed + 14).toFixed(1)}mm; bottom: ${(bleed + 30).toFixed(1)}mm;
  z-index: 2; font-family: "Plex Cond"; font-size: 7pt; letter-spacing: .1em; color: #8fa6bb;
  text-align: right; line-height: 1.7; }
.legenda-ani b { color: #fff; font-weight: 600; }
.legenda-ani div { display: flex; align-items: center; justify-content: flex-end; gap: 2.2mm; }
.legenda-ani i { width: 7mm; height: .7mm; display: inline-block; }

/* --- cotor --- */
.cotor-text { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap;
  font-family: Spectral; font-weight: 300; font-size: 15pt; letter-spacing: .04em; color: #e8edf2; }
.cotor-text i { font-style: italic; font-size: 11pt; color: #9dc0dc; }

/* --- spate --- */
.spate p { font-family: Literata; font-size: 10pt; line-height: 15.4pt; color: #cdd9e4; margin-bottom: 5mm; }
.spate .cap { font-family: Spectral; font-weight: 300; font-size: 15pt; line-height: 1.3;
  color: #fff; margin-bottom: 6mm; }
.date { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 6mm; margin: 7mm 0;
  padding-top: 5mm; border-top: .3mm solid rgba(255,255,255,.18); }
.date div b { display: block; font-family: "Plex Cond"; font-size: 15pt; font-weight: 600; color: #c9a13f; }
.date div span { font-family: "Plex Cond"; font-size: 7.4pt; letter-spacing: .1em;
  text-transform: uppercase; color: #8fa6bb; }
.nota { font-family: "Plex Cond"; font-size: 7pt; line-height: 11pt; color: #7f93a6;
  border-left: .4mm solid #5b6b7b; padding-left: 3mm; }
.cod { position: absolute; left: ${(bleed + 14).toFixed(1)}mm; bottom: ${(bleed + 16).toFixed(1)}mm;
  width: 48mm; height: 26mm; background: #fff; display: flex; align-items: center;
  justify-content: center; font-family: "Plex Cond"; font-size: 7pt; color: #555; text-align: center; }

/* linii de taiere, doar pentru verificare — se sting la export */
.taiere { position: absolute; inset: 0; pointer-events: none; z-index: 9; }
.taiere i { position: absolute; background: rgba(255,0,0,.55); }
</style></head><body>

<div class="spate">
  <div class="cap">O istorie scrisă din ceea ce se poate documenta, nu din ceea ce ne-am dori să fie adevărat.</div>
  <p>${blurb}</p>
  <p>${VOL ? VOL.desc : 'Douăzeci și trei de capitole cronologice și șaptesprezece priviri transversale — limba, credința, minoritățile, cultura, economia, pământul. Fiecare capitol se încheie cu principala dispută a epocii, cu ambele poziții expuse corect.'}</p>
  <p>Cele douăsprezece hărți sunt desenate din coordonate geografice reale: fiecare hotar istoric e definit o singură dată și reutilizat, astfel încât suprafețele să rămână comparabile de la o epocă la alta.</p>
  <div class="date">
    <div><b>3.026</b><span>ani acoperiți</span></div>
    <div><b>12</b><span>hărți originale</span></div>
    <div><b>40</b><span>dispute istoriografice</span></div>
    <div><b>238</b><span>ilustrații de arhivă</span></div>
  </div>
  <div class="nota">Textul a fost redactat cu ajutorul unui model de limbaj și trecut printr-o verificare factuală automată, care a corectat 568 de erori. Volumul se citește ca sinteză, nu ca lucrare de referință.</div>
  <div class="cod">cod de bare ISBN<br>48 × 26 mm</div>
</div>

<div class="cotor"><div class="cotor-text">Istoria României &nbsp;<i>${VOL ? VOL.nr + ' · ' + VOL.tit : 'în 3.026 de ani'}</i></div></div>

<div class="fata">
  <div class="harta">${desen}</div>
  <div class="supra">${VOL ? VOL.nr + ' din două' : 'Volum enciclopedic ilustrat'}</div>
  <div class="titlu">Istoria<br>României</div>
  <div class="sub">${VOL ? VOL.tit + ' — ' + VOL.sub : 'în 3.026 de ani'}</div>
  <div class="legenda-ani">
    ${STRATURI.map((s) => `<div><i style="background:${s.cul}"></i>${s.an === 'azi' ? '<b>azi</b>' : s.an}</div>`).join('')}
  </div>
  <div class="autor">[numele autorului]</div>
</div>

</body></html>`

writeFileSync(RAD + `.coperta${VOLUM ? '-v' + VOLUM : ''}.html`, html)
console.log(`copertă${VOLUM ? ' vol. ' + VOLUM : ''} ${W.toFixed(1)} × ${H.toFixed(1)} mm · cotor ${cotor.toFixed(1)} mm (${PAGINI} pagini, hârtie ${HARTIE})`)

/* --- randare --------------------------------------------------------------- */
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage()
await p.goto('file://' + RAD + '.coperta.html', { waitUntil: 'load' })
await p.waitForTimeout(1500)
const sufix = VOLUM ? `-vol${VOLUM}` : ''
await p.pdf({ path: RAD + `Istoria-Romaniei-coperta${sufix}.pdf`, printBackground: true, preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 } })
await p.setViewportSize({ width: Math.round(W * 4), height: Math.round(H * 4) })
await p.screenshot({ path: RAD + `coperta-previz${sufix}.png`, fullPage: false })

/* coperta de ebook: doar fata, 1600 × 2560 px */
await p.setViewportSize({ width: 1600, height: 2560 })
await p.evaluate(() => {
  document.body.style.width = '1600px'; document.body.style.height = '2560px'
  document.querySelector('.spate').remove(); document.querySelector('.cotor').remove()
  const f = document.querySelector('.fata')
  f.style.width = '1600px'; f.style.height = '2560px'
  f.style.padding = '150px 120px 130px 120px'
  document.querySelector('.titlu').style.fontSize = '128px'
  document.querySelector('.sub').style.fontSize = '54px'
  document.querySelector('.supra').style.fontSize = '22px'
  document.querySelector('.autor').style.fontSize = '30px'
  const h = document.querySelector('.harta')
  h.style.left = '10px'; h.style.right = '10px'; h.style.top = '560px'; h.style.bottom = '270px'
  const l = document.querySelector('.legenda-ani')
  l.style.right = '120px'; l.style.bottom = '330px'; l.style.fontSize = '20px'
})
await p.waitForTimeout(600)
await p.screenshot({ path: RAD + `coperta-ebook${sufix}.png` })
await b.close()
console.log(`Istoria-Romaniei-coperta${sufix}.pdf · coperta-previz${sufix}.png · coperta-ebook${sufix}.png`)
