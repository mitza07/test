import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
const RAD = new URL('./', import.meta.url).pathname
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 1200, height: 1600 } })
await p.goto('file://' + RAD + '.lucru-2-alb-negru.html', { waitUntil: 'load', timeout: 180000 })
await p.addScriptTag({ path: RAD + 'node_modules/pagedjs/dist/paged.polyfill.js' })
await p.waitForFunction(() => {
  const n = document.querySelectorAll('.pagedjs_page').length
  window.__s = window.__n === n ? (window.__s || 0) + 1 : 0; window.__n = n
  return window.__s > 6
}, null, { timeout: 600000, polling: 700 })
console.log(JSON.stringify(await p.evaluate(() => {
  const out = {}
  for (const n of [12, 13, 60, 61]) {
    const pg = document.querySelector(`.pagedjs_page[data-page-number="${n}"]`)
    if (!pg) { out[n] = 'lipsă'; continue }
    const cls = [...pg.classList].filter(c => c.startsWith('pagedjs_')).join(' ')
    const box = (sel) => { const e = pg.querySelector(sel); if(!e) return 'fără'
      const st = getComputedStyle(e)
      return { html: e.innerHTML.slice(0,90), display: st.display, hasContent: e.classList.contains('hasContent') } }
    out[n] = { cls,
      topLeft: box('.pagedjs_margin-top-left'), topRight: box('.pagedjs_margin-top-right'),
      botRight: box('.pagedjs_margin-bottom-right') }
  }
  const pol = window.PagedPolyfill && window.PagedPolyfill.polisher
  out.moduleStrings = pol ? Object.keys(pol.modules || {}) : 'fără polisher'
  const st = [...document.querySelectorAll('style')].map(s=>s.textContent).join('')
  out.cssAreStringSet = st.includes('string-set')
  out.pagedjsStyle = [...document.querySelectorAll('style')].length
  out.exempluTop = (()=>{ const e=document.querySelector('.pagedjs_margin-top-right .pagedjs_margin-content'); return e? {html:e.innerHTML.slice(0,80), before: getComputedStyle(e,'::before').content} : 'fără .pagedjs_margin-content' })()
  return out
}), null, 1))
await b.close()
