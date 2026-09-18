/* ===========================================================================
   Citirea unui shapefile, fara biblioteci.
   ---------------------------------------------------------------------------
   Formatul e destul de simplu ca sa nu merite o dependinta: antet de o suta de
   octeti, apoi inregistrari. Pentru ce ne trebuie aici — linii si poligoane —
   fiecare inregistrare are numarul de parti si de puncte, indicii de inceput
   ai partilor, apoi perechile de coordonate, toate little-endian.

   Numele vin din .dbf, o baza dBASE III cu camp fix: antet cu descrierea
   coloanelor, apoi randuri de lungime constanta.
   =========================================================================== */
import { readFileSync } from 'fs'

const NUL = 0, PUNCT = 1, LINIE = 3, POLIGON = 5

/**
 * Citeste geometriile dintr-un .shp.
 * @returns {Array<{tip:number, parti:number[][][], cutie:number[]}>}
 *          fiecare "parte" e un sir de puncte [lon, lat]
 */
export function citesteShp(cale) {
  const b = readFileSync(cale)
  const out = []
  let p = 100                                  /* antetul are o suta de octeti */
  while (p + 8 <= b.length) {
    const lungime = b.readInt32BE(p + 4) * 2   /* in cuvinte de 16 biti */
    const c = p + 8
    const tip = b.readInt32LE(c)
    if (tip === NUL) { p = c + lungime; continue }
    if (tip === PUNCT) {
      out.push({ tip, parti: [[[b.readDoubleLE(c + 4), b.readDoubleLE(c + 12)]]], cutie: null })
      p = c + lungime; continue
    }
    if (tip !== LINIE && tip !== POLIGON) { p = c + lungime; continue }

    const cutie = [b.readDoubleLE(c + 4), b.readDoubleLE(c + 12),
      b.readDoubleLE(c + 20), b.readDoubleLE(c + 28)]
    const nrParti = b.readInt32LE(c + 36)
    const nrPuncte = b.readInt32LE(c + 40)
    const capete = []
    for (let i = 0; i < nrParti; i++) capete.push(b.readInt32LE(c + 44 + i * 4))
    const baza = c + 44 + nrParti * 4
    const parti = []
    for (let i = 0; i < nrParti; i++) {
      const de = capete[i], la = i + 1 < nrParti ? capete[i + 1] : nrPuncte
      const pct = []
      for (let j = de; j < la; j++) {
        pct.push([b.readDoubleLE(baza + j * 16), b.readDoubleLE(baza + j * 16 + 8)])
      }
      parti.push(pct)
    }
    out.push({ tip, parti, cutie })
    p = c + lungime
  }
  return out
}

/** Citeste tabelul .dbf care insoteste shapefile-ul. */
export function citesteDbf(cale) {
  const b = readFileSync(cale)
  const nrRanduri = b.readInt32LE(4)
  const antet = b.readInt16LE(8)
  const lungRand = b.readInt16LE(10)
  const campuri = []
  for (let p = 32; b[p] !== 0x0d && p < antet; p += 32) {
    campuri.push({
      nume: b.toString('latin1', p, p + 11).replace(/\0.*$/, '').trim(),
      lungime: b[p + 16],
    })
  }
  const out = []
  for (let r = 0; r < nrRanduri; r++) {
    let p = antet + r * lungRand + 1            /* primul octet e marcajul de stergere */
    const rand = {}
    for (const c of campuri) {
      rand[c.nume] = b.toString('utf8', p, p + c.lungime).replace(/\0/g, '').trim()
      p += c.lungime
    }
    out.push(rand)
  }
  return out
}

/** Geometrii si atribute, impreuna. */
export function citesteStrat(fara) {
  const geo = citesteShp(fara + '.shp')
  let atr = []
  try { atr = citesteDbf(fara + '.dbf') } catch { /* fara atribute */ }
  return geo.map((g, i) => ({ ...g, atr: atr[i] || {} }))
}
