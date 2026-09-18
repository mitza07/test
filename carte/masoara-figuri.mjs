/* ===========================================================================
   Cat de des se uita ochiul de pe text.
   ---------------------------------------------------------------------------
   Masura defectului pe care nu-l vede niciun randator: o pagina poate fi
   impecabila si tot sa fie a douazeci si sasea la rand fara nimic de privit.
   Se numara pe macheta gata paginata — acelasi Paged.js, acelasi Chromium ca
   la pdf.mjs — cate pagini n-au nicio figura si cat de lungi sunt sirurile
   numai cu text.

   Corpul se numara aparte de materialul final: indicele alfabetic si lista
   figurilor sunt liste de consultat, si acolo lipsa figurilor nu e un cusur.

       node masoara-figuri.mjs 1
       node masoara-figuri.mjs 2
   =========================================================================== */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
import { readFileSync, writeFileSync, rmSync } from 'fs'
import { construiesteTipar } from './tipar.mjs'

const RAD = new URL('./', import.meta.url).pathname
const POLYFILL = RAD + 'node_modules/pagedjs/dist/paged.polyfill.js'
const continut = JSON.parse(readFileSync(RAD + '../build/continut.json', 'utf8'))
const volum = Number(process.argv[2] || 1)
const { html } = construiesteTipar(continut, { color: false, volum })
const tmp = RAD + `.masoara-v${volum}.html`
writeFileSync(tmp, html.replace('</head>', `<script src="${POLYFILL}"></script></head>`))

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage()
await p.goto('file://' + tmp, { waitUntil: 'load', timeout: 300000 })
/* aceeasi asteptare ca in pdf.mjs: numarul de pagini trebuie sa se opreasca */
await p.waitForFunction(() => document.querySelectorAll('.pagedjs_page').length > 0, null, { timeout: 300000 })
await p.waitForFunction(() => {
  const n = document.querySelectorAll('.pagedjs_page').length
  if (window.__n === n) { window.__stabil = (window.__stabil || 0) + 1 } else { window.__stabil = 0 }
  window.__n = n
  return window.__stabil > 6
}, null, { timeout: 900000, polling: 700 })
const r = await p.evaluate(() => {
  const pag = [...document.querySelectorAll('.pagedjs_page')]
  return pag.map((x) => {
    const are = x.querySelector('figure, .cifre, .citat, .vieti, .tabel-cap, svg, img')
    const text = (x.innerText || '').trim().length
    /* de care capitol tine pagina, si daca pagina e din corp sau din
       materialul final — indicele, lista de figuri, tabelele de la sfarsit
       sunt liste de consultat, si acolo lipsa figurilor nu e un cusur */
    const art = x.closest('.capitol') || x.querySelector('.capitol')
    const inCorp = Boolean(x.querySelector('.sectiune, .proza, figure, .cifre, .citat')) &&
      !x.querySelector('.aparat, .indice, .lista-figuri, .tabel-cutie')
    const id = (x.querySelector('article[id]') || {}).id || ''
    return { fig: Boolean(are), text, unde: id, corp: inCorp }
  })
})
await b.close()
/* macheta de lucru sta in carte/, ca sa se rezolve caile catre poze; se sterge
   dupa masuratoare, sa nu ramana pe disc un fisier de trei megaocteti */
rmSync(tmp, { force: true })
const n = r.length
const fara = r.filter((x) => !x.fig && x.text > 400).length
const corp = r.filter((x) => x.corp)
const faraCorp = corp.filter((x) => !x.fig && x.text > 400).length
const siruri = []
let cur = 0
r.forEach((x, i) => {
  if (!x.fig && x.text > 400) cur++
  else { if (cur >= 6) siruri.push({ de: i - cur + 1, lung: cur }); cur = 0 }
})
if (cur >= 6) siruri.push({ de: r.length - cur + 1, lung: cur })
siruri.sort((a, b) => b.lung - a.lung)
const max = siruri.length ? siruri[0].lung : 0
console.log(`vol${volum}: ${n} pagini · ${fara} fara nicio figura (${Math.round(100 * fara / n)}%)`)
console.log(`   din corpul cartii: ${corp.length} pagini, ${faraCorp} fara figura (${Math.round(100 * faraCorp / corp.length)}%)`)
console.log(`   cel mai lung sir numai cu text: ${max}`)
for (const s of siruri.slice(0, 6)) {
  const unde = [...new Set(r.slice(s.de - 1, s.de - 1 + s.lung).map((x) => x.unde).filter(Boolean))]
  console.log(`   ${String(s.lung).padStart(3)} pagini de la ${s.de}  ${unde.slice(0, 4).join(' ')}`)
}
