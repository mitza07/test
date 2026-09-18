import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
const [file, out, w, h] = process.argv.slice(2)
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: +(w||1400), height: +(h||900) }, deviceScaleFactor: 1 })
await p.goto('file://' + file)
await p.waitForTimeout(1200)
await p.screenshot({ path: out, fullPage: true })
await b.close()
