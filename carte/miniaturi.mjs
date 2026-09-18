/* ===========================================================================
   Descarca miniaturi pentru toti candidatii si le aseaza in planse de contact,
   ca sa poata fi alese cu ochiul, nu dupa numele fisierului.
   Descarcarea trece prin commons.wikimedia.org/Special:Redirect/file, singura
   cale care nu e limitata de pe IP-uri partajate.
   =========================================================================== */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'fs'
import { execFileSync } from 'child_process'
import { adresaFisier } from './cauta.mjs'

const RAD = new URL('./', import.meta.url).pathname
const MINI = RAD + 'ilustratii/miniaturi'
const UA = 'IstoriaRomaniei-carte/1.0 (contact: mitza0704@gmail.com)'
const PE_CAPITOL = Number(process.env.PE_CAPITOL || 12)

export function ia(nume, dest, latime) {
  if (existsSync(dest) && statSync(dest).size > 12000) return true
  try {
    const cod = execFileSync('curl', ['-sSL', '--max-time', '120', '-A', UA, '-w', '%{http_code}',
      '-o', dest, adresaFisier(nume, latime)], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
    return cod === '200' && existsSync(dest) && statSync(dest).size > 12000
  } catch { return false }
}

/* --- plansa de contact ----------------------------------------------------- */
async function plansa(cheie, elemente) {
  const sharp = (await import('sharp')).default
  const COL = 4, CEL = 340, ET = 46
  const rand = Math.ceil(elemente.length / COL)
  const W = COL * CEL, H = rand * (CEL + ET)
  const straturi = []
  for (let i = 0; i < elemente.length; i++) {
    const e = elemente[i]
    const x = (i % COL) * CEL, y = Math.floor(i / COL) * (CEL + ET)
    try {
      const buf = await sharp(e.cale).rotate()
        .resize({ width: CEL - 12, height: CEL - 12, fit: 'contain', background: '#ffffff' })
        .jpeg({ quality: 78 }).toBuffer()
      straturi.push({ input: buf, left: x + 6, top: y + 6 })
    } catch { continue }
    const et = `<svg width="${CEL}" height="${ET}"><rect width="${CEL}" height="${ET}" fill="#111"/>
<text x="6" y="17" font-family="monospace" font-size="15" fill="#ffd479">[${e.nr}]</text>
<text x="46" y="17" font-family="monospace" font-size="12" fill="#fff">${
      String(e.fisier).replace(/[<>&]/g, '').slice(0, 38)}</text>
<text x="6" y="34" font-family="monospace" font-size="11" fill="#9cf">${e.dim} · ${String(e.data||'').replace(/[<>&]/g,'').slice(0,26)}</text></svg>`
    straturi.push({ input: Buffer.from(et), left: x, top: y + CEL - 6 })
  }
  const dest = `${RAD}ilustratii/plansa-${cheie}.jpg`
  await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
    .composite(straturi).jpeg({ quality: 76 }).toFile(dest)
  return dest
}

/* ========================================================================== */
if (process.argv[1]?.endsWith('miniaturi.mjs')) {
  mkdirSync(MINI, { recursive: true })
  const date = JSON.parse(readFileSync(RAD + 'ilustratii/pentru-alegere.json', 'utf8'))
  const doarAceste = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const chei = (doarAceste.length ? doarAceste : Object.keys(date)).filter((k) => date[k]?.candidati?.length)

  for (const k of chei) {
    const lista = date[k].candidati.slice(0, PE_CAPITOL)
    const bune = []
    for (const c of lista) {
      const dest = `${MINI}/${k}-${c.nr}.jpg`
      if (ia(c.fisier, dest, 600)) bune.push({ ...c, cale: dest })
    }
    if (!bune.length) { console.log(`${k.padEnd(14)} — nimic descărcat`); continue }
    const p = await plansa(k, bune)
    console.log(`${k.padEnd(14)} ${String(bune.length).padStart(2)}/${lista.length} → ${p.split('/').pop()}`)
  }
}
