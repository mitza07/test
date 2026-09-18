import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
import { COMPLETEAZA_CAPETE } from './capete.mjs'
const RAD = new URL('./', import.meta.url).pathname
const fis = process.argv[2], pagini = process.argv.slice(3).map(Number)
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 1200, height: 1700 } })
await p.goto('file://' + RAD + fis, { waitUntil: 'load', timeout: 180000 })
await p.addScriptTag({ path: RAD + 'node_modules/pagedjs/dist/paged.polyfill.js' })
await p.waitForFunction(() => {
  const n = document.querySelectorAll('.pagedjs_page').length
  window.__s = window.__n === n ? (window.__s || 0) + 1 : 0; window.__n = n
  return window.__s > 6
}, null, { timeout: 600000, polling: 700 })
await p.evaluate(COMPLETEAZA_CAPETE)
for (const n of pagini) {
  const el = await p.$(`.pagedjs_page[data-page-number="${n}"]`)
  if (!el) { console.log('lipsă pagina', n); continue }
  await el.screenshot({ path: `${RAD}p-${n}.png` })
  console.log('p-' + n + '.png')
}
await b.close()
