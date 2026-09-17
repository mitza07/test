/* ===========================================================================
   PROGRAMUL ICONOGRAFIC UNIFICAT.
   Reuneste cele cincizeci si trei de pozitii din primul val cu selectia mare
   facuta pe plansele de contact si scoate un singur manifest, numerotat.
   Toate pozitiile au trecut verificarea de licenta: domeniu public sau CC BY.
   =========================================================================== */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import { adresaFisier } from './cauta.mjs'
import { manifest as manifestVechi } from './program.mjs'
import { PLAN, PLAN_TEME } from '../build/build.mjs'
import { SELECTIE } from './selectie.mjs'
import { SELECTIE2 } from './selectie2.mjs'

const RAD = new URL('./', import.meta.url).pathname
const UA = 'IstoriaRomaniei-carte/1.0 (contact: mitza0704@gmail.com)'
/* Commons pre-genereaza miniaturi doar la latimi standard — 250, 330, 500,
   960, 1280, 1920, 3840 — si respinge cu 429 atat cererile de original cat si
   latimile din afara listei. 1920 e prima treapta peste cei 1700 px de care
   are nevoie tiparul la 6x9 inch. */
const LAT = 1920

const liste = {}
const lista = (g) => (liste[g] ||= JSON.parse(readFileSync(`${RAD}ilustratii/lista-${g}.json`, 'utf8')))

const curata = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s*\(\s*talk\s*\)/gi, '')
  .replace(/\s*date QS.*/i, '').replace(/\s+/g, ' ').trim()


/* ---------------------------------------------------------------------------
   Respinse la controlul vizual. Verificarea de licenta si scorul de relevanta
   nu vad ce vede ochiul: o plansa lunga de douazeci de mii de pixeli nu incape
   intr-o pagina de 6x9, iar o scanare de bibliotec cu rigla de culoare alaturi
   nu e o ilustratie, ci un document de laborator.
   --------------------------------------------------------------------------- */
const RESPINSE = new Map([
  ['Ulpia Traiana Sarmizegetusa Amphitheatre Panorama.jpg', 'panoramă de 22.501 px: în pagină ar fi o dungă'],
  ['TabulaPeutingeriana.jpg', 'sulul întreg, 26.381 px; în planșă intră cele două segmente decupate'],
  ['Principatus Moldaviae nova & accurata descriptio - Delineante Principe Demetrio Cantemirio - btv1b52511045w (2 of 2).jpg', 'scanarea e versoul alb al foii, nu harta'],
  ['Interior rear view angle of the Status Quo Ante synagogue Târgu Mureș, Romania.jpg', 'decupaj îngust, ilizibil la dimensiunea paginii'],
  ['Retezat National Park at Bucura Lake - panoramio.jpg', 'panoramă, raport de laturi inutilizabil'],
  ['A reverie of Prince Demetrius Cantemir, Ospidar of Moldavia (BM 1868,0808.5718 1).jpg', 'scanare cu riglă de culoare; avem două portrete Cantemir mai bune'],
  ['Palaces in Bucharest are elaborate. This is the old home of the beloved Carmen Sylva or first Queen of Roumania LCCN2011660177.jpg', 'pagină de carte fotografiată, cu riglă de culoare'],
  ['Peasant boys in white pants, embroidered short skirt, bright red and yellow girdle, and ornamental vests swing through the streets of Bucharest vending fruits of delicious taste LCCN2011660149.jpg', 'pagină de carte fotografiată, cu riglă de culoare'],
  ['A driver of the old school. He hopes to die before the inartistic automobile supplants his elegant victoria with prancing teams of greys, on the boulevards of Buckharest (i.e. Bucharest) LCCN2011660147.jpg', 'pagină de carte fotografiată, cu riglă de culoare'],
])

/* capitolele si temele care exista cu adevarat in carte; o legenda asezata
   intr-un capitol inexistent n-ar aparea nicaieri si nu s-ar observa */
const CAPITOLE = new Set([...PLAN.map((x) => x.id), ...PLAN_TEME.map((x) => x.id), 'atlas'])

