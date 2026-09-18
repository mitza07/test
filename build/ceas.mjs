/* ===========================================================================
   BANDA CU ORA. Pentru capitolele in care nu anul e unitatea de masura.
   ---------------------------------------------------------------------------
   Banda cronologica obisnuita citeste anul si atat. La capitolul despre
   decembrie 1989, asta o face nefolositoare: cele saisprezece repere cad in
   doua pozitii, 1989 si 1990, adica exact ce nu trebuie aratat. Or, capitolul
   povesteste treisprezece zile, si toata miza lui e ca totul se rupe intr-o
   singura dimineata, intre 9:30 si 12:25.

   Aici axa e ziua, iar o zi anume se desface intr-o lupa cu ceasul. Pe scara
   asta se vede ce nicio fraza nu poate spune: represiunea tine cinci zile,
   prabusirea tine trei ore, iar haosul de dupa tine mai mult decat revolutia.

   Nicio data nu e inventata: se citesc reperele sectiunii asa cum sunt scrise,
   iar orele sunt cele patru pe care le tipareste capitolul.
   =========================================================================== */
import { tipografic } from './tipo.mjs'

const f = (n) => Math.round(n * 100) / 100
const esc = (s) => tipografic(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie',
  'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']
const SCURT = ['ian.', 'febr.', 'mart.', 'apr.', 'mai', 'iun.', 'iul.',
  'aug.', 'sept.', 'oct.', 'nov.', 'dec.']

/* Ziua, ca numar de zile de la 1 ianuarie 1989 — destul pentru un capitol de
   cateva luni, si fara Date(), ca sa iasa acelasi desen la fiecare tiparire. */
const ZILE_LUNA = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
function ziua(an, luna, zi) {
  let z = (an - 1989) * 365
  for (let i = 0; i < luna; i++) z += ZILE_LUNA[i]
  return z + (zi - 1)
}

/**
 * Citeste un reper de felul "22 decembrie 1989, orele 12", "18-19 decembrie
 * 1989", "martie 1989". Intoarce { de, la } in zile, si daca reperul da ziua
 * sau numai luna.
 */
export function citesteZiua(text) {
  const t = String(text || '').toLowerCase()
  const lu = LUNI.findIndex((l) => t.includes(l))
  if (lu < 0) return null
  const an = Number((t.match(/\b(19|20)\d\d\b/) || [])[0])
  if (!an) return null
  /* "18-19 decembrie" sau "23-27 decembrie": doua zile inaintea lunii */
  const interval = t.match(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})\s+[a-zăâîșț]+\s/)
  if (interval) {
    return { de: ziua(an, lu, +interval[1]), la: ziua(an, lu, +interval[2]) + 1, zi: true }
  }
  const una = t.match(/\b(\d{1,2})\s+[a-zăâîșț]+\s/)
  if (una) {
    const z = ziua(an, lu, +una[1])
    /* ora, cand reperul o da: "orele 12", "12:25" */
    const ora = t.match(/\bore?le?\s+(\d{1,2})(?:[:.](\d{2}))?/) || t.match(/\b(\d{1,2}):(\d{2})\b/)
    const h = ora ? (+ora[1] + (+(ora[2] || 0)) / 60) / 24 : 0
    return { de: z + h, la: z + h, zi: true, ora: Boolean(ora) }
  }
  /* numai luna: se ia luna intreaga */
  return { de: ziua(an, lu, 1), la: ziua(an, lu, ZILE_LUNA[lu]), zi: false }
}

/* Zilele scurse pana la intaiul lunii in care cade z — ca sa se poata scrie
   numai ziua, fara luna, la gradatiile din mijlocul axei. */
function cumLuna(z) {
  let r = z; while (r >= 365) r -= 365
  let lu = 0, trecut = 0
  while (r >= ZILE_LUNA[lu]) { r -= ZILE_LUNA[lu]; trecut += ZILE_LUNA[lu]; lu++ }
  return trecut
}

