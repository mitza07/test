/* ===========================================================================
   PROGRAMUL ICONOGRAFIC UNIFICAT.
   Reuneste cele cincizeci si trei de pozitii din primul val cu selectia mare
   facuta pe plansele de contact si scoate un singur manifest, numerotat.
   Toate pozitiile au trecut verificarea de licenta: domeniu public sau CC BY.
   =========================================================================== */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { execFileSync } from 'child_process'
import { adresaFisier } from './cauta.mjs'
import { manifest as manifestVechi } from './program.mjs'
import { SELECTIE } from './selectie.mjs'

const RAD = new URL('./', import.meta.url).pathname
const UA = 'IstoriaRomaniei-carte/1.0 (contact: mitza0704@gmail.com)'
const LAT = 2400

const liste = {}
const lista = (g) => (liste[g] ||= JSON.parse(readFileSync(`${RAD}ilustratii/lista-${g}.json`, 'utf8')))

const curata = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s*\(\s*talk\s*\)/gi, '')
  .replace(/\s*date QS.*/i, '').replace(/\s+/g, ' ').trim()

export function manifestMare() {
  const out = [], vazut = new Set()
  const adauga = (o) => {
    if (vazut.has(o.fisier)) return false
    vazut.add(o.fisier); out.push(o); return true
  }
  /* primul val; plansa cartografica poarta un singur nume */
  for (const m of manifestVechi()) adauga({ ...m, cap: m.cap === 'harti' ? 'atlas' : m.cap, val: 1 })
  /* selectia mare */
  let lipsa = 0
  for (const [id, cap, legenda] of SELECTIE) {
    const [g, i] = id.split(':')
    const c = lista(g)?.[Number(i)]
    if (!c) { console.error(`lipsă: ${id}`); lipsa++; continue }
    adauga({ cap, legenda, fisier: c.fisier, pagina: c.pagina, autor: curata(c.autor),
      data: curata(c.data), licenta: c.licenta, tipLicenta: c.tipLicenta,
      latime: c.latime, inaltime: c.inaltime, sursa: 'Wikimedia Commons', val: 2, grup: g })
  }
  if (lipsa) console.error(`${lipsa} poziții nerezolvate`)
  return out.map((m, i) => ({ ...m, n: i + 1,
    local: `ilustratii/mari/${String(i + 1).padStart(3, '0')}-${m.cap}.jpg` }))
}

if (process.argv[1]?.endsWith('program2.mjs')) {
  const man = manifestMare()
  mkdirSync(RAD + 'ilustratii/mari', { recursive: true })
  writeFileSync(RAD + 'ilustratii/manifest.json', JSON.stringify(man, null, 1))
  const dupa = {}
  for (const m of man) dupa[m.cap] = (dupa[m.cap] || 0) + 1
  console.log(`${man.length} poziții în ${Object.keys(dupa).length} capitole`)
  console.log(Object.entries(dupa).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '))

  const de_la = Number(process.argv[2] || 1), pana = Number(process.argv[3] || man.length)
  /* serverul da 429 cand cererile vin prea des: se asteapta si se reia */
  const asteapta = (ms) => execFileSync('sleep', [String(ms / 1000)])
  let ok = 0, rau = []
  for (const m of man) {
    if (m.n < de_la || m.n > pana) continue
    const dest = RAD + m.local
    if (existsSync(dest) && statSync(dest).size > 60000) { ok++; continue }
    let izbandit = false
    for (let incercare = 0; incercare < 5 && !izbandit; incercare++) {
      if (incercare) asteapta(3000 * 2 ** (incercare - 1))
      try {
        const cod = execFileSync('curl', ['-sSL', '--max-time', '180', '-A', UA, '-w', '%{http_code}',
          '-o', dest, adresaFisier(m.fisier, LAT)], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
        const dim = existsSync(dest) ? statSync(dest).size : 0
        if (cod === '200' && dim > 60000) {
          izbandit = true; ok++
          console.log(`✓ ${String(m.n).padStart(3)} ${m.cap.padEnd(13)} ${(dim / 1024).toFixed(0).padStart(5)} KB${incercare ? ' (reluat)' : ''}`)
        } else if (cod !== '429') { console.log(`✗ ${String(m.n).padStart(3)} ${m.cap.padEnd(13)} cod ${cod}`); break }
      } catch (e) { console.log(`✗ ${m.n} ${m.cap} — ${String(e).slice(0, 50)}`); break }
    }
    if (!izbandit) rau.push(m.n)
  }
  console.log(`\n${ok} descărcate${rau.length ? ', rămase: ' + rau.join(',') : ''}`)
}
