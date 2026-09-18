/* ===========================================================================
   Bare comparative: cifre de acelasi fel, pe o singura scara.
   ---------------------------------------------------------------------------
   Cartea are o suta saizeci de cifre si le da cinstit, fiecare la locul ei, cu
   nota de unde vine. Dar o cifra scrisa intr-un paragraf nu se poate cantari
   fata de alta scrisa in alt paragraf, si cu atat mai putin fata de una din
   alt capitol. Asediul Odesei — "un obiectiv de importanta strategica
   discutabila", spune chiar cartea — a costat mai mult decat toata campania de
   recuperare a Basarabiei, dar cele doua cifre sunt la patru paragrafe una de
   alta si comparatia nu se face niciodata.

   Ce se deseneaza aici e strict ce e scris: bara e valoarea, mustata de la
   capat e intervalul cand cartea da un interval, iar bara goala din spate e
   totalul din care s-a pierdut, cand cartea il da. Ce nu e scris nu se
   deseneaza — un rand fara interval n-are mustata, si atat.
   =========================================================================== */
import { tipografic } from './tipo.mjs'

const f = (n) => Math.round(n * 100) / 100
const esc = (s) => tipografic(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const mii = (n) => n.toLocaleString('ro-RO')

/**
 * @param {object} d
 *   titlu     — nu se deseneaza aici, il pune randatorul in legenda
 *   unitate   — ce se numara, scris o data pe axa
 *   randuri   — [{ et, sub, v, de, la, din, dinEt, rupt, nota }]
 *                 et    numele randului
 *                 sub   perioada sau lamurirea, pe randul mic
 *                 v     valoarea barei
 *                 de,la intervalul, cand cartea da unul
 *                 vEt   ce se scrie in dreptul barei, cand cifra desenata nu e
 *                       una pe care cartea o tipareste: bara recoltei legale
 *                       sta la mijlocul intervalului 18-20, dar scrie "18–20",
 *                       fiindca "19" nu e scris nicaieri in carte
 *                 deschis  bara goala pe dinauntru: un rest, nu o marime de
 *                       acelasi fel cu celelalte
 *                 din   totalul din care s-a pierdut, ca bara goala in spate
 *                 dinEt ce se scrie in dreapta despre raportul cu "din"
 *                 rupt  randul se desparte printr-un filet: nu e de acelasi fel
 *   W         — latimea in milimetri
 */
export function bareComparative(d) {
  const W = d.W || 117
  const randuri = d.randuri || []
  if (!randuri.length) return null

  const ET = 46                  /* coloana etichetelor, la stanga */
  const X0 = ET, X1 = W - 1
  const H_BARA = 4.2, PAS = 10.4, AER_RUPT = 3.4
  const SUS = 5
  /* un rand despartit prin filet isi ia aer deasupra, altfel filetul ar trece
     prin randul mic al randului de dinainte */
  const yRand = []
  let yy = SUS
  for (const r of randuri) { if (r.rupt) yy += AER_RUPT; yRand.push(yy); yy += PAS }
  /* randul axei sta sub ultima bara si sub randul ei mic, nu peste ele */
  const Y_JOS = yy - PAS + 11
  const H = Y_JOS + 9

  const vmax = Math.max(...randuri.map((r) => Math.max(r.v || 0, r.la || 0, r.din || 0)))
  const ordin = Math.pow(10, Math.floor(Math.log10(vmax)))
  const VMAX = Math.ceil(vmax / (ordin / 2)) * (ordin / 2)
  const X = (v) => X0 + (v / VMAX) * (X1 - X0)
  /* Treapta gradatiilor nu se alege dupa numarul lor, ci dupa latimea pe care o
     ocupa scrise: "200.000" tine doisprezece milimetri, iar sase gradatii pe
     saptezeci de milimetri cad la unsprezece una de alta. Se ia prima treapta
     la care etichetele nu se ating. */
  const pasAxei = (() => {
    for (const t of [1, 2, 2.5, 5, 10, 20, 25, 50].map((k) => k * (ordin / 10))) {
      const n = Math.floor(VMAX / t) + 1
      const lat = mii(Math.round(VMAX)).length * 1.62
      if (n * (lat + 3) <= X1 - X0) return t
    }
    return VMAX
  })()

  const s = []

  /* gradatiile, in spatele barelor */
  for (let v = 0; v <= VMAX + 1e-9; v += pasAxei) {
    const x = X(v)
    s.push(`<line class="b-grid" x1="${f(x)}" y1="${f(SUS - 1.5)}" x2="${f(x)}" y2="${f(Y_JOS - 2)}"/>`)
    const anc = v === 0 ? 'start' : v >= VMAX - 1e-9 ? 'end' : 'middle'
    s.push(`<text class="b-ax" x="${f(x)}" y="${f(Y_JOS + 1.6)}" text-anchor="${anc}">${esc(mii(Math.round(v)))}</text>`)
  }
  s.push(`<text class="b-ax" x="${f(X1)}" y="${f(Y_JOS + 6.2)}" text-anchor="end">${esc(d.unitate || '')}</text>`)

  randuri.forEach((r, i) => {
    const y = yRand[i]
    if (r.rupt) s.push(`<line class="b-filet" x1="1" y1="${f(y - 4.2)}" x2="${f(X1)}" y2="${f(y - 4.2)}"/>`)
    /* bara goala din spate: din cati oameni s-a pierdut atat */
    /* Intregul, cu partea inauntru: bara goala e putin mai inalta decat cea
       plina, ca sa se citeasca drept cadru, nu drept a doua bara. */
    if (r.din) s.push(`<rect class="b-gol" x="${f(X0)}" y="${f(y - 0.8)}" width="${f(X(r.din) - X0)}" height="${f(H_BARA + 1.6)}"/>`)
    s.push(`<rect class="${r.deschis ? 'b-rest' : 'b-bara'}" x="${f(X0)}" y="${f(y)}" width="${f(Math.max(X(r.v) - X0, 0.3))}" height="${H_BARA}"/>`)
    /* mustata intervalului, cand cartea da unul */
    if (r.de && r.la) {
      const yc = y + H_BARA / 2
      s.push(`<line class="b-must" x1="${f(X(r.de))}" y1="${f(yc)}" x2="${f(X(r.la))}" y2="${f(yc)}"/>`)
      for (const v of [r.de, r.la])
        s.push(`<line class="b-must" x1="${f(X(v))}" y1="${f(yc - 1.5)}" x2="${f(X(v))}" y2="${f(yc + 1.5)}"/>`)
    }
    s.push(`<text class="b-nume" x="0" y="${f(y + 3.2)}">${esc(r.et)}</text>`)
    if (r.sub) s.push(`<text class="b-sub" x="0" y="${f(y + 6.8)}">${esc(r.sub)}</text>`)
    /* Cifra sta langa capatul barei — sau in bara, cand afara n-ar mai
       incapea. Lamurirea de langa ea ("din circa 228.000 angajați") e prea
       lunga ca sa stea pe acelasi rand: se muta dedesubt, in corp mic, lipita
       de capatul barei si trasa in panza daca ar iesi. */
    const xc = Math.max(X(r.v), X(r.la || 0))
    const et = r.vEt || mii(r.v)
    const latVal = et.length * 1.62
    const inauntru = xc + latVal + 2 > X1
    s.push(`<text class="${inauntru ? 'b-val b-val-in' : 'b-val'}" x="${f(inauntru ? xc - 1.4 : xc + 1.4)}" y="${f(y + 3.3)}" text-anchor="${inauntru ? 'end' : 'start'}">${esc(et)}</text>`)
    if (r.dinEt) {
      const latDin = r.dinEt.length * 1.38
      const xd = Math.min(X0 + 1, X1 - latDin)
      s.push(`<text class="b-sub" x="${f(Math.max(xd, X0 + 1))}" y="${f(y + 8.3)}">${esc(r.dinEt)}</text>`)
    }
  })

  return { vb: `0 0 ${W} ${f(H)}`, body: s.join('') }
}
