/* ===========================================================================
   Hartile si diagramele, scoase ca PNG.
   ---------------------------------------------------------------------------
   Manuscrisul .docx nu poate purta SVG: Word nu-l deseneaza. Pana acum toate
   hartile si toate diagramele lipseau din manuscris, desi sunt parte din carte.
   Se randeaza aici o data, la latime de tipar, si se pun in document ca poze.
   =========================================================================== */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { HARTI } from '../build/harti.mjs'
import { diagramaPopulatie, diagramaLexic, diagramaEtnic, diagramaTeritoriu } from '../build/diagrame.mjs'
import { bandaCronologica } from '../build/cronograf.mjs'
import { bandaVietilor } from '../build/vieti.mjs'
import { bandaZilelor } from '../build/ceas.mjs'
import { CEASURI } from '../build/ceasuri.mjs'
import { PLAN, PLAN_TEME } from '../build/build.mjs'

const DIAGRAME = { populatie: diagramaPopulatie, lexic: diagramaLexic,
  etnic: diagramaEtnic, teritoriu: diagramaTeritoriu }

const RAD = new URL('./', import.meta.url).pathname
const DIR = RAD + 'ilustratii/figuri/'
const CSS = readFileSync(RAD + '../build/stil.css', 'utf8')
const LAT = 1800                      /* 117 mm la circa 390 puncte pe tol */

mkdirSync(DIR, { recursive: true })

/* Benzile de timp sunt si ele continut, nu ornament: fara ele manuscrisul
   ramane iar mai sarac decat cartea. Una de repere si una de vieti, de fiecare
   capitol si de fiecare tema. */
const continut = JSON.parse(readFileSync(RAD + '../build/continut.json', 'utf8'))
const plan = Object.fromEntries([...PLAN, ...PLAN_TEME].map((p) => [p.id, p]))
const sectiuni = [...continut.capitole, ...continut.teme]
  .map((c) => ({ ...(plan[c.id] || {}), ...c }))

const figuri = [
  ...Object.entries(HARTI).map(([k, h]) => ({ k, tip: 'harta', titlu: h.titlu, jos: h.jos, gen: () => h.spec() })),
  ...Object.entries(DIAGRAME).map(([k, g]) => ({ k, tip: 'diagrama', gen: g })),
  ...sectiuni.map((c) => ({ k: 'banda-' + c.id, tip: 'banda', lat: 1400,
    gen: () => bandaCronologica(c, { de: -6000, la: 2026 }) })),
  ...sectiuni.map((c) => ({ k: 'vieti-' + c.id, tip: 'vieti', lat: 1400,
    gen: () => bandaVietilor(c, { de: c.de, la: c.la }) })),
  /* benzile pe ceas: capitolele in care unitatea de masura e ziua, nu anul */
  ...sectiuni.filter((c) => CEASURI[c.id]).map((c) => ({ k: 'ceas-' + c.id, tip: 'ceas', lat: 1600,
    titlu: CEASURI[c.id].titlu, jos: CEASURI[c.id].jos,
    gen: () => bandaZilelor(c, CEASURI[c.id]) })),
].filter((f) => f.gen())

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 })
const indice = []
for (const f of figuri) {
  const { vb, body } = f.gen()
  const [, , w, h] = vb.split(/\s+/).map(Number)
  const lat = f.lat || LAT
  const inalt = Math.round((lat * h) / w)
  await page.setViewportSize({ width: Math.round(lat / 2), height: Math.round(inalt / 2) + 20 })
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}
    html,body{margin:0;background:#fff}
    svg{width:${lat / 2}px;height:${inalt / 2}px;display:block}</style>
    <svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`)
  await page.waitForTimeout(120)
  const el = await page.$('svg')
  const cale = DIR + f.k + '.png'
  await el.screenshot({ path: cale, type: 'png' })
  indice.push({ cheie: f.k, tip: f.tip, latime: lat, inaltime: inalt })
  if (f.tip === 'harta' || f.tip === 'diagrama') console.log(`${f.k.padEnd(18)} ${lat}×${inalt}`)
}
await browser.close()
writeFileSync(DIR + 'index.json', JSON.stringify(indice, null, 1))
const pe = {}
for (const f of indice) pe[f.tip] = (pe[f.tip] || 0) + 1
console.log(`${indice.length} figuri în ${DIR.replace(RAD, '')}: ` + Object.entries(pe).map(([k, v]) => `${v} ${k}`).join(', '))
