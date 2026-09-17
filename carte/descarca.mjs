/* Descarca ilustratiile cu pauze si reincercari: upload.wikimedia.org
   limiteaza rata pe IP-ul partajat al proxy-ului, deci graba strica. */
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'fs'
import { execFileSync } from 'child_process'
const RAD = new URL('./', import.meta.url).pathname
const UA = 'IstoriaRomaniei-carte/1.0 (contact mitza0704@gmail.com) curl'
const asteapta = (ms) => new Promise(r => setTimeout(r, ms))

const cere = (url, dest) => {
  const cod = execFileSync('curl', ['-sSL','--max-time','180','-A',UA,
    '-w','%{http_code}','-o',dest,url], {stdio:['pipe','pipe','pipe']}).toString().trim()
  return cod
}
export async function ia(url, dest, nume) {
  const curat = url.split('?')[0]
  for (let i = 0; i < 6; i++) {
    const cod = cere(curat, dest)
    const dim = existsSync(dest) ? statSync(dest).size : 0
    if (cod === '200' && dim > 20000) return { ok: true, dim }
    const pauza = 8000 * Math.pow(1.8, i)
    console.log(`   ${nume}: ${cod}, ${(dim/1024).toFixed(0)} KB — reîncerc peste ${(pauza/1000).toFixed(0)}s`)
    await asteapta(pauza)
  }
  return { ok: false }
}

if (process.argv[1]?.endsWith('descarca.mjs')) {
  const man = JSON.parse(readFileSync(RAD + 'ilustratii/manifest.json', 'utf8'))
  mkdirSync(RAD + 'ilustratii/fisiere', { recursive: true })
  let bune = 0
  for (const m of man) {
    const dest = RAD + m.local
    if (existsSync(dest) && statSync(dest).size > 20000) { bune++; console.log('✓ ' + m.cap + ' (deja)'); continue }
    const r = await ia(m.url, dest, m.cap)
    if (r.ok) { bune++; console.log(`✓ ${m.cap.padEnd(14)} ${(r.dim/1024).toFixed(0).padStart(6)} KB`) }
    else console.log(`✗ ${m.cap} — renunț`)
    await asteapta(3000)
  }
  console.log(`\n${bune}/${man.length} descărcate`)
}
