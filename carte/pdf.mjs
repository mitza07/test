/* ===========================================================================
   Pagineaza macheta cu Paged.js in Chromium si scoate PDF-ul de tipar.
   Ruleaza in doua treceri: prima afla pe ce pagina cade fiecare ancora de
   indice, a doua reconstruieste indicele cu numerele reale si il pagineaza
   din nou. Indicele fiind la sfarsit, a doua trecere nu misca paginatia
   corpului.
   =========================================================================== */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
import { readFileSync, writeFileSync } from 'fs'
import { construiesteTipar } from './tipar.mjs'
import { COMPLETEAZA_CAPETE } from './capete.mjs'

const RAD = new URL('./', import.meta.url).pathname
const POLYFILL = RAD + 'node_modules/pagedjs/dist/paged.polyfill.js'
const color = process.argv.includes('--color')
const eticheta = color ? 'color' : 'alb-negru'

const continut = JSON.parse(readFileSync(RAD + '../build/continut.json', 'utf8'))

/* --- alfabetizare romaneasca pentru indice -------------------------------- */
const colator = new Intl.Collator('ro', { sensitivity: 'base', numeric: true })
const fara = (s) => s.normalize('NFD').replace(/[̀-̧̦ͯ]/g, '')

function compuneIndice(perTermen) {
  const termeni = [...perTermen.entries()]
    .map(([t, set]) => ({ t, p: [...set].sort((a, b) => a - b) }))
    .filter((x) => x.p.length)
    .sort((a, b) => colator.compare(a.t, b.t))

  /* paginile consecutive se string in intervale: 44, 45, 46 -> 44-46 */
  const interval = (p) => {
    const out = []
    let i = 0
    while (i < p.length) {
      let j = i
      while (j + 1 < p.length && p[j + 1] === p[j] + 1) j++
      out.push(j > i + 1 ? `${p[i]}–${p[j]}` : p.slice(i, j + 1).join(', '))
      i = j + 1
    }
    return out.join(', ')
  }

  let litera = '', html = ''
  for (const x of termeni) {
    const L = fara(x.t[0]).toUpperCase()
    if (L !== litera && /[A-Z]/.test(L)) { litera = L; html += `<div><div class="litera">${L}</div></div>` }
    html += `<div><span class="nume">${x.t}</span> <span class="pagini">${interval(x.p)}</span></div>`
  }
  return { html, nrTermeni: termeni.length }
}

/* --- o trecere de paginare ------------------------------------------------ */
async function pagineaza(browser, html, numeFisier, { citesteAncore = false } = {}) {
  writeFileSync(RAD + numeFisier, html)
  const page = await browser.newPage()
  const erori = []
  page.on('pageerror', (e) => erori.push(String(e).slice(0, 200)))
  await page.goto('file://' + RAD + numeFisier, { waitUntil: 'load', timeout: 180000 })
  await page.addScriptTag({ path: POLYFILL })

  /* Paged.js incepe singur; asteptam ca numarul de pagini sa se opreasca */
  await page.waitForFunction(() => document.querySelectorAll('.pagedjs_page').length > 0,
    null, { timeout: 300000 })
  await page.waitForFunction(() => {
    const n = document.querySelectorAll('.pagedjs_page').length
    if (window.__n === n) { window.__stabil = (window.__stabil || 0) + 1 } else { window.__stabil = 0 }
    window.__n = n
    return window.__stabil > 6
  }, null, { timeout: 600000, polling: 700 })

  await page.evaluate(COMPLETEAZA_CAPETE)

  const date = await page.evaluate(() => {
    const nrPag = (el) => {
      const p = el.closest('.pagedjs_page')
      return p ? Number(p.getAttribute('data-page-number')) : null
    }
    const out = { pagini: document.querySelectorAll('.pagedjs_page').length, ancore: [] }
    document.querySelectorAll('.ix').forEach((el) => {
      const n = nrPag(el)
      if (n) out.ancore.push([el.id, n])
    })
    return out
  })
  if (erori.length) console.log('  erori JS:', erori.slice(0, 3).join(' | '))
  return { page, date }
}

/* ========================================================================== */
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
console.log(`ediția ${eticheta}`)

/* --- trecerea I: aflam paginile ancorelor --------------------------------- */
const p1 = construiesteTipar(continut, { color })
console.log(`  trecerea I: ${p1.ancore.length} ancore, se paginează…`)
const r1 = await pagineaza(browser, p1.html, `.lucru-1-${eticheta}.html`)
console.log(`  trecerea I: ${r1.date.pagini} pagini, ${r1.date.ancore.length} ancore localizate`)
await r1.page.close()

/* --- indicele -------------------------------------------------------------- */
const idTermen = new Map(p1.ancore.map((a) => [a.id, a.termen]))
const perTermen = new Map()
for (const [id, pg] of r1.date.ancore) {
  const t = idTermen.get(id); if (!t) continue
  if (!perTermen.has(t)) perTermen.set(t, new Set())
  perTermen.get(t).add(pg)
}
const { html: indiceHtml, nrTermeni } = compuneIndice(perTermen)
console.log(`  indice: ${nrTermeni} intrări`)

/* --- trecerea a II-a: cu indicele complet ---------------------------------- */
const p2 = construiesteTipar(continut, { color, indice: indiceHtml })
const r2 = await pagineaza(browser, p2.html, `.lucru-2-${eticheta}.html`)
console.log(`  trecerea a II-a: ${r2.date.pagini} pagini`)

const iesire = RAD + `Istoria-Romaniei-interior-${eticheta}.pdf`
await r2.page.pdf({
  path: iesire,
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
})
await r2.page.close()
await browser.close()

const { statSync } = await import('fs')
console.log(`\n${iesire.split('/').pop()} · ${r2.date.pagini} pagini · ${(statSync(iesire).size / 1048576).toFixed(1)} MB`)
writeFileSync(RAD + `.paginatie-${eticheta}.json`, JSON.stringify({ pagini: r2.date.pagini, termeni: nrTermeni }, null, 1))
