/* Aduna rezultatele din toate workflow-urile de cercetare intr-un singur
   continut.json. Rezultatul verificat are prioritate fata de draftul brut. */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { TITLURI } from './titluri.mjs'

const RADACINA = process.argv[2]
const dosare = readdirSync(RADACINA).filter((d) => d.startsWith('wf_'))

const capitole = {}, teme = {}, corectii = {}, verificate = new Set()
for (const dos of dosare) {
  const D = `${RADACINA}/${dos}`
  if (!existsSync(`${D}/journal.jsonl`)) continue
  const meta = {}
  for (const f of readdirSync(D)) {
    if (!f.endsWith('.meta.json')) continue
    meta[f.slice(6, -10)] = JSON.parse(readFileSync(`${D}/${f}`, 'utf8')).description || ''
  }
  for (const linie of readFileSync(`${D}/journal.jsonl`, 'utf8').split('\n')) {
    if (!linie.trim()) continue
    let e; try { e = JSON.parse(linie) } catch { continue }
    if (e.type !== 'result' || !e.result) continue
    const [tip, id] = (meta[e.agentId] || '').split(':')
    if (!id) continue
    const t = TITLURI[id] || {}
    const tinta = TITLURI[id] && !('per' in TITLURI[id]) ? teme : capitole
    if (tip === 'verifica') {
      tinta[id] = { id, ...t, ...(e.result.continut || e.result) }
      corectii[id] = e.result.corectii || []
      verificate.add(id)
    } else if ((tip === 'scrie' || tip === 'tema') && !verificate.has(id)) {
      tinta[id] = { id, ...t, ...e.result }
    }
  }
}

/* rezultatele salvate din rularea intrerupta, folosite doar ca plasa de siguranta */
if (existsSync(new URL('./continut-partial.json', import.meta.url))) {
  const v = JSON.parse(readFileSync(new URL('./continut-partial.json', import.meta.url), 'utf8'))
  for (const c of v.capitole || []) if (!capitole[c.id]) capitole[c.id] = c
  for (const c of v.teme || []) if (!teme[c.id]) teme[c.id] = c
}

for (const k in teme) teme[k].per = 'transversal'
const out = { capitole: Object.values(capitole), teme: Object.values(teme), corectii }
writeFileSync(new URL('./continut.json', import.meta.url), JSON.stringify(out, null, 1))
const nc = Object.values(corectii).reduce((n, c) => n + c.length, 0)
console.log(`${out.capitole.length}/22 capitole · ${out.teme.length}/6 teme · ${verificate.size} verificate · ${nc} corecții aplicate`)
