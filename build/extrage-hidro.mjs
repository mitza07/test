/* ===========================================================================
   Scoate hidrografia reala din Natural Earth si o scrie ca modul.
   ---------------------------------------------------------------------------
   Natural Earth e in domeniul public — "no rights reserved" — deci poate intra
   intr-o carte care se vinde, spre deosebire de tile-urile oricarui serviciu
   comercial de harti.

   Cursurile vin cu mult mai multe puncte decat are nevoie o pagina de 117 mm:
   Dunarea are noua sute. Se taie fereastra care ne intereseaza, apoi se
   simplifica Douglas-Peucker pana la o toleranta care, la scara cartii, sta
   sub o zecime de milimetru.
   =========================================================================== */
import { writeFileSync } from 'fs'
import { citesteStrat } from './shp.mjs'

const NE = process.argv[2] || '/tmp/claude-0/-home-user-test/6e361e55-7b0b-5b16-a301-86894a5363c7/scratchpad/ne/'
const IESIRE = new URL('./hidro.js', import.meta.url).pathname

/* fereastra volumului: de la Tisa la Nistru, de la Balcani la Galitia */
const FER = { lon0: 17.5, lon1: 33.5, lat0: 40.5, lat1: 50.5 }
const inFer = ([x, y]) => x >= FER.lon0 && x <= FER.lon1 && y >= FER.lat0 && y <= FER.lat1

