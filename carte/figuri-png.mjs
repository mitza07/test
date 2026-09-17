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

const DIAGRAME = { populatie: diagramaPopulatie, lexic: diagramaLexic,
  etnic: diagramaEtnic, teritoriu: diagramaTeritoriu }

const RAD = new URL('./', import.meta.url).pathname
const DIR = RAD + 'ilustratii/figuri/'
const CSS = readFileSync(RAD + '../build/stil.css', 'utf8')
const LAT = 1800                      /* 117 mm la circa 390 puncte pe tol */

mkdirSync(DIR, { recursive: true })

const figuri = [
  ...Object.entries(HARTI).map(([k, h]) => ({ k, tip: 'harta', titlu: h.titlu, jos: h.jos, gen: () => h.spec() })),
  ...Object.entries(DIAGRAME).map(([k, g]) => ({ k, tip: 'diagrama', gen: g })),
]

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 })
const indice = []
for (const f of figuri) {
  const { vb, body } = f.gen()
  const [, , w, h] = vb.split(/\s+/).map(Number)
  const inalt = Math.round((LAT * h) / w)
  await page.setViewportSize({ width: Math.round(LAT / 2), height: Math.round(inalt / 2) + 20 })
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}
    html,body{margin:0;background:#fff}
    svg{width:${LAT / 2}px;height:${inalt / 2}px;display:block}</style>
    <svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`)
  await page.waitForTimeout(120)
  const el = await page.$('svg')
  const cale = DIR + f.k + '.png'
  await el.screenshot({ path: cale, type: 'png' })
  indice.push({ cheie: f.k, tip: f.tip, latime: LAT, inaltime: inalt })
  console.log(`${f.k.padEnd(18)} ${LAT}×${inalt}`)
}
await browser.close()
writeFileSync(DIR + 'index.json', JSON.stringify(indice, null, 1))
console.log(`${indice.length} figuri în ${DIR.replace(RAD, '')}`)
