/* ===========================================================================
   BANDA VIETILOR: cine traieste cand, in fiecare capitol.
   ---------------------------------------------------------------------------
   Volumul are doua sute de fise de oameni — cinci in fiecare capitol si in
   fiecare tema — tiparite pana acum ca text curgator: nume, ani, rol,
   descriere. Anii stau acolo scrisi, dar nimeni nu-i poate aseza in cap unul
   langa altul cat citeste.

   Banda ii aseaza. Se vede dintr-o privire cine pe cine a apucat, cine moare
   inainte sa inceapa ce povesteste capitolul si cine ii supravietuieste cu
   jumatate de secol. La capitolele scurte — Revolutia tine doua saptamani —
   se vede si altceva: cat de mica e epoca fata de viata oamenilor care o fac.

   Axa nu e a reperelor, ci a vietilor: la Revolutia din 1989, reperele tin doi
   ani si oamenii o suta zece. De aceea banda asta isi are axa ei, iar epoca
   proprie a capitolului se arata ca o fasie umbrita pe fundal.
   =========================================================================== */
import { citesteAni } from './data.mjs'
import { tipografic } from './tipo.mjs'

const f = (n) => Math.round(n * 100) / 100
const esc = (s) => tipografic(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/* Anul primeste sufixul erei ori de cate ori banda trece peste anul 1. */
const eticheta = (an, ambele) => {
  const n = Math.round(an)
  if (n < 0) return `${Math.abs(n)} î.Hr.`
  if (n === 0 || n === 1) return '1'
  return ambele ? `${n} d.Hr.` : String(n)
}

/* Treapta gradatiilor se alege dupa latimea etichetelor scrise, nu dupa
   numarul lor: "7000 î.Hr." tine de doua ori cat "1870". */
function pas(A0, A1, lat, etich) {
  const trepte = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000]
  for (const t of trepte) {
    const ani = []
    for (let a = Math.ceil(A0 / t) * t; a <= A1; a += t) ani.push(a)
    if (ani.length < 2) return t
    const latMax = Math.max(...ani.map((a) => etich(a).length)) * 1.7
    if (ani.length * (latMax + 4) <= lat) return t
  }
  return 20000
}

