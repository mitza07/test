/* ===========================================================================
   BANDA CRONOLOGICA a unui capitol.
   ---------------------------------------------------------------------------
   Lista de repere spune ce s-a intamplat. Banda spune cand, la scara — si mai
   ales cum sunt distribuite: patru secole fara nimic intre doua semne se vad
   dintr-o privire, la fel si zece evenimente ingramadite intr-un deceniu.

   Nu repeta textul reperelor: acela e dedesubt, in lista. Aici conteaza numai
   pozitia in timp, asa ca banda ramane mica si nu depaseste niciodata pagina.

   Doua etaje: sus, unde cade capitolul in intregul volum; jos, axa proprie a
   capitolului, desfasurata pe toata latimea oglinzii.
   =========================================================================== */
import { citesteData, mijloc, etichetaAn } from './data.mjs'

const f = (n) => Math.round(n * 100) / 100
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/* Anul primeste sufixul erei ori de cate ori banda trece peste anul 1: fara
   el, "100" de sub "100 î.Hr." ar fi citit tot ca inainte de Hristos. */
const eticheta = (an, ambele) => {
  const n = Math.round(an)
  if (n < 0) return `${Math.abs(n)} î.Hr.`
  if (n === 0 || n === 1) return '1'
  return ambele ? `${n} d.Hr.` : String(n)
}

/* Treapta gradatiilor nu se alege dupa numarul lor, ci dupa latimea pe care o
   ocupa scrise: "7000 î.Hr." tine de doua ori cat "1870", asa ca acolo incap
   mai putine. Se ia prima treapta la care etichetele nu se ating. */
function pas(A0, A1, latDisponibila, etich) {
  const trepte = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000]
  for (const t of trepte) {
    const ani = []
    for (let a = Math.ceil(A0 / t) * t; a <= A1; a += t) ani.push(a)
    if (ani.length < 2) return t
    const latMax = Math.max(...ani.map((a) => etich(a).length)) * 1.7
    if (ani.length * (latMax + 4) <= latDisponibila) return t
  }
  return 20000
}

/* Asaza etichetele de-a lungul axei pe cateva etaje, ca sa nu se suprapuna:
   fiecare eticheta coboara pe primul etaj liber la abscisa ei. */
function etaje(pozitii, latimi, nrEtaje, prag) {
  const ocupat = Array.from({ length: nrEtaje }, () => -Infinity)
  return pozitii.map((x, i) => {
    const l = latimi[i]
    for (let e = 0; e < nrEtaje; e++) {
      if (x - l / 2 > ocupat[e] + prag) { ocupat[e] = x + l / 2; return e }
    }
    return -1        /* nu incape nicaieri: semnul ramane, eticheta cade */
  })
}

/**
 * Banda cronologica a unei sectiuni.
 * @param {object} sectiune  capitolul sau tema, cu .cronologie
 * @param {object} optiuni   { de, la } intervalul intregului volum, pentru
 *                           strip-ul de context; W latimea in milimetri
 * @returns {{vb:string, body:string, n:number}|null}
 */
const LUNI_SCURT = { ianuarie: 'ian.', februarie: 'febr.', martie: 'mart.', aprilie: 'apr.',
  mai: 'mai', iunie: 'iun.', iulie: 'iul.', august: 'aug.', septembrie: 'sept.',
  octombrie: 'oct.', noiembrie: 'nov.', decembrie: 'dec.' }

/* Eticheta de pe banda e scurta: aproximarea o spune cercul gol, iar era o
   spune axa, deci nu se mai repeta in dreptul fiecarui semn. */
