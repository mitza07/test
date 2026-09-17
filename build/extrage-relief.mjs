/* ===========================================================================
   Scoate relieful din ETOPO1 si il scrie ca linii de nivel, vectorial.
   ---------------------------------------------------------------------------
   ETOPO1 e facut de NOAA, agentie a guvernului american: nu e supus dreptului
   de autor, deci poate intra intr-o carte care se vinde. Partea de uscat vine
   din SRTM30 si GLOBE, tot din domeniul public.

   Nu se pastreaza rasterul — o poza de teren tiparita la 600 de puncte pe tol
   dintr-o sursa de un minut de arc ar iesi patoasa, si ar strica si desenul de
   linie al celorlalte harti. Se scot in schimb curbele de nivel, ca poligoane
   inchise, si se picteaza intre ele: trepte hipsometrice ca in atlasele vechi,
   care se maresc oricat si se tiparesc la fel de curat in negru ca in culoare.
   =========================================================================== */
import { openSync, readSync, closeSync, writeFileSync, readFileSync } from 'fs'

const BIN = process.argv[2] || '/tmp/claude-0/-home-user-test/6e361e55-7b0b-5b16-a301-86894a5363c7/scratchpad/dem/etopo1_ice_g_i2.bin'
const IESIRE = new URL('./relief.js', import.meta.url).pathname

/* ETOPO1 "grid registered": valorile stau in noduri, nu in celule */
const NCOL = 21601, NROW = 10801, PAS = 1 / 60
const LON0 = -180, LAT0 = 90                     /* nodul [0,0], coltul de nord-vest */

/* fereastra volumului, cu o margine in plus: curbele se inchid pe marginea
   ferestrei, iar marginea trebuie sa cada in afara oricarei harti din carte */
const FER = { lon0: 16.5, lon1: 34.5, lat0: 39.5, lat1: 51.5 }

const col = (lon) => Math.round((lon - LON0) / PAS)
const rand = (lat) => Math.round((LAT0 - lat) / PAS)

const c0 = col(FER.lon0), c1 = col(FER.lon1)
const r0 = rand(FER.lat1), r1 = rand(FER.lat0)   /* r0 e nordul */
const W = c1 - c0 + 1, H = r1 - r0 + 1

/* --- citirea ferestrei ---------------------------------------------------- */
const fd = openSync(BIN, 'r')
const buf = Buffer.alloc(W * 2)
const z = new Float32Array(W * H)
for (let r = 0; r < H; r++) {
  const pozitie = ((r0 + r) * NCOL + c0) * 2
  readSync(fd, buf, 0, W * 2, pozitie)
  for (let c = 0; c < W; c++) z[r * W + c] = buf.readInt16LE(c * 2)
}
closeSync(fd)

/* --- netezire ------------------------------------------------------------
   Un minut de arc inseamna un punct la doi kilometri; la scara cartii, un
   milimetru tine treisprezece. Fara netezire curbele ar zimta din pixeli. */
function netezeste(a, w, h, raza) {
  const nucleu = []
  let suma = 0
  for (let i = -raza; i <= raza; i++) { const g = Math.exp(-(i * i) / (2 * (raza / 2) ** 2)); nucleu.push(g); suma += g }
  for (let i = 0; i < nucleu.length; i++) nucleu[i] /= suma
  const t = new Float32Array(a.length), o = new Float32Array(a.length)
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    let s = 0
    for (let k = -raza; k <= raza; k++) s += nucleu[k + raza] * a[r * w + Math.min(w - 1, Math.max(0, c + k))]
    t[r * w + c] = s
  }
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    let s = 0
    for (let k = -raza; k <= raza; k++) s += nucleu[k + raza] * t[Math.min(h - 1, Math.max(0, r + k)) * w + c]
    o[r * w + c] = s
  }
  return o
}

/* --- marching squares, cu inele inchise ----------------------------------
   Se parcurg celulele si se scot bucatile de curba, apoi se lipesc dupa capete
   pana se inchid. Marginea ferestrei se coboara sub cel mai jos prag, ca nicio
   curba sa nu ramana deschisa. */
function contur(a, w, h, prag, X, Y) {
  const v = (r, c) => a[r * w + c] - prag
  const seg = []
  const intre = (p, q, vp, vq) => {
    const t = vp / (vp - vq)
    return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]
  }
  for (let r = 0; r + 1 < h; r++) for (let c = 0; c + 1 < w; c++) {
    const v00 = v(r + 1, c), v10 = v(r + 1, c + 1), v11 = v(r, c + 1), v01 = v(r, c)
    /* colturile, in coordonate geografice: 00 stanga-jos, in sens trigonometric */
    const p00 = [X(c), Y(r + 1)], p10 = [X(c + 1), Y(r + 1)], p11 = [X(c + 1), Y(r)], p01 = [X(c), Y(r)]
    let cod = (v00 > 0 ? 1 : 0) | (v10 > 0 ? 2 : 0) | (v11 > 0 ? 4 : 0) | (v01 > 0 ? 8 : 0)
    if (cod === 0 || cod === 15) continue
    const jos = () => intre(p00, p10, v00, v10)
    const dreapta = () => intre(p10, p11, v10, v11)
    const sus = () => intre(p01, p11, v01, v11)
    const stanga = () => intre(p00, p01, v00, v01)
    /* fiecare bucata merge cu terenul inalt la stanga: inelele exterioare ies
       in sens trigonometric, golurile in sens invers, iar umplerea "nonzero"
       le deosebeste singura */
    const mediu = (v00 + v10 + v11 + v01) / 4
    switch (cod) {
      case 1: seg.push([stanga(), jos()]); break
      case 2: seg.push([jos(), dreapta()]); break
      case 3: seg.push([stanga(), dreapta()]); break
      case 4: seg.push([dreapta(), sus()]); break
      case 6: seg.push([jos(), sus()]); break
      case 7: seg.push([stanga(), sus()]); break
      case 8: seg.push([sus(), stanga()]); break
      case 9: seg.push([sus(), jos()]); break
      case 11: seg.push([sus(), dreapta()]); break
      case 12: seg.push([dreapta(), stanga()]); break
      case 13: seg.push([dreapta(), jos()]); break
      case 14: seg.push([jos(), stanga()]); break
      case 5: mediu > 0 ? (seg.push([stanga(), sus()]), seg.push([dreapta(), jos()]))
                        : (seg.push([stanga(), jos()]), seg.push([dreapta(), sus()])); break
      case 10: mediu > 0 ? (seg.push([sus(), dreapta()]), seg.push([jos(), stanga()]))
                         : (seg.push([sus(), stanga()]), seg.push([jos(), dreapta()])); break
    }
  }
  return lipesteInele(seg)
}

