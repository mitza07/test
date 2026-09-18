/* Varianta pentru ecran: EPUB si manuscrisul .docx nu au nevoie de rezolutia
   de tipar. La KDP, fisierul EPUB se plateste la livrare pe megaoctet, deci
   fiecare megaoctet in plus e bani pierduti la fiecare exemplar vandut. */
import { readFileSync, existsSync, mkdirSync, statSync } from 'fs'
import sharp from 'sharp'
const RAD = new URL('./', import.meta.url).pathname
const man = JSON.parse(readFileSync(RAD + 'ilustratii/manifest.json', 'utf8'))
mkdirSync(RAD + 'ilustratii/ecran', { recursive: true })
let dupa = 0, n = 0
for (const m of man) {
  const src = RAD + 'ilustratii/tipar/' + m.local.split('/').pop()
  if (!existsSync(src)) continue
  const dest = RAD + 'ilustratii/ecran/' + m.local.split('/').pop()
  if (!existsSync(dest)) {
    await sharp(src).resize({ width: 900, height: 1200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 74, mozjpeg: true }).toFile(dest)
  }
  dupa += statSync(dest).size; n++
}
console.log(`${n} imagini pentru ecran: ${(dupa / 1048576).toFixed(1)} MB`)