export function manifestMare() {
  const out = [], vazut = new Set()
  const adauga = (o) => {
    if (vazut.has(o.fisier) || RESPINSE.has(o.fisier)) return false
    vazut.add(o.fisier); out.push(o); return true
  }
  /* primul val; plansa cartografica poarta un singur nume */
  for (const m of manifestVechi()) adauga({ ...m, cap: m.cap === 'harti' ? 'atlas' : m.cap, val: 1 })
  /* selectia mare */
  let lipsa = 0
  for (const [id, cap, legenda] of [...SELECTIE, ...SELECTIE2]) {
    const [g, i] = id.split(':')
    const c = lista(g)?.[Number(i)]
    if (!c) { console.error(`lipsă: ${id}`); lipsa++; continue }
    if (!CAPITOLE.has(cap)) { console.error(`capitol inexistent: ${cap} (${id})`); lipsa++; continue }
    adauga({ cap, legenda, fisier: c.fisier, pagina: c.pagina, autor: curata(c.autor),
      data: curata(c.data), licenta: c.licenta, tipLicenta: c.tipLicenta,
      latime: c.latime, inaltime: c.inaltime, octeti: c.octeti,
      sursa: 'Wikimedia Commons', val: 2, grup: g })
  }
  if (lipsa) console.error(`${lipsa} poziții nerezolvate`)
  /* Numele fisierului local se calculeaza din numele sursei, nu din pozitia in
     lista: asa, cand scoatem sau adaugam o ilustratie, restul descarcarilor
     raman valabile. */
  return out.map((m, i) => ({ ...m, n: i + 1,
    local: `ilustratii/mari/${m.cap}-${createHash('sha1').update(m.fisier).digest('hex').slice(0, 10)}.jpg` }))
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
  /* Commons raspunde 429 cand cererile vin prea des de pe acelasi IP.
     Ritmul se regleaza singur: creste pauza la refuz, o scade la reusita. */
  const dormi = (s) => execFileSync('sleep', [String(s.toFixed(2))])
  let pauza = 1.5, ok = 0, rau = []
  for (const m of man) {
    if (m.n < de_la || m.n > pana) continue
    const dest = RAD + m.local
    if (existsSync(dest) && statSync(dest).size > 40000) { ok++; continue }
    let izbandit = false
    for (let i = 0; i < 4 && !izbandit; i++) {
      dormi(pauza)
      let cod = '000', dim = 0
      try {
        /* se cere cea mai mare treapta standard care nu depaseste originalul;
           sub 1.280 px se cere 960, fiindca MediaWiki nu mareste, ci serveste
           originalul asa cum e */
        const w = m.latime || 0
        const lat = (!w || w >= LAT) ? LAT : w >= 1280 ? 1280 : 960
        cod = execFileSync('curl', ['-sSL', '--max-time', '180', '-A', UA, '-w', '%{http_code}',
          '-o', dest, adresaFisier(m.fisier, lat)], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
        dim = existsSync(dest) ? statSync(dest).size : 0
      } catch (e) { cod = 'err' }
      if (cod === '200' && dim > 40000) {
        izbandit = true; ok++; pauza = Math.max(1.5, pauza * 0.8)
        console.log(`\u2713 ${String(m.n).padStart(3)} ${m.cap.padEnd(13)} ${(dim / 1024).toFixed(0).padStart(5)} KB` +
          `${i ? ' (' + (i + 1) + ' incercari)' : ''}  ritm ${pauza.toFixed(1)}s`)
      } else if (cod === '429') { pauza = Math.min(18, pauza * 1.6 + 1) }
      else { console.log(`\u2717 ${String(m.n).padStart(3)} ${m.cap.padEnd(13)} cod ${cod}, ${(dim / 1024).toFixed(0)} KB`); break }
    }
    if (!izbandit) rau.push(m.n)
  }
  console.log(`\n${ok} descărcate${rau.length ? ', rămase: ' + rau.join(',') : ''}`)
}
