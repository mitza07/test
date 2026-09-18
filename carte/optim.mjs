/* Reduce ilustratiile la rezolutia utila de tipar si scrie inapoi in manifest
   dimensiunea reala a fisierului obtinut. La 6x9 inch, oglinda are 117 mm; la
   260 de puncte pe tol, asta inseamna 1.198 px. 1.700 px acopera si cazul
   imaginii asezate pe toata inaltimea paginii. Ce vine mai mic de atat nu se
   mareste: se aseaza in pagina pe latimea pe care o merita. */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import sharp from 'sharp'
const RAD = new URL('./', import.meta.url).pathname
const man = JSON.parse(readFileSync(RAD + 'ilustratii/manifest.json', 'utf8'))
mkdirSync(RAD + 'ilustratii/tipar', { recursive: true })
let inainte = 0, dupa = 0, n = 0, subtiri = 0
for (const m of man) {
  const src = RAD + m.local
  if (!existsSync(src) || statSync(src).size < 40000) continue
  const dest = RAD + 'ilustratii/tipar/' + m.local.split('/').pop()
  inainte += statSync(src).size
  if (!existsSync(dest)) {
    await sharp(src).rotate().resize({ width: 1700, height: 2150, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(dest)
  }
  const md = await sharp(dest).metadata()
  m.pxLatime = md.width; m.pxInaltime = md.height
  if (md.width < 1198) subtiri++
  dupa += statSync(dest).size; n++
}
writeFileSync(RAD + 'ilustratii/manifest.json', JSON.stringify(man, null, 1))
console.log(`${n} imagini: ${(inainte / 1048576).toFixed(0)} MB → ${(dupa / 1048576).toFixed(0)} MB` +
  `; ${subtiri} sub 1.198 px, asezate mai mic in pagină`)
