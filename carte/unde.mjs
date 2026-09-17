import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
import { COMPLETEAZA_CAPETE } from './capete.mjs'
const RAD = new URL('./', import.meta.url).pathname
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 1000, height: 1400 } })
await p.goto('file://' + RAD + process.argv[2], { waitUntil: 'load', timeout: 180000 })
await p.addScriptTag({ path: RAD + 'node_modules/pagedjs/dist/paged.polyfill.js' })
await p.waitForFunction(() => { const n=document.querySelectorAll('.pagedjs_page').length
  window.__s = window.__n===n ? (window.__s||0)+1 : 0; window.__n=n; return window.__s>6 }, null, {timeout:600000, polling:700})
await p.evaluate(COMPLETEAZA_CAPETE)
const r = await p.evaluate(() => {
  const out = []
  document.querySelectorAll('figure.ilustratie').forEach(f => {
    const pg = f.closest('.pagedjs_page')
    const img = f.querySelector('img')
    out.push({ id: f.id, pag: pg ? +pg.getAttribute('data-page-number') : null,
      h: Math.round(f.getBoundingClientRect().height),
      incarcata: img ? (img.naturalWidth > 0) : false })
  })
  return { total: out.length, neincarcate: out.filter(x=>!x.incarcata).length, lista: out.slice(0,60) }
})
console.log('ilustrații:', r.total, '· neîncărcate:', r.neincarcate)
console.log('pagini:', r.lista.map(x=>x.pag).join(' '))
await b.close()
