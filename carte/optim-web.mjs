/* Varianta pentru pagina publicata: vizualizatorul de artefacte nu incarca
   imagini de pe alte domenii, deci ilustratiile trebuie sa intre in fisier.
   Bugetul e de 16 MB pentru toata pagina, din care 2 MB ii ia textul. */
import { readFileSync, existsSync, mkdirSync, statSync } from 'fs'
import sharp from 'sharp'
const RAD = new URL('./', import.meta.url).pathname
const LAT = Number(process.argv[2] || 560), Q = Number(process.argv[3] || 62)
const man = JSON.parse(readFileSync(RAD + 'ilustratii/manifest.json', 'utf8'))
mkdirSync(RAD + 'ilustratii/il', { recursive: true })
let dupa = 0, n = 0
for (const m of man) {
  const src = RAD + 'ilustratii/tipar/' + m.local.split('/').pop()
  if (!existsSync(src)) continue
  const dest = RAD + 'ilustratii/il/' + m.local.split('/').pop()
  await sharp(src).resize({ width: LAT, height: LAT * 2, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: Q, mozjpeg: true, chromaSubsampling: '4:2:0' }).toFile(dest)
  dupa += statSync(dest).size; n++
}
console.log(`${n} imagini la ${LAT} px / q${Q}: ${(dupa / 1048576).toFixed(1)} MB` +
  ` → ${(dupa * 1.37 / 1048576).toFixed(1)} MB ca date incorporate`)
