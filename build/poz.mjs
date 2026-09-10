import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 1300, height: 900 } })
await p.goto('file:///home/user/test/build/previz.html')
await p.addStyleTag({content:'html{scroll-behavior:auto!important}'})
await p.waitForTimeout(2000)
const r = await p.evaluate(() => {
  const o = {}
  document.querySelectorAll('article.capitol figure svg[role=img]').forEach(s => {
    const art = s.closest('article').id
    const y = Math.round(s.getBoundingClientRect().top + scrollY)
    ;(o[art] = o[art] || []).push(y)
  })
  return { pozitii: o, inaltime: document.body.scrollHeight,
    orizontal: document.body.scrollWidth > window.innerWidth }
})
console.log(JSON.stringify(r))
await b.close()
