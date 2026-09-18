/* Planse de control: se uita cu ochiul peste ce s-a descarcat, ca sa nu intre
   in carte o pagina de eroare, o miniatura gresita sau o imagine rasturnata. */
import { readFileSync, existsSync, statSync } from 'fs'
import sharp from 'sharp'
const RAD = new URL('./', import.meta.url).pathname
const man = JSON.parse(readFileSync(RAD + 'ilustratii/manifest.json', 'utf8'))
const ale = man.filter((m) => existsSync(RAD + m.local) && statSync(RAD + m.local).size > 40000)
const COL = 6, CEL = 260, ET = 34, PER = 42
for (let p = 0; p * PER < ale.length; p++) {
  const felie = ale.slice(p * PER, (p + 1) * PER)
  const straturi = []
  for (let i = 0; i < felie.length; i++) {
    const m = felie[i]
    const x = (i % COL) * CEL, y = Math.floor(i / COL) * (CEL + ET)
    try {
      const buf = await sharp(RAD + m.local).rotate()
        .resize({ width: CEL - 8, height: CEL - 8, fit: 'contain', background: '#fff' })
        .jpeg({ quality: 72 }).toBuffer()
      straturi.push({ input: buf, left: x + 4, top: y + 4 })
    } catch { continue }
    const t = (s, n) => String(s || '').replace(/[<>&]/g, '').slice(0, n)
    straturi.push({ input: Buffer.from(`<svg width="${CEL}" height="${ET}">
<rect width="${CEL}" height="${ET}" fill="#111"/>
<text x="4" y="14" font-family="monospace" font-size="13" fill="#ffd479">${m.n}</text>
<text x="30" y="14" font-family="monospace" font-size="10" fill="#fff">${t(m.cap, 16)}</text>
<text x="4" y="28" font-family="monospace" font-size="9" fill="#9cf">${t(m.fisier, 42)}</text></svg>`),
      left: x, top: y + CEL - 4 })
  }
  const dest = `${RAD}ilustratii/control-${p + 1}.jpg`
  await sharp({ create: { width: COL * CEL, height: Math.ceil(felie.length / COL) * (CEL + ET), channels: 3, background: '#fff' } })
    .composite(straturi).jpeg({ quality: 76 }).toFile(dest)
  console.log(`${dest.split('/').pop()}  ${felie.length}`)
}
console.log(`${ale.length}/${man.length} descărcate`)
