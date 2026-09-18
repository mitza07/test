/* ===========================================================================
   Asezarea blocurilor unui capitol.
   ---------------------------------------------------------------------------
   Pana acum fiecare randator isi impartea singur ilustratiile intre
   subcapitole, si toate patru faceau aceeasi socoteala:

       const intre = sec.length > 1 ? Math.floor(poze.length / sec.length) : 0

   Impartirea aceea are un defect care se vede numai la tiparire. Cand un
   capitol are mai putine poze decat subcapitole — si asa stau douazeci si
   patru din cele patruzeci — catul e zero, deci nu se intercaleaza nimic si
   tot teancul cade la coada capitolului. Iar cand catul nu e zero, restul
   impartirii cade tot acolo: la "regat", cu 26 de poze si 7 subcapitole, se
   asaza 18 si raman 8 gramada. Hartile, diagramele si tot aparatul — citatul,
   cifrele, banda vietilor, fisele, reperele, disputa — veneau oricum dupa
   toata proza. De aici sirurile de pagini numai cu text: 26 de pagini la rand
   in volumul intai, 21 in al doilea.

   Aici se face impartirea o singura data, pentru toate cele patru formate.
   Regula: ce e de privit se raspandeste printre subcapitole, ce e de
   consultat ramane la coada.
   =========================================================================== */

/* Imparte n lucruri in g goluri, cat mai egal, fara sa lase golurile din
   fata pline si pe cele din spate goale: lucrul j merge in golul
   floor(j*g/n). Pentru n=8, g=6 iese 0,0,1,2,3,3,4,5 — nu 1,1,1,1,1,1,2. */
import { tabeleleSectiunii } from './tabele-capitol.mjs'

export function imparte(lucruri, goluri) {
  const cos = Array.from({ length: Math.max(goluri, 0) }, () => [])
  if (!cos.length) return [lucruri.slice()]
  const n = lucruri.length
  lucruri.forEach((x, j) => cos[Math.min(goluri - 1, Math.floor((j * goluri) / n))].push(x))
  return cos
}

/**
 * Intoarce blocurile capitolului in ordinea in care se tiparesc.
 *
 * `r` da randatoarele formatului — fiecare intoarce un sir gata scris, sau
 * "" daca formatul acela nu stie sa deseneze blocul:
 *   proza(subcapitol, i), ilustratie(m), harta(cheie), diagrama(cheie),
 *   tabel(t), citat(c), cifre(c), vieti(c), figuri(c), cronologie(c),
 *   controversa(c)
 *
 * Ce se raspandeste printre subcapitole: hartile (ele arata locul despre care
 * vorbeste capitolul, deci intra devreme), banda vietilor, ilustratiile,
 * tabelele, cifrele, citatul si diagramele.
 *
 * Ce ramane la coada: fisele oamenilor, reperele si disputa istoriografica.
 * Sunt lucruri de consultat, nu de privit — un cititor le cauta dupa ce a
 * citit capitolul, si taiate in bucati n-ar mai putea fi cautate.
 */
export function aseaza(c, r) {
  const sec = c.sectiuni || []
  const bun = (x) => typeof x === 'string' && x.trim() !== ''

  /* fluxul care se raspandeste, in ordinea lui fireasca */
  const flux = []
  const pune = (x) => { if (bun(x)) flux.push(x) }
  for (const k of c.harti || []) pune(r.harta && r.harta(k))
  pune(r.vieti && r.vieti(c))
  for (const t of tabeleleSectiunii(c.id)) pune(r.tabel && r.tabel(t))
  const poze = (r.poze || []).map((m) => r.ilustratie(m)).filter(bun)
  /* Cifrele la o treime, citatul la doua treimi: doua respiratii in mijlocul
     prozei, nu doua blocuri lipite unul de altul. */
  const laTreime = Math.round(poze.length / 3)
  const laDouaTreimi = Math.round((2 * poze.length) / 3)
  poze.forEach((p, i) => {
    if (i === laTreime) pune(r.cifre && r.cifre(c))
    if (i === laDouaTreimi) pune(r.citat && r.citat(c))
    flux.push(p)
  })
  if (poze.length <= laTreime) pune(r.cifre && r.cifre(c))
  if (poze.length <= laDouaTreimi) pune(r.citat && r.citat(c))
  for (const k of c.diagrame || []) pune(r.diagrama && r.diagrama(k))

  /* Golurile sunt cele dintre subcapitole. Un capitol nu se deschide cu o
     figura — se deschide cu proza lui — deci nu exista gol inaintea primului
     subcapitol; ce nu incape in goluri se scurge dupa ultimul. */
  const goluri = Math.max(sec.length - 1, 0)
  const cos = imparte(flux, goluri)

  const out = []
  if (bun(r.rezumat && r.rezumat(c))) out.push(r.rezumat(c))
  if (!sec.length) out.push(...flux)
  sec.forEach((s, i) => {
    const t = r.proza(s, i)
    if (bun(t)) out.push(t)
    if (i < goluri) out.push(...cos[i])
  })
  if (goluri && cos.length > goluri) out.push(...cos.slice(goluri).flat())

  /* coada: de consultat, nu de privit */
  for (const k of ['figuri', 'cronologie', 'controversa']) {
    const x = r[k] && r[k](c)
    if (bun(x)) out.push(x)
  }
  return out
}