function scurt(an) {
  return String(an)
    .replace(/\s*(î|d)\.\s?Hr\.?/gi, '')
    .replace(/\b(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\b/gi,
      (m) => LUNI_SCURT[m.toLowerCase()] || m)
    .replace(/\b(cca|circa|c)\.?\s+/gi, '')
    .replace(/\bînceputul\s+sec\.?/gi, 'înc. s.')
    .replace(/\bmijlocul\s+sec\.?/gi, 'mij. s.')
    .replace(/\bsfârșitul\s+sec\.?/gi, 'sf. s.')
    .replace(/\bsecolele?\b|\bsec\./gi, 's.')
    .replace(/\s*\bsau\b\s*/gi, '/')
    .replace(/\s+/g, ' ')
    .trim()
}

export function bandaCronologica(sectiune, optiuni = {}) {
  const rep = (sectiune.cronologie || [])
    .map((r) => ({ ...r, d: citesteData(r.an) }))
    .filter((r) => r.d)
    .sort((a, b) => mijloc(a.d) - mijloc(b.d))
  if (rep.length < 3) return null

  const W = optiuni.W || 117
  const X0 = 1, X1 = W - 1
  const Y_ERA = 2.6            /* randul cu capetele volumului */
  const Y_CTX = 3.6            /* strip-ul de context, 2,5 inalt */

  let a0 = Math.min(...rep.map((r) => r.d.de))
  let a1 = Math.max(...rep.map((r) => r.d.la))
  if (a1 - a0 < 6) { a0 -= 3; a1 += 3 }
  const marja = (a1 - a0) * 0.05
  const A0 = a0 - marja, A1 = a1 + marja
  const X = (an) => X0 + ((an - A0) / (A1 - A0)) * (X1 - X0)
  const ambele = A0 < 0 && A1 > 0

  /* Etichetele se socotesc inaintea geometriei pe verticala: cand nu incape
     niciuna, banda se strange, ca sa nu ramana o dunga de alb intre context
     si axa. */
  const xs = rep.map((r) => X(mijloc(r.d)))
  const txt = rep.map((r) => scurt(r.an))
  const lat = txt.map((t) => t.length * 1.72)
  let et = etaje(xs, lat, 3, 1.4)
  const prea = et.filter((e) => e < 0).length
  const toateCad = prea > rep.length / 4
  if (toateCad) et = et.map(() => -1)
  const etajeFolosite = toateCad ? 0 : Math.max(0, ...et) + 1

  const Y_AX = 11.2 + etajeFolosite * 3.3
  const H = Y_AX + 8
  const ET = [Y_AX - 1.8, Y_AX - 5.1, Y_AX - 8.4]

  const s = []

  /* --- etajul de sus: unde cade capitolul in intregul volum --------------- */
  const V0 = optiuni.de ?? -1000, V1 = optiuni.la ?? 2026
  if (V1 > V0) {
    const XV = (an) => X0 + ((Math.max(V0, Math.min(V1, an)) - V0) / (V1 - V0)) * (X1 - X0)
    s.push(`<text class="cg-mic" x="${f(X0)}" y="${f(Y_ERA)}">${esc(eticheta(V0, true))}</text>`)
    s.push(`<text class="cg-mic" x="${f(X1)}" y="${f(Y_ERA)}" text-anchor="end">${esc(eticheta(V1, true))}</text>`)
    s.push(`<rect class="cg-ctx" x="${f(X0)}" y="${f(Y_CTX)}" width="${f(X1 - X0)}" height="2.5"/>`)
    const xa = XV(a0), xb = Math.max(XV(a1), XV(a0) + 0.7)
    s.push(`<rect class="cg-ctx-cap" x="${f(xa)}" y="${f(Y_CTX)}" width="${f(xb - xa)}" height="2.5"/>`)
    /* fereastra se deschide spre axa desfasurata de dedesubt */
    s.push(`<path class="cg-lupa" d="M${f(xa)} ${f(Y_CTX + 2.5)} L${f(X0)} ${f(Y_CTX + 5.6)}"/>`)
    s.push(`<path class="cg-lupa" d="M${f(xb)} ${f(Y_CTX + 2.5)} L${f(X1)} ${f(Y_CTX + 5.6)}"/>`)
  }

  /* --- gradatiile axei proprii, cu capetele trase in pagina --------------- */
  const p = pas(A0, A1, X1 - X0, (a) => eticheta(a, ambele))
  const grad = []
  for (let an = Math.ceil(A0 / p) * p; an <= A1; an += p) grad.push(an)
  grad.forEach((an, i) => {
    const x = X(an)
    const capat = i === 0 ? 'start' : i === grad.length - 1 ? 'end' : 'middle'
    const dx = capat === 'start' ? 0.4 : capat === 'end' ? -0.4 : 0
    s.push(`<line class="cg-grad" x1="${f(x)}" y1="${f(Y_AX)}" x2="${f(x)}" y2="${f(Y_AX + 1.7)}"/>`)
    s.push(`<text class="cg-an" x="${f(x + dx)}" y="${f(Y_AX + 4.6)}" text-anchor="${capat}">${esc(eticheta(an, ambele))}</text>`)
  })

  /* --- axa, duratele si reperele ------------------------------------------ */
  s.push(`<line class="cg-ax" x1="${f(X0)}" y1="${f(Y_AX)}" x2="${f(X1)}" y2="${f(Y_AX)}"/>`)
  for (const r of rep) {
    const l = X(r.d.la) - X(r.d.de)
    if (l > 0.8) s.push(`<rect class="cg-durata" x="${f(X(r.d.de))}" y="${f(Y_AX - 1.5)}" width="${f(l)}" height="3"/>`)
  }

  rep.forEach((r, i) => {
    const x = xs[i], e = et[i]
    if (e >= 0) {
      const y = ET[e]
      s.push(`<line class="cg-trim" x1="${f(x)}" y1="${f(Y_AX - 1.8)}" x2="${f(x)}" y2="${f(y + 0.7)}"/>`)
      /* eticheta de la capete nu are voie sa iasa din panza */
      const jum = lat[i] / 2
      const ancora = x - jum < X0 ? 'start' : x + jum > X1 ? 'end' : 'middle'
      const ax = ancora === 'start' ? X0 : ancora === 'end' ? X1 : x
      s.push(`<text class="cg-data" x="${f(ax)}" y="${f(y)}" text-anchor="${ancora}">${esc(txt[i])}</text>`)
    }
    s.push(r.d.sigur
      ? `<circle class="cg-pct" cx="${f(x)}" cy="${f(Y_AX)}" r=".95"/>`
      : `<circle class="cg-pct-gol" cx="${f(x)}" cy="${f(Y_AX)}" r=".95"/>`)
  })

  const aprox = rep.filter((r) => !r.d.sigur).length
  const nota = [
    `${rep.length} repere, la scară`,
    toateCad ? 'anii, în lista de mai jos' : prea ? `${prea} fără an, prea apropiate` : '',
    aprox ? 'cerc gol = datare aproximativă' : '',
  ].filter(Boolean).join(' · ')
  s.push(`<text class="cg-mic" x="${f(X0)}" y="${f(H - 0.6)}">${esc(nota)}</text>`)

  return { vb: `0 0 ${W} ${H}`, body: s.join(''), n: rep.length }
}
