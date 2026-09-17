/* ===========================================================================
   Filtreaza fondul dupa relevanta si construieste planse de contact mari,
   de treizeci de imagini, pentru alegerea cu ochiul.
   =========================================================================== */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { execFileSync } from 'child_process'
import { adresaFisier } from './cauta.mjs'

const RAD = new URL('./', import.meta.url).pathname
const MINI = RAD + 'ilustratii/mini2'
const UA = 'IstoriaRomaniei-carte/1.0 (contact: mitza0704@gmail.com)'

/* --- relevanta: cuvintele care leaga un fisier de subiectul volumului ----- */
const TARE = /transylvan|transilvan|siebenb|erdély|wallach|valach|valah|moldav|moldov|dacia|dacian|dac[ăi]|roman[iî]a|rumän|roumanie|bucharest|bucure|bucarest|danub|dunăre|dobrog|banat|bessarab|basarab|bukovin|bucovin|carpath|carpaț|olten|munten|maramure|crișan|sarmizeget|traian|decebal|brancoven|brâncoven|cotofene|coțofăne|pietroas|voroneț|voronet|sucevi|moldovi|humor|arbore|hurez|horez|mogoșoa|curtea de arge|cozia|putna|sighi|sibiu|hermannstadt|brașov|kronstadt|cluj|kolozsv|klausenb|iași|jassy|timiș|temesv|constanț|oradea|arad|craiova|galați|brăila|ploiești|târgoviș|suceava|alba iulia|karlsburg|gyulafeh|chișină|cernăuț|czernowitz|tighina|akkerman|cetatea albă|hotin|mihai viteaz|michael the brave|ștefan cel mare|stephen (iii|the great)|vlad (țepeș|tepes|iii|the impaler)|hunyad|iancu|cuza|carol i|ferdinand|regina maria|marie of|brancusi|brâncuș|enescu|eminescu|ceaușescu|ceausescu|antonescu|cantemir|neagoe|horea|cloșca|crișan|tudor vladimirescu|grigorescu|aman|luchian/i
const SLAB = /ottoman|turkish|hungar|magyar|balkan|bulgar|serbia|ukrain|galicia|podolia|pontus|black sea|marea neagră|thrac|getic|scythia|moesia|pannonia|habsburg|austria|imperial|europ/i
const RAU = /uncle tom|slavery in the united states|american|carolina|virginia|brevard|buchs sg|monte cimino|van gogh|panoramio \(\d|no.smoking|dress code|toilet|parking|logo|flag icon|coat of arms of the united|stamp of (?!romania)|screenshot|diagram of a|map of the world(?! .*dacia)/i

function scor(x) {
  const t = (x.fisier + ' ' + (x.descriere || '')).toLowerCase()
  if (RAU.test(t)) return -100
  let s = 0
  if (TARE.test(t)) s += 60
  if (SLAB.test(t)) s += 18
  const px = (x.latime || 0) * (x.inaltime || 0)
  s += Math.min(28, Math.log10(Math.max(px, 1)) * 3.6)
  if (/domeniu public/.test(x.tipLicenta)) s += 10
  /* materialul de epoca valoreaza mai mult decat fotografia recenta */
  const an = String(x.data || '').match(/1[3-9]\d\d|20[0-2]\d/)
  if (an && Number(an[0]) < 1950) s += 26
  if (an && Number(an[0]) < 1900) s += 10
  return s
}

export function filtreaza(grup, cate = 90) {
  const fond = JSON.parse(readFileSync(RAD + 'ilustratii/fond.json', 'utf8'))
  const v = Object.values(fond[grup] || {})
  return v.map((x) => ({ ...x, scor: scor(x) })).filter((x) => x.scor > 40)
    .sort((a, b) => b.scor - a.scor).slice(0, cate)
}

const ia = (nume, dest, lat) => {
  if (existsSync(dest) && statSync(dest).size > 10000) return true
  try {
    const cod = execFileSync('curl', ['-sSL', '--max-time', '90', '-A', UA, '-w', '%{http_code}',
      '-o', dest, adresaFisier(nume, lat)], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
    return cod === '200' && existsSync(dest) && statSync(dest).size > 10000
  } catch { return false }
}

async function plansa(nume, elemente, offset) {
  const sharp = (await import('sharp')).default
  const COL = 5, CEL = 300, ET = 40
  const rand = Math.ceil(elemente.length / COL)
  const straturi = []
  for (let i = 0; i < elemente.length; i++) {
    const e = elemente[i]
    const x = (i % COL) * CEL, y = Math.floor(i / COL) * (CEL + ET)
    try {
      const buf = await sharp(e.cale).rotate()
        .resize({ width: CEL - 10, height: CEL - 10, fit: 'contain', background: '#ffffff' })
        .jpeg({ quality: 74 }).toBuffer()
      straturi.push({ input: buf, left: x + 5, top: y + 5 })
    } catch { continue }
    const txt = String(e.fisier).replace(/[<>&]/g, '').slice(0, 34)
    const et = `<svg width="${CEL}" height="${ET}"><rect width="${CEL}" height="${ET}" fill="#111"/>
<text x="5" y="16" font-family="monospace" font-size="15" fill="#ffd479">${offset + i}</text>
<text x="34" y="16" font-family="monospace" font-size="11" fill="#fff">${txt}</text>
<text x="5" y="31" font-family="monospace" font-size="10" fill="#9cf">${e.latime}x${e.inaltime} ${String(e.data||'').replace(/[<>&]/g,'').slice(0,22)}</text></svg>`
    straturi.push({ input: Buffer.from(et), left: x, top: y + CEL - 5 })
  }
  const dest = `${RAD}ilustratii/${nume}.jpg`
  await sharp({ create: { width: COL * CEL, height: rand * (CEL + ET), channels: 3, background: '#fff' } })
    .composite(straturi).jpeg({ quality: 74 }).toFile(dest)
  return dest
}

if (process.argv[1]?.endsWith('planse.mjs')) {
  mkdirSync(MINI, { recursive: true })
  const grup = process.argv[2]
  const cate = Number(process.argv[3] || 90)
  const lista = filtreaza(grup, cate)
  const bune = []
  for (const c of lista) {
    const sigur = c.fisier.replace(/[^\w.-]/g, '_').slice(0, 80)
    const dest = `${MINI}/${grup}-${sigur}.jpg`
    if (ia(c.fisier, dest, 500)) bune.push({ ...c, cale: dest })
  }
  writeFileSync(RAD + `ilustratii/lista-${grup}.json`, JSON.stringify(bune.map((b, i) => ({ i, ...b, cale: undefined })), null, 1))
  const PER = 30
  for (let p = 0; p * PER < bune.length; p++) {
    const felie = bune.slice(p * PER, (p + 1) * PER)
    const d = await plansa(`p2-${grup}-${p + 1}`, felie, p * PER)
    console.log(`${d.split('/').pop()}  ${felie.length} imagini`)
  }
  console.log(`${bune.length}/${lista.length} descărcate pentru ${grup}`)
}
