/* Reduce ilustratiile la rezolutia utila de tipar. La 6x9 inch, o imagine pe
   latimea oglinzii (117 mm = 4,61 inch) are nevoie de 1383 px pentru 300 dpi;
   una pe toata inaltimea (158 mm) de 1866 px. 1900 px acopera ambele cazuri cu
   marja, iar fisierul scade de trei ori. */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import sharp from 'sharp'
const RAD = new URL('./', import.meta.url).pathname
const man = JSON.parse(readFileSync(RAD + 'ilustratii/manifest.json', 'utf8'))
mkdirSync(RAD + 'ilustratii/tipar', { recursive: true })
let inainte = 0, dupa = 0, n = 0
for (const m of man) {
  const src = RAD + m.local
  if (!existsSync(src) || statSync(src).size < 40000) continue
  const dest = RAD + 'ilustratii/tipar/' + m.local.split('/').pop()
  inainte += statSync(src).size
  if (!existsSync(dest)) {
    await sharp(src).rotate().resize({ width: 1700, height: 2150, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(dest)
  }
  dupa += statSync(dest).size; n++
}
console.log(`${n} imagini: ${(inainte/1048576).toFixed(0)} MB → ${(dupa/1048576).toFixed(0)} MB`)