/* Lipeste bucatile de curba in inele, dupa capetele care se suprapun. */
function lipesteInele(seg) {
  const cheie = (p) => p[0].toFixed(6) + ' ' + p[1].toFixed(6)
  const dupaCap = new Map()
  for (const s of seg) {
    const k = cheie(s[0])
    if (!dupaCap.has(k)) dupaCap.set(k, [])
    dupaCap.get(k).push(s)
  }
  const inele = []
  const folosit = new Set()
  for (const s of seg) {
    if (folosit.has(s)) continue
    const inel = [s[0], s[1]]
    folosit.add(s)
    for (;;) {
      const urm = (dupaCap.get(cheie(inel[inel.length - 1])) || []).find((x) => !folosit.has(x))
      if (!urm) break
      folosit.add(urm)
      inel.push(urm[1])
      if (cheie(inel[inel.length - 1]) === cheie(inel[0])) break
    }
    if (inel.length > 3) inele.push(inel)
  }
  return inele
}

/* --- simplificare Douglas-Peucker ---------------------------------------- */
function dist2(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
  t = Math.max(0, Math.min(1, t))
  return (p[0] - (a[0] + t * dx)) ** 2 + (p[1] - (a[1] + t * dy)) ** 2
}
function simplifica(pct, tol) {
  if (pct.length < 4) return pct
  const t2 = tol * tol
  const pastrat = new Array(pct.length).fill(false)
  pastrat[0] = pastrat[pct.length - 1] = true
  const stiva = [[0, pct.length - 1]]
  while (stiva.length) {
    const [i, j] = stiva.pop()
    let max = 0, k = -1
    for (let m = i + 1; m < j; m++) { const d = dist2(pct[m], pct[i], pct[j]); if (d > max) { max = d; k = m } }
    if (max > t2 && k > 0) { pastrat[k] = true; stiva.push([i, k], [k, j]) }
  }
  return pct.filter((_, i) => pastrat[i])
}
const arie = (r) => {
  let a = 0
  for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1] }
  return a / 2
}
const rot = (p) => p.map(([x, y]) => [Number(x.toFixed(3)), Number(y.toFixed(3))])

/* --- treptele ------------------------------------------------------------
   Patru praguri: campia sub doua sute, dealurile pana la sase sute, muntele
   mijlociu pana la o mie doua sute, culmile deasupra. Sunt treptele cu care
   se citeste geografia Romaniei: arcul carpatic, podisul Transilvaniei inchis
   intre munti, campia dunareana, podisul Dobrogei. */
const TREPTE = [200, 600, 1200, 1800]
const TOL = { 200: 0.018, 600: 0.015, 1200: 0.012, 1800: 0.010 }
const MIN_ARIE = { 200: 0.02, 600: 0.012, 1200: 0.004, 1800: 0.001 }

const neted = netezeste(z, W, H, 3)
/* marginea ferestrei, coborata sub orice prag: curbele se inchid inauntru */
for (let r = 0; r < H; r++) { neted[r * W] = -9999; neted[r * W + W - 1] = -9999 }
for (let c = 0; c < W; c++) { neted[c] = -9999; neted[(H - 1) * W + c] = -9999 }

const X = (c) => FER.lon0 + c * PAS
const Y = (r) => FER.lat1 - r * PAS

const relief = {}
let total = 0
for (const t of TREPTE) {
  const inele = contur(neted, W, H, t, X, Y)
    .map((r) => simplifica(r, TOL[t]))
    .filter((r) => r.length > 3 && Math.abs(arie(r)) > MIN_ARIE[t])
    .map(rot)
  relief[t] = inele
  total += inele.reduce((a, b) => a + b.length, 0)
  console.log(`${String(t).padStart(5)} m · ${String(inele.length).padStart(4)} inele · ${inele.reduce((a, b) => a + b.length, 0)} puncte`)
}

const cod = `/* ===========================================================================
   RELIEFUL, din ETOPO1 (NOAA — lucrare a guvernului american, fara drept de
   autor; uscatul vine din SRTM30 si GLOBE, tot domeniu public).
   Generat de extrage-relief.mjs — nu se editeaza de mana.

   Fiecare treapta e o lista de inele inchise care marginesc terenul de peste
   pragul ei. Inelele exterioare merg in sens trigonometric, golurile invers,
   asa ca o singura cale SVG umpluta "nonzero" le deseneaza corect.
   =========================================================================== */

export const TREPTE = ${JSON.stringify(TREPTE)}

export const RELIEF = ${JSON.stringify(relief)}

export const SURSA = 'ETOPO1, NOAA, 1 minut de arc, domeniu public'
`
writeFileSync(IESIRE, cod)
console.log(`total ${total} puncte · relief.js ${(cod.length / 1024).toFixed(0)} KB`)
