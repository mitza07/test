/* Extrage rezultatele agentilor din jurnalul workflow-ului in continut.json.
   Foloseste etapa de verificare acolo unde exista, altfel draftul brut. */
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { TITLURI } from './titluri.mjs'

const D = process.argv[2]
const meta = {}
for (const f of readdirSync(D)) {
  if (!f.endsWith('.meta.json')) continue
  const id = f.slice(6, -10)
  meta[id] = JSON.parse(readFileSync(`${D}/${f}`, 'utf8')).description || ''
}

const capitole = {}, teme = {}, corectii = {}
for (const linie of readFileSync(`${D}/journal.jsonl`, 'utf8').split('\n')) {
  if (!linie.trim()) continue
  let e; try { e = JSON.parse(linie) } catch { continue }
  if (e.type !== 'result' || !e.result) continue
  const eticheta = meta[e.agentId] || ''
  const [tip, id] = eticheta.split(':')
  if (!id) continue
  const t = TITLURI[id] || {}
  if (tip === 'scrie' && !capitole[id]) capitole[id] = { id, ...t, ...e.result }
  if (tip === 'verifica') {
    const r = e.result.continut || e.result
    capitole[id] = { id, ...t, ...r }
    corectii[id] = e.result.corectii || []
  }
  if (tip === 'tema') teme[id] = { id, titlu: t.titlu, per: 'transversal', ...e.result }
}

const out = { capitole: Object.values(capitole), teme: Object.values(teme), corectii }
writeFileSync(new URL('./continut.json', import.meta.url), JSON.stringify(out, null, 1))
const nrCorectii = Object.values(corectii).reduce((n, c) => n + c.length, 0)
console.log(`${out.capitole.length} capitole · ${out.teme.length} teme · ${Object.keys(corectii).length} verificate · ${nrCorectii} corecții`)
