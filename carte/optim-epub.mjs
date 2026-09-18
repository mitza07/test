/* ===========================================================================
   Ilustratiile pentru editia compacta de EPUB.
   ---------------------------------------------------------------------------
   Pana acum editia compacta refolosea ilustratii/il/, adica varianta facuta
   pentru pagina web — 520 px, calitate 58 — unde fiecare octet se umfla cu
   37 la suta ca data-URI si tot trebuie sa incapa in 16 MB. Un EPUB n-are
   niciuna dintre constrangeri: tine fisierele binar, in zip.

   Iar reducerea era oarba la ce e in poza. La 520 px, un portret in ulei tine
   bine, dar o harta veche isi pierde toponimia si un document isi pierde
   scrisul — adica tocmai ce sunt ele. Volumul are saptezeci si una de harti
   vechi in plansa cartografica si zeci de documente cu text scris in rest.

   Aici se taie dupa continut: ce se citeste ramane mare, ce se priveste scade.
   =========================================================================== */
import { readFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { createRequire } from 'module'

const sharp = createRequire(import.meta.url)('sharp')
const RAD = new URL('./', import.meta.url).pathname
const DIR = RAD + 'ilustratii/epub-mic/'

/* Ce are text de citit in el: harti vechi, planuri, documente, tiparituri. */
const DE_CITIT = /hart[ăai]|map|tabula|charta|plan(ul|şa|șa)?\b|manuscris|document|hrisov|diplom|inscrip|alfabet|tipăritur|gazet|ziar|afiș|afis|proclamaț|proclamat|recensăm|recensam|statistic|tabel|schiț|schit|gravur[ăa] cu text|act\b|lege\b|catagrafi/i

const MARE = 900, MIC = 520
const Q_MARE = 74, Q_MIC = 62

const man = JSON.parse(readFileSync(RAD + 'ilustratii/manifest.json', 'utf8'))
mkdirSync(DIR, { recursive: true })

let nMare = 0, nMic = 0, octeti = 0, lipsa = 0
for (const m of man) {
  const nume = m.local.split('/').pop()
  const src = RAD + m.local
  if (!existsSync(src)) { lipsa++; continue }
  const citit = m.cap === 'atlas' || DE_CITIT.test(`${m.legenda} ${m.fisier}`)
  const lat = citit ? MARE : MIC
  const q = citit ? Q_MARE : Q_MIC
  const dest = DIR + nume
  await sharp(src).rotate()
    .resize({ width: lat, height: lat * 2, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: q, progressive: true, mozjpeg: true })
    .toFile(dest)
  octeti += statSync(dest).size
  citit ? nMare++ : nMic++
}
console.log(`${nMare} de citit la ${MARE} px · ${nMic} de privit la ${MIC} px` +
  (lipsa ? ` · ${lipsa} lipsă` : '') + ` · ${(octeti / 1048576).toFixed(1)} MB`)
