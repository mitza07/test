import { readFileSync, existsSync, statSync } from 'fs'
import { execFileSync } from 'child_process'
import { adresaFisier } from './cauta.mjs'
const RAD = new URL('./', import.meta.url).pathname
const UA = 'IstoriaRomaniei-carte/1.0 (contact: mitza0704@gmail.com)'
const pauza = (ms) => new Promise(r => setTimeout(r, ms))
const man = JSON.parse(readFileSync(RAD + 'ilustratii/manifest.json', 'utf8'))
const lipsa = man.filter(m => !existsSync(RAD + m.local) || statSync(RAD + m.local).size < 60000)
console.log(lipsa.length + ' de reluat')
let ok = 0
for (const m of lipsa) {
  for (let i = 0; i < 5; i++) {
    await pauza(i === 0 ? 4000 : 9000 * i)
    let cod = '0'
    try {
      cod = execFileSync('curl', ['-sSL','--max-time','240','-A',UA,'-w','%{http_code}','-o',RAD+m.local,
        adresaFisier(m.fisier, i < 2 ? 2400 : 1800)], {stdio:['pipe','pipe','pipe']}).toString().trim()
    } catch {}
    const dim = existsSync(RAD + m.local) ? statSync(RAD + m.local).size : 0
    if (cod === '200' && dim > 60000) { ok++; console.log(`✓ ${String(m.n).padStart(2)} ${m.cap.padEnd(14)} ${(dim/1024).toFixed(0).padStart(5)} KB`); break }
    if (i === 4) console.log(`✗ ${m.n} ${m.cap} — renunț (${cod})`)
  }
}
console.log(`\nrecuperate ${ok}/${lipsa.length}`)
