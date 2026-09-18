/* ===========================================================================
   Ilustratiile pentru pagina publicata.
   ---------------------------------------------------------------------------
   Vizualizatorul de artefacte nu incarca imagini de pe alte domenii, deci
   ilustratiile trebuie sa intre in fisier, ca date incorporate — si acolo
   fiecare octet se umfla cu 37 la suta. Bugetul intregii pagini e de 16 MB.

   Latimea si calitatea erau scrise de mana: 520 px si q58 la inceput, apoi
   560 si q62, cand pareau sa incapa. Dar ele incapeau pentru cate ilustratii
   avea cartea atunci. La 371 de ilustratii, aceleasi cifre dau 18,2 MB numai
   pozele — peste buget, si nimeni n-ar fi aflat decat cand vizualizatorul ar
   fi refuzat pagina.

   Aici bugetul e constanta si masura e cea cautata: se incearca treptele de la
   cea mai buna in jos si se ia prima care incape cu adevarat, masurata pe
   fisierele scrise, nu socotita.
   =========================================================================== */
import { readFileSync, existsSync, mkdirSync, statSync, rmSync } from 'fs'
import sharp from 'sharp'

const RAD = new URL('./', import.meta.url).pathname
/* Bugetul se socoteste pe pagina intreaga, nu pe poze: asta se masoara la
   sfarsit, si asta refuza vizualizatorul. Masurat pe editia de fata, pagina
   iese cat octetii pozelor inmultiti cu 1,37 — umflarea base64 — plus 1,8 MB
   de text, CSS si SVG. Tinta e 15,4 MB, sub plafonul de 16 cu o margine care
   acopera cresterea textului. */
const PAGINA = Number(process.argv[2] || 15.4) * 1048576
const TEXT = 1.8 * 1048576
const UMFLARE = 1.37
const BUGET = PAGINA - TEXT
const TREPTE = [
  [640, 68], [600, 64], [560, 62], [520, 58], [500, 54], [460, 50], [420, 46],
]

const man = JSON.parse(readFileSync(RAD + 'ilustratii/manifest.json', 'utf8'))
const surse = man.map((m) => RAD + 'ilustratii/tipar/' + m.local.split('/').pop()).filter(existsSync)
mkdirSync(RAD + 'ilustratii/il', { recursive: true })

/* Se cantareste intai pe o proba, ca sa nu se scrie de sapte ori toate cele
   371. Proba e fiecare a saselea fisier, luate in ordine, deci acopera toate
   capitolele si toate felurile de imagine. */
const proba = surse.filter((_, i) => i % 6 === 0)
async function cantareste(lat, q, lista) {
  let s = 0
  for (const src of lista) {
    const b = await sharp(src).resize({ width: lat, height: lat * 2, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:2:0' }).toBuffer()
    s += b.length
  }
  return s
}

/* Proba nu e o masura, ci o ciuruire: greseste cu cateva procente, si de
   obicei in plus, fiindca fiecare al saselea fisier nu e o felie dreapta din
   teanc. Serveste numai ca sa sara peste treptele fara nicio sansa; alegerea
   se face pe scrierea adevarata a tuturor celor 371. */
const candidate = []
for (const [lat, q] of TREPTE) {
  const s = await cantareste(lat, q, proba)
  const estimat = (s / proba.length) * surse.length * UMFLARE
  console.log(`  ${lat} px / q${q}: probă ${(estimat / 1048576).toFixed(1)} MB`)
  if (estimat <= BUGET * 1.3) candidate.push([lat, q])
  if (estimat <= BUGET * 0.8) break        /* si mai jos ar fi risipa de calitate */
}
if (!candidate.length) candidate.push(TREPTE[TREPTE.length - 1])

async function scrie(lat, q) {
  rmSync(RAD + 'ilustratii/il', { recursive: true, force: true })
  mkdirSync(RAD + 'ilustratii/il', { recursive: true })
  let s = 0, k = 0
  for (const m of man) {
    const src = RAD + 'ilustratii/tipar/' + m.local.split('/').pop()
    if (!existsSync(src)) continue
    const dest = RAD + 'ilustratii/il/' + m.local.split('/').pop()
    await sharp(src).resize({ width: lat, height: lat * 2, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:2:0' }).toFile(dest)
    s += statSync(dest).size; k++
  }
  return { octeti: s, n: k }
}

let LAT, Q, dupa = 0, n = 0
for (const [lat, q] of candidate) {
  const r = await scrie(lat, q)
  const pag = (r.octeti * UMFLARE + TEXT) / 1048576
  console.log(`  ${lat} px / q${q}: scris, pagina ar ieși la ${pag.toFixed(1)} MB`)
  LAT = lat; Q = q; dupa = r.octeti; n = r.n
  if (r.octeti * UMFLARE <= BUGET) break
}

const incorporat = dupa * UMFLARE
console.log(`${n} imagini la ${LAT} px / q${Q}: ${(dupa / 1048576).toFixed(1)} MB` +
  ` → ${(incorporat / 1048576).toFixed(1)} MB ca date incorporate` +
  `; pagina ar ieși la ${((incorporat + TEXT) / 1048576).toFixed(1)} MB din ${(PAGINA / 1048576).toFixed(1)}`)
if (incorporat > BUGET) {
  console.warn(`ATENȚIE: nicio treaptă nu încape în buget; pagina va depăși ${(PAGINA / 1048576).toFixed(1)} MB.`)
  process.exit(1)
}