/* --- Douglas-Peucker ------------------------------------------------------ */
function dist2(p, a, b) {
  const [px, py] = p, [ax, ay] = a, [bx, by] = b
  const dx = bx - ax, dy = by - ay
  if (dx === 0 && dy === 0) return (px - ax) ** 2 + (py - ay) ** 2
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
  t = Math.max(0, Math.min(1, t))
  return (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2
}
function simplifica(pct, tol) {
  if (pct.length < 3) return pct
  const t2 = tol * tol
  const pastrat = new Array(pct.length).fill(false)
  pastrat[0] = pastrat[pct.length - 1] = true
  const stiva = [[0, pct.length - 1]]
  while (stiva.length) {
    const [i, j] = stiva.pop()
    let max = 0, k = -1
    for (let m = i + 1; m < j; m++) {
      const d = dist2(pct[m], pct[i], pct[j])
      if (d > max) { max = d; k = m }
    }
    if (max > t2 && k > 0) { pastrat[k] = true; stiva.push([i, k], [k, j]) }
  }
  return pct.filter((_, i) => pastrat[i])
}

/* Natural Earth taie un rau in zeci de bucati, la fiecare confluenta. Pentru
   noi Dunarea e un singur fir, asa ca bucatile se lipesc inapoi dupa capete:
   coada uneia cade exact peste capul alteia. */
function lipeste(buc, eps = 0.03) {
  const parti = buc.map((b) => b.slice())
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
  const out = []
  while (parti.length) {
    let cur = parti.shift()
    for (let mers = true; mers;) {
      mers = false
      for (let i = 0; i < parti.length; i++) {
        const p = parti[i], cap = cur[0], coada = cur[cur.length - 1]
        let nou = null
        if (d(coada, p[0]) < eps) nou = cur.concat(p.slice(1))
        else if (d(coada, p[p.length - 1]) < eps) nou = cur.concat(p.slice(0, -1).reverse())
        else if (d(cap, p[p.length - 1]) < eps) nou = p.concat(cur.slice(1))
        else if (d(cap, p[0]) < eps) nou = p.slice().reverse().concat(cur.slice(1))
        if (nou) { cur = nou; parti.splice(i, 1); mers = true; break }
      }
    }
    out.push(cur)
  }
  return out.sort((a, b) => b.length - a.length)
}

/* Tarmul din Natural Earth ocoleste pe uscat fiecare liman si fiecare lagune:
   intra prin gura ingusta a Razimului, da roata pe malul dinspre camp si iese
   inapoi pe unde a intrat. La scara paginii ocolul asta e o zbarcitura sub o
   zecime de milimetru, dar face conturul sa se taie singur, iar o regiune al
   carei hotar se taie singur se umple gresit.

   Se scurteaza deci ocolurile care se intorc la cativa kilometri de unde au
   plecat — dar numai cele care bat spre uscat. Firul tarmului merge cu apa in
   dreapta: ocolul care se umfla la stanga e o lagune si se taie, cel care se
   umfla la dreapta e un grind sau un brat de Delta si ramane. Semnul ariei
   inchise de ocol si de coarda lui spune care e care. */
function faraLagune(pct, razaKm, priveste = 80) {
  const KMLAT = 111.2, KMLON = 78.1
  const km = (a, b) => Math.hypot((b[0] - a[0]) * KMLON, (b[1] - a[1]) * KMLAT)
  const arie = (buc) => {
    let a = 0
    for (let k = 0; k < buc.length; k++) {
      const u = buc[k], v = buc[(k + 1) % buc.length]
      a += u[0] * v[1] - v[0] * u[1]
    }
    return a / 2
  }
  const out = []
  for (let i = 0; i < pct.length;) {
    out.push(pct[i])
    let sari = i
    for (let j = Math.min(pct.length - 1, i + priveste); j > i + 1; j--) {
      if (km(pct[i], pct[j]) >= razaKm) continue
      if (arie(pct.slice(i, j + 1)) < 0) sari = j    /* umflat spre uscat */
      break
    }
    i = sari > i ? sari + 1 : i + 1
  }
  return out
}

/* Taie un traseu la fereastra, rupandu-l acolo unde iese si reintra. */
function taie(pct) {
  const buc = []
  let cur = []
  for (const p of pct) {
    if (inFer(p)) cur.push(p)
    else { if (cur.length > 1) buc.push(cur); cur = [] }
  }
  if (cur.length > 1) buc.push(cur)
  return buc
}

const rot = (p, z = 3) => p.map(([x, y]) => [Number(x.toFixed(z)), Number(y.toFixed(z))])

/* --- ce ne trebuie, si cat de fin ---------------------------------------- */
/* Raurile care poarta hotare istorice merita mai multa finete decat cele care
   sunt numai peisaj: Prutul si Nistrul au fost granite de stat. */
const RAURI = [
  { cheie: 'dunare',  nume: ['Danube'],                 tol: 0.012 },
  { cheie: 'chilia',  nume: ['Bratul Chillia'],         tol: 0.008 },
  { cheie: 'sulina',  nume: ['Bratul Sulina'],          tol: 0.008 },
  { cheie: 'sfgheorghe', nume: ['Bratul Sfântu Gheorghe'], tol: 0.008 },
  { cheie: 'prut',    nume: ['Prut'],                   tol: 0.010 },
  { cheie: 'nistru',  nume: ['Dniester'],               tol: 0.010 },
  { cheie: 'siret',   nume: ['Siret'],                  tol: 0.015 },
  { cheie: 'mures',   nume: ['Mureș', 'Mures'],         tol: 0.015 },
  { cheie: 'olt',     nume: ['Olt'],                    tol: 0.015 },
  { cheie: 'tisa',    nume: ['Tisa', 'Tisza'],          tol: 0.015 },
  { cheie: 'somes',   nume: ['Someşul Cald', 'Someș', 'Somes'], tol: 0.02 },
  { cheie: 'jiu',     nume: ['Jiu'],                    tol: 0.02 },
  { cheie: 'arges',   nume: ['Argeș', 'Arges'],         tol: 0.02 },
  { cheie: 'ialomita', nume: ['Ialomița', 'Ialomita'],  tol: 0.02 },
  { cheie: 'timis',   nume: ['Timiş', 'Timiș'],         tol: 0.02 },
  { cheie: 'buzau',   nume: ['Buzău', 'Buzau'],         tol: 0.02 },
  { cheie: 'bistrita', nume: ['Bistrița', 'Bistrita'],  tol: 0.02 },
  { cheie: 'nipru',   nume: ['Dnipro'],                 tol: 0.03 },
  { cheie: 'bugsud',  nume: ['Southern Bug', 'Bug'],    tol: 0.03 },
  { cheie: 'sava',    nume: ['Sava'],                   tol: 0.03 },
]

const straturi = [
  citesteStrat(NE + 'ne_10m_rivers_lake_centerlines'),
  citesteStrat(NE + 'ne_10m_rivers_europe'),
]

const rauri = {}
let totalIn = 0, totalOut = 0
for (const r of RAURI) {
  /* intai se stranger toate bucatile cu numele cerut, din ambele straturi */
  const brute = []
  for (const strat of straturi) {
    for (const g of strat) {
      const n = g.atr.name || g.atr.name_en || ''
      if (!r.nume.includes(n)) continue
      for (const parte of g.parti) { brute.push(parte); totalIn += parte.length }
    }
  }
  /* se lipesc inainte de taiere, ca firul sa fie continuu si sensul stabil */
  const buc = []
  for (const fir of lipeste(brute)) {
    for (const b of taie(fir)) {
      const s = simplifica(b, r.tol)
      if (s.length > 1) { buc.push(rot(s)); totalOut += s.length }
    }
  }
  if (buc.length) rauri[r.cheie] = buc.sort((a, b) => b.length - a.length)
}

/* --- coasta: numai tarmul Marii Negre din fereastra ---------------------- */
const coasta = []
{
  const brute = []
  for (const g of citesteStrat(NE + 'ne_10m_coastline')) for (const parte of g.parti) brute.push(parte)
  for (const fir of lipeste(brute)) {
    for (const b of taie(fir)) {
      totalIn += b.length
      const s = simplifica(faraLagune(b, 8), 0.012)
      if (s.length > 4) { coasta.push(rot(s)); totalOut += s.length }
    }
  }
  coasta.sort((a, b) => b.length - a.length)
}

/* --- lacuri: numai cele care se vad la scara cartii ---------------------- */
const lacuri = []
for (const g of citesteStrat(NE + 'ne_10m_lakes')) {
  if (!g.cutie) continue
  const [x0, y0, x1, y1] = g.cutie
  if (x1 < FER.lon0 || x0 > FER.lon1 || y1 < FER.lat0 || y0 > FER.lat1) continue
  const arie = (x1 - x0) * (y1 - y0)
  if (arie < 0.012) continue                   /* sub un petic de cativa km */
  for (const parte of g.parti) {
    const s = simplifica(parte, 0.012)
    if (s.length > 3) lacuri.push({ nume: g.atr.name || g.atr.name_en || '', pct: rot(s) })
  }
}

/* --- conturul marii, ca suprafata de umplut ------------------------------
   Se ia bucata lunga de tarm a Marii Negre si se inchide pe marginile de est
   si de sud ale ferestrei. Marginile cad oricum in afara oricarei harti din
   volum, care nu trec de 31,4 grade est, deci inchiderea nu se vede. */
const principala = coasta.reduce((a, b) => (b.length > a.length ? b : a), [])
const cap = principala[0], coada = principala[principala.length - 1]
const MARE = [...principala, [FER.lon1, coada[1]], [FER.lon1, FER.lat0], [FER.lon1, cap[1]]]

/* verificare: un punct din larg trebuie sa cada inauntru, unul de pe uscat afara */
function inauntru([x, y], pol) {
  let c = false
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
const probe = [[[30, 44], true, 'larg, la est de Constanța'], [[26, 44.5], false, 'Bărăgan'],
  [[28.8, 44.2], true, 'larg, sud de Constanța'], [[24, 46], false, 'Transilvania']]
for (const [p, asteptat, unde] of probe) {
  if (inauntru(p, MARE) !== asteptat) {
    console.error(`conturul mării e greșit: ${unde} iese pe dos`)
    process.exit(1)
  }
}

const cod = `/* ===========================================================================
   HIDROGRAFIA REALA, din Natural Earth (domeniu public, "no rights reserved").
   Generat de extrage-hidro.mjs — nu se editeaza de mana.
   Cursurile sunt taiate la fereastra volumului si simplificate Douglas-Peucker
   pana sub o zecime de milimetru la scara paginii.
   =========================================================================== */

/* fiecare rau e o lista de bucati, fiecare bucata un sir de [lon, lat] */
export const RAURI = ${JSON.stringify(rauri)}

export const COASTA = ${JSON.stringify(coasta)}\n\n/* suprafata marii, inchisa pe marginea de est a ferestrei */\nexport const MARE = ${JSON.stringify(rot(MARE))}

export const LACURI = ${JSON.stringify(lacuri)}

export const SURSA = 'Natural Earth, 1:10 m, domeniu public'
`
writeFileSync(IESIRE, cod)
const kb = (cod.length / 1024).toFixed(0)
console.log(`${Object.keys(rauri).length} râuri · ${coasta.length} bucăți de coastă · ${lacuri.length} lacuri · marea din ${MARE.length} puncte`)
console.log(`${totalIn} puncte citite → ${totalOut} păstrate · hidro.js ${kb} KB`)
