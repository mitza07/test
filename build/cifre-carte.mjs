/* ===========================================================================
   CIFRELE DESPRE CARTE, socotite din carte.
   ---------------------------------------------------------------------------
   Volumul spune despre el insusi, in vreo zece locuri — pe coperta a patra, pe
   frontispiciul editiei web, in nota asupra metodei, in metadatele EPUB, in
   PUBLICARE.md — cate harti are, cate ilustratii, cate citate, cate repere si
   cat de exacte sunt suprafetele calculate. Toate erau scrise de mana.

   Rezultatul, la auditul de azi: coperta anunta 666 de repere cronologice acolo
   unde cartea are 656; anunta pe amandoua volumele treisprezece harti, cand
   volumul al doilea n-are niciuna; nota asupra metodei spunea ca ariile se abat
   "cu mai putin de un procent", cand dupa trecerea pe geometrie reala se abat
   cu pana la 2,2; EPUB-ul promitea "peste doua sute de ilustratii" cand sunt
   331; PUBLICARE.md numara 28 de citate de epoca, cand sunt 40.

   Pe coperta unei carti al carei argument de vanzare e tocmai rigoarea.
   De aici incolo se socotesc, si oricine le scrie de mana se bate cu numarul.
   =========================================================================== */
import { readFileSync, existsSync, statSync } from 'fs'
import { PLAN, PLAN_TEME } from './build.mjs'
import { REGIUNI, FRONTIERE } from './geo.js'

const RAD = new URL('./', import.meta.url).pathname

/* Suprafetele adevarate, din surse oficiale, pentru comparatie. */
export const ARII_REALE = {
  romaniaMare: { km2: 295049, nume: 'România Mare' },
  romaniaAzi: { km2: 238397, nume: 'România de azi' },
  dobrogea: { km2: 15485, nume: 'Dobrogea' },
}

/* Aria unui contur, cu formula lui Gauss, la latitudinea medie a tarii. */
function arie(inel) {
  let a = 0
  for (let i = 0; i < inel.length; i++) {
    const p = inel[i], q = inel[(i + 1) % inel.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return Math.round(Math.abs(a / 2) * 111.32 * 111.32 * Math.cos((45.8 * Math.PI) / 180))
}

/** Cat de departe cad ariile calculate de cele reale. */
export function exactitateaHartilor() {
  const inele = { ...FRONTIERE, dobrogea: REGIUNI.dobrogea.ring }
  const out = []
  for (const [cheie, real] of Object.entries(ARII_REALE)) {
    const inel = inele[cheie]
    if (!inel) continue
    const km2 = arie(inel)
    out.push({ cheie, nume: real.nume, km2, real: real.km2,
      abatere: (100 * (km2 - real.km2)) / real.km2 })
  }
  const max = Math.max(...out.map((x) => Math.abs(x.abatere)))
  return { arii: out, abatereMax: max }
}

/** Numerele volumului, pe tot sau pe un tom. */
export function cifreleCartii(volum = 0) {
  const c = JSON.parse(readFileSync(RAD + 'continut.json', 'utf8'))
  const capById = Object.fromEntries((c.capitole || []).map((x) => [x.id, x]))
  const temeById = Object.fromEntries((c.teme || []).map((x) => [x.id, x]))
  const cap = PLAN.map((p) => ({ ...p, ...(capById[p.id] || {}) })).filter((x) => x.sectiuni?.length)
  const teme = PLAN_TEME.map((p) => ({ ...p, ...(temeById[p.id] || {}) })).filter((x) => x.sectiuni?.length)
  const ale = volum === 1 ? cap : volum === 2 ? teme : [...cap, ...teme]
  const idAle = new Set([...ale.map((x) => x.id), ...(volum === 1 ? [] : ['atlas'])])

  let ilustratii = 0
  const caleMan = RAD + '../carte/ilustratii/manifest.json'
  if (existsSync(caleMan)) {
    for (const m of JSON.parse(readFileSync(caleMan, 'utf8'))) {
      if (!idAle.has(m.cap)) continue
      const f = RAD + '../carte/' + m.local
      if (existsSync(f) && statSync(f).size >= 40000) ilustratii++
    }
  }

  const cuv = (x) => (`${x.rezumat} ${(x.sectiuni || []).map((s) => `${s.subtitlu} ${(s.paragrafe || []).join(' ')}`).join(' ')} ${x.controversa || ''}`)
    .split(/\s+/).filter(Boolean).length

  /* Anii din titlu sunt cei documentati an cu an: preludiul neolitic, datat in
     mii de ani, nu intra. */
  const cro = cap.filter((x) => !x.preludiu)
  const de = Math.min(...cro.map((x) => x.de).filter(Number.isFinite))
  const la = Math.max(...cro.map((x) => x.la).filter(Number.isFinite))

  return {
    volum,
    capitole: volum === 2 ? 0 : cap.length,
    teme: volum === 1 ? 0 : teme.length,
    sectiuni: ale.length,
    harti: new Set(ale.flatMap((x) => x.harti || [])).size,
    diagrame: new Set(ale.flatMap((x) => x.diagrame || [])).size,
    ilustratii,
    repere: ale.reduce((a, x) => a + (x.cronologie || []).length, 0),
    oameni: ale.reduce((a, x) => a + (x.figuri || []).length, 0),
    cifre: ale.reduce((a, x) => a + (x.cifre || []).length, 0),
    citate: ale.filter((x) => x.citat?.text).length,
    dispute: ale.filter((x) => x.controversa).length,
    cuvinte: ale.reduce((a, x) => a + cuv(x), 0),
    ani: la - de,
    de, la,
  }
}

/* rulat direct, tipareste ce stie — util cand se scrie PUBLICARE.md */
if (process.argv[1]?.endsWith('cifre-carte.mjs')) {
  for (const v of [0, 1, 2]) {
    const n = cifreleCartii(v)
    console.log(`${v ? 'volumul ' + v : 'tot volumul'}:`, JSON.stringify(n, null, 1).replace(/\n\s*/g, ' '))
  }
  const e = exactitateaHartilor()
  console.log('\nexactitatea hărților (abatere maximă ' + e.abatereMax.toFixed(1) + '%):')
  for (const a of e.arii) console.log(`  ${a.nume.padEnd(16)} ${a.km2.toLocaleString('ro').padStart(9)} km² față de ${a.real.toLocaleString('ro')} (${a.abatere > 0 ? '+' : ''}${a.abatere.toFixed(2)}%)`)
}
