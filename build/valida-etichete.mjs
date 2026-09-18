/* ===========================================================================
   Cate etichete de loc se scriu una peste alta pe hartile volumului.
   ---------------------------------------------------------------------------
   Nu se uita la cod, ci la desenul gata facut: se citesc elementele <text> din
   SVG-ul fiecarei harti, li se socoteste cutia dupa numarul de litere si se
   numara perechile care se ating. E singurul fel in care se vede ca Durostorum
   si Tropaeum Traiani nu se mai calca pe nume.
   =========================================================================== */
import { HARTI } from './harti.mjs'
import { ETICHETE_SUPRAPUSE } from './atlas.js'

const LAT_LITERA = { 'm-et-loc': 4.9, 'm-et-reg': 7.4, 'm-et-mic': 6.4, 'm-et-apa': 4.6 }
const seAting = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

let tot = 0
for (const [cheie, h] of Object.entries(HARTI)) {
  const { body } = h.spec()
  const cutii = []
  for (const m of body.matchAll(/<text class="([^"]*)" x="([-\d.]+)" y="([-\d.]+)"(?:[^>]*text-anchor="(\w+)")?[^>]*>([^<]*)</g)) {
    const [, clase, x, y, anc, text] = m
    const cls = (clase.match(/m-et-\w+/) || [])[0]
    const w = (LAT_LITERA[cls] || 5) * text.length
    if (!text.trim()) continue
    const X = Number(x), Y = Number(y)
    const x0 = anc === 'end' ? X - w : anc === 'middle' ? X - w / 2 : X
    cutii.push({ x0, x1: x0 + w, y0: Y - 3.6, y1: Y + 1.4, text })
  }
  const rele = []
  for (let i = 0; i < cutii.length; i++) for (let j = i + 1; j < cutii.length; j++)
    if (seAting(cutii[i], cutii[j])) rele.push(`${cutii[i].text} / ${cutii[j].text}`)
  tot += rele.length
  console.log(`${rele.length ? '✗' : '✓'} ${cheie.padEnd(18)} ${String(cutii.length).padStart(3)} etichete` +
    (rele.length ? `  se ating: ${rele.join(' · ')}` : ''))
}
console.log(`\n${tot} perechi de etichete se ating pe cele ${Object.keys(HARTI).length} hărți` +
  (ETICHETE_SUPRAPUSE.length ? `; ${ETICHETE_SUPRAPUSE.length} n-au încăput nicăieri` : ''))
process.exit(tot ? 1 : 0)
