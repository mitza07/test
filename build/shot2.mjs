import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
const [file, out, w, h, y, theme] = process.argv.slice(2)
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1,
  colorScheme: theme === 'dark' ? 'dark' : 'light' })
await p.goto('file://' + file)
await p.addStyleTag({content:'html{scroll-behavior:auto!important}'})
await p.waitForTimeout(1800)
if (+y) await p.evaluate((yy) => window.scrollTo({top: yy, behavior: 'instant'}), +y)
await p.waitForTimeout(900)
await p.screenshot({ path: out })
await b.close()