/* Eticheta unei zile: "15 dec.", iar in lupa "9:30". */
function etichetaZi(z) {
  let an = 1989, r = z
  while (r >= 365) { r -= 365; an++ }
  let lu = 0
  while (r >= ZILE_LUNA[lu]) { r -= ZILE_LUNA[lu]; lu++ }
  return `${Math.floor(r) + 1} ${SCURT[lu]}`
}

function etaje(pozitii, latimi, nrEtaje, prag) {
  const ocupat = Array.from({ length: nrEtaje }, () => -Infinity)
  return pozitii.map((x, i) => {
    const l = latimi[i]
    for (let e = 0; e < nrEtaje; e++) {
      if (x - l / 2 > ocupat[e] + prag) { ocupat[e] = x + l / 2; return e }
    }
    return -1
  })
}

/**
 * Banda cu ora.
 * @param {object} sectiune  capitolul, cu .cronologie
 * @param {object} o         { de, la } fereastra in zile — "15 decembrie 1989",
 *                           "31 decembrie 1989"; lupa: ziua care se desface;
 *                           prag: { text, cand, stanga, dreapta }; W latimea mm
 */
export function bandaZilelor(sectiune, o = {}) {
  const rep = (sectiune.cronologie || [])
    .map((r) => ({ ...r, d: citesteZiua(r.an) }))
    .filter((r) => r.d)
  if (rep.length < 3) return null

  const W = o.W || 117
  const X0 = 1, X1 = W - 1
  const D0 = citesteZiua(o.de).de, D1 = citesteZiua(o.la).la
  const X = (z) => X0 + ((z - D0) / (D1 - D0)) * (X1 - X0)

  const inauntru = rep.filter((r) => r.d.la >= D0 && r.d.de <= D1)
  const afara = rep.filter((r) => !(r.d.la >= D0 && r.d.de <= D1))

  /* --- etichetele de deasupra axei, pe etaje ------------------------------ */
  const xs = inauntru.map((r) => X((Math.max(r.d.de, D0) + Math.min(r.d.la, D1)) / 2))
  const txt = inauntru.map((r) => etichetaZi(r.d.de))
  const lat = txt.map((t) => t.length * 1.72)
  /* Eticheta de la capatul axei se trage in panza ca sa nu iasa din pagina —
     dar atunci ocupa alt loc decat cel socotit de la mijlocul semnului ei.
     Locul se corecteaza INAINTE de impartirea pe etaje, altfel doua etichete
     socotite libere ajung una peste alta. */
  const xsE = xs.map((x, i) => Math.min(Math.max(x, X0 + lat[i] / 2), X1 - lat[i] / 2))
  const et = etaje(xsE, lat, 3, 1.4)
  const etajeFolosite = Math.max(0, ...et) + 1

  const Y_CTX = 3.6
  const Y_AX = 11.2 + etajeFolosite * 3.3
  const ET = [Y_AX - 1.8, Y_AX - 5.1, Y_AX - 8.4]
  /* Lupa isi cere cate un etaj de eticheta pentru fiecare moment, deasupra
     axei ei orare, si doua randuri dedesubt: orele si cele doua totaluri de
     la prag. */
  const INALT_MOM = (o.momente || []).length * 3.1 + 1.5
  const Y_AX_LUPA = Y_AX + 8.5 + INALT_MOM
  const H = o.lupa ? Y_AX_LUPA + 10 : Y_AX + 7

  const s = []

  /* --- sus: unde cade fereastra in intreg capitolul ----------------------- */
  const toate = rep.map((r) => r.d)
  const C0 = Math.min(...toate.map((d) => d.de)), C1 = Math.max(...toate.map((d) => d.la))
  if (C1 > C0) {
    const XC = (z) => X0 + ((Math.max(C0, Math.min(C1, z)) - C0) / (C1 - C0)) * (X1 - X0)
    s.push(`<text class="cg-mic" x="${f(X0)}" y="2.6">${esc(etichetaZi(C0))}</text>`)
    s.push(`<text class="cg-mic" x="${f(X1)}" y="2.6" text-anchor="end">${esc(etichetaZi(C1))}</text>`)
    s.push(`<rect class="cg-ctx" x="${f(X0)}" y="${f(Y_CTX)}" width="${f(X1 - X0)}" height="2.5"/>`)
    const xa = XC(D0), xb = Math.max(XC(D1), XC(D0) + 0.7)
    s.push(`<rect class="cg-ctx-cap" x="${f(xa)}" y="${f(Y_CTX)}" width="${f(xb - xa)}" height="2.5"/>`)
    /* reperele ramase in afara ferestrei: un semn pe strip, ca sa se vada ca
       existǎ si ca banda nu le-a pierdut */
    for (const r of afara) {
      s.push(`<line class="cg-grad" x1="${f(XC(r.d.de))}" y1="${f(Y_CTX)}" x2="${f(XC(r.d.de))}" y2="${f(Y_CTX + 2.5)}"/>`)
    }
    s.push(`<path class="cg-lupa" d="M${f(xa)} ${f(Y_CTX + 2.5)} L${f(X0)} ${f(Y_CTX + 5.6)}"/>`)
    s.push(`<path class="cg-lupa" d="M${f(xb)} ${f(Y_CTX + 2.5)} L${f(X1)} ${f(Y_CTX + 5.6)}"/>`)
  }

  /* --- axa zilelor -------------------------------------------------------- */
  for (let z = Math.ceil(D0); z <= D1; z++) {
    const x = X(z)
    const mare = (z - Math.ceil(D0)) % 2 === 0
    s.push(`<line class="cg-grad" x1="${f(x)}" y1="${f(Y_AX)}" x2="${f(x)}" y2="${f(Y_AX + (mare ? 1.7 : 0.9))}"/>`)
    if (mare) {
      /* Luna se scrie numai la capete. "15 dec." tine doisprezece milimetri,
         iar doua gradatii sunt la treisprezece unele de altele: scrise toate
         cu luna, se ating. La mijloc ajunge ziua. */
      const capat = z < Math.ceil(D0) + 1 || z > D1 - 1
      const e = capat ? etichetaZi(z) : String(Math.floor(z - Math.floor(z / 365) * 365 - cumLuna(z)) + 1)
      const jum = e.length * 0.86
      const anc = x - jum < X0 ? 'start' : x + jum > X1 ? 'end' : 'middle'
      const ax = anc === 'start' ? X0 : anc === 'end' ? X1 : x
      s.push(`<text class="cg-an" x="${f(ax)}" y="${f(Y_AX + 4.6)}" text-anchor="${anc}">${esc(e)}</text>`)
    }
  }
  s.push(`<line class="cg-ax" x1="${f(X0)}" y1="${f(Y_AX)}" x2="${f(X1)}" y2="${f(Y_AX)}"/>`)

  inauntru.forEach((r, i) => {
    const xa = X(Math.max(r.d.de, D0)), xb = X(Math.min(r.d.la, D1))
    if (xb - xa > 0.6) s.push(`<rect class="cg-durata" x="${f(xa)}" y="${f(Y_AX - 1.05)}" width="${f(xb - xa)}" height="2.1"/>`)
    const x = (xa + xb) / 2
    s.push(`<circle class="cg-pct" cx="${f(x)}" cy="${f(Y_AX)}" r="0.85"/>`)
    if (et[i] >= 0) {
      s.push(`<line class="cg-trim" x1="${f(x)}" y1="${f(Y_AX - 1.3)}" x2="${f(xsE[i])}" y2="${f(ET[et[i]] + 0.6)}"/>`)
      s.push(`<text class="cg-data" x="${f(xsE[i])}" y="${f(ET[et[i]])}" text-anchor="middle">${esc(txt[i])}</text>`)
    }
  })

  /* --- lupa: o zi desfacuta pe ceas --------------------------------------- */
  if (o.lupa) {
    const zl = citesteZiua(o.lupa).de
    const h0 = o.lupaDeLa ?? 6, h1 = o.lupaPanaLa ?? 24
    const XH = (h) => X0 + ((h - h0) / (h1 - h0)) * (X1 - X0)
    const yA = Y_AX_LUPA                       /* axa orara */
    const xa = X(zl), xb = X(zl + 1)
    /* fereastra se deschide de la ziua ei de pe axa zilelor */
    s.push(`<path class="cg-lupa" d="M${f(xa)} ${f(Y_AX + 5.6)} L${f(X0)} ${f(yA - INALT_MOM - 2.4)}"/>`)
    s.push(`<path class="cg-lupa" d="M${f(xb)} ${f(Y_AX + 5.6)} L${f(X1)} ${f(yA - INALT_MOM - 2.4)}"/>`)
    s.push(`<line class="cg-ax" x1="${f(X0)}" y1="${f(yA)}" x2="${f(X1)}" y2="${f(yA)}"/>`)
    for (let h = Math.ceil(h0); h <= h1; h += 2) {
      const x = XH(h)
      s.push(`<line class="cg-grad" x1="${f(x)}" y1="${f(yA)}" x2="${f(x)}" y2="${f(yA + 1.6)}"/>`)
      const anc = h === Math.ceil(h0) ? 'start' : h >= h1 ? 'end' : 'middle'
      s.push(`<text class="cg-an" x="${f(x)}" y="${f(yA + 4.4)}" text-anchor="${anc}">${esc(String(h).padStart(2, '0'))}</text>`)
    }
    /* Cele patru momente cad in trei ore: 12:06 si 12:25 sunt la doi milimetri
       unul de altul, iar etichetele lor tin douazeci si cinci de milimetri. Nu
       incap alaturi, deci fiecare isi primeste etajul lui, deasupra axei, si
       coboara la semnul ei printr-o trimitere. Ultimul moment sta cel mai
       aproape de axa, ca trimiterile sa nu se incruciseze. */
    const momente = o.momente || []
    momente.forEach((m, i) => {
      const x = XH(m.h)
      const yy = yA - 4.2 - (momente.length - 1 - i) * 3.1
      s.push(`<circle class="cg-pct" cx="${f(x)}" cy="${f(yA)}" r="0.85"/>`)
      s.push(`<line class="cg-trim" x1="${f(x)}" y1="${f(yA - 1.2)}" x2="${f(x)}" y2="${f(yy + 0.7)}"/>`)
      const jum = m.et.length * 0.82
      const anc = x - jum < X0 ? 'start' : x + jum > X1 ? 'end' : 'middle'
      const ax = anc === 'start' ? X0 : anc === 'end' ? X1 : x
      s.push(`<text class="cg-data" x="${f(ax)}" y="${f(yy)}" text-anchor="${anc}">${esc(m.et)}</text>`)
    })
    /* Pragul: o singura linie verticala prin toata lupa, cu cate un total
       scris de-o parte si de alta, sub randul orelor, unde e loc. Totalurile
       se scriu, nu se deseneaza ca suprafete — repartitia pe zile a
       victimelor nu e cunoscuta, si o suprafata ar pretinde ca este. */
    if (o.prag) {
      const xp = XH(o.prag.h)
      /* Se opreste sub randul de etichete: o linie care taie prin cuvinte le
         face pe amandoua mai greu de citit. */
      s.push(`<line class="cg-prag" x1="${f(xp)}" y1="${f(yA - 2.6)}" x2="${f(xp)}" y2="${f(yA + 7.4)}"/>`)
      s.push(`<text class="cg-prag-et" x="${f(xp - 1.6)}" y="${f(yA + 8)}" text-anchor="end">${esc(o.prag.stanga)}</text>`)
      s.push(`<text class="cg-prag-et" x="${f(xp + 1.6)}" y="${f(yA + 8)}">${esc(o.prag.dreapta)}</text>`)
    }
  }

  return { vb: `0 0 ${W} ${f(H)}`, body: s.join(''), n: inauntru.length }
}