/* Numele intra deasupra barei si nu are voie sa iasa din panza. */
const scurt = (s, max = 42) => {
  const t = String(s).replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

/**
 * Banda vietilor unei sectiuni.
 * @param {object} sectiune  capitolul sau tema, cu .figuri
 * @param {object} optiuni   { de, la } epoca proprie a capitolului; W latimea in mm
 * @returns {{vb:string, body:string, n:number}|null}
 */
export function bandaVietilor(sectiune, optiuni = {}) {
  const vieti = (sectiune.figuri || [])
    .map((x) => ({ nume: x.nume, rol: x.rol, d: citesteAni(x.ani), brut: x.ani }))
    .filter((x) => x.d)
    .sort((a, b) => (a.d.de - b.d.de) || (a.d.la - b.d.la))
  if (vieti.length < 2) return null

  const W = optiuni.W || 117
  const X0 = 1, X1 = W - 1
  const H_RAND = 5.6                 /* un rand: numele deasupra, bara dedesubt */
  const Y0 = 5.4                     /* primul rand; deasupra lui sta eticheta epocii */

  /* Axa acopera toate vietile; epoca proprie a capitolului intra si ea, ca sa
     se vada unde cade — dar numai daca nu inghite scara (la teme, epoca tine
     doua mii de ani si ar strivi toate vietile intr-un punct). */
  let A0 = Math.min(...vieti.map((v) => v.d.de))
  let A1 = Math.max(...vieti.map((v) => v.d.la))
  const epoca = (optiuni.de != null && optiuni.la != null && optiuni.la > optiuni.de)
    ? { de: optiuni.de, la: optiuni.la } : null
  if (epoca && epoca.la - epoca.de <= (A1 - A0) * 1.6) {
    A0 = Math.min(A0, epoca.de); A1 = Math.max(A1, epoca.la)
  }
  if (A1 - A0 < 8) { A0 -= 4; A1 += 4 }
  const marja = (A1 - A0) * 0.04
  A0 -= marja; A1 += marja
  const X = (an) => X0 + ((Math.max(A0, Math.min(A1, an)) - A0) / (A1 - A0)) * (X1 - X0)
  const ambele = A0 < 0 && A1 > 0

  const Y_AX = Y0 + vieti.length * H_RAND + 0.6
  const H = Y_AX + 8.4

  const s = []

  /* --- fasia epocii, pe fundal ------------------------------------------- */
  if (epoca) {
    const xa = X(epoca.de), xb = Math.max(X(epoca.la), X(epoca.de) + 0.5)
    s.push(`<rect class="vt-epoca" x="${f(xa)}" y="${f(Y0 - 2.4)}" width="${f(xb - xa)}" height="${f(Y_AX - Y0 + 2.4)}"/>`)
    const xm = (xa + xb) / 2
    const anc = xm - 12 < X0 ? 'start' : xm + 12 > X1 ? 'end' : 'middle'
    const xt = anc === 'start' ? X0 : anc === 'end' ? X1 : xm
    s.push(`<text class="vt-epoca-et" x="${f(xt)}" y="${f(Y0 - 3.1)}" text-anchor="${anc}">epoca acestui capitol</text>`)
  }

  /* --- cate un rand de fiecare viata ------------------------------------- */
  vieti.forEach((v, i) => {
    const y = Y0 + i * H_RAND
    const yBara = y + 2.6
    const xa = X(v.d.de), xb = X(v.d.la)
    const lat = Math.max(xb - xa, 0.9)
    const clasa = v.d.sigur ? 'vt-bara' : 'vt-bara vt-aprox'
    s.push(`<rect class="${clasa}" x="${f(xa)}" y="${f(yBara)}" width="${f(lat)}" height="1.7" rx=".35"/>`)
    /* o datare de un singur an ramane un punct: i se pune un semn, ca sa nu
       para o bara scurta si sa se citeasca drept durata */
    if (v.d.la - v.d.de <= 1) {
      s.push(`<circle class="vt-pct" cx="${f(xa + lat / 2)}" cy="${f(yBara + 0.85)}" r=".85"/>`)
    }
    /* Capatul pe care textul nu-l spune — "din 1880", "n. 1961", "c. 1895–?" —
       nu se inchide: se pune o sageata, ca sa nu para ca stim cand s-a sfarsit. */
    if (v.d.deschis) {
      const xs = xa + lat, yc = yBara + 0.85
      s.push(`<path class="vt-sageata" d="M${f(xs + 0.4)} ${f(yc)}h2.2m-1 -1l1 1l-1 1"/>`)
    }
    const nume = scurt(v.nume)
    const latNume = nume.length * 1.48
    let x = xa, anc = 'start'
    if (x + latNume > X1) { x = X1; anc = 'end' }
    s.push(`<text class="vt-nume" x="${f(x)}" y="${f(y + 1.5)}" text-anchor="${anc}">${esc(nume)}</text>`)
  })

  /* --- axa si gradatiile ------------------------------------------------- */
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
  s.push(`<line class="cg-ax" x1="${f(X0)}" y1="${f(Y_AX)}" x2="${f(X1)}" y2="${f(Y_AX)}"/>`)

  const aprox = vieti.filter((v) => !v.d.sigur).length
  const deschise = vieti.filter((v) => v.d.deschis).length
  const nota = [
    `${vieti.length} din cei ${(sectiune.figuri || []).length} oameni ai capitolului, pe anii lor`,
    aprox ? `${aprox} cu datare aproximativă (bară goală)` : '',
    deschise ? `săgeata = text fără an de sfârșit` : '',
  ].filter(Boolean).join(' · ')
  s.push(`<text class="cg-mic" x="${f(X0)}" y="${f(H - 0.6)}">${esc(nota)}</text>`)

  return { vb: `0 0 ${W} ${f(H)}`, body: s.join(''), n: vieti.length }
}
