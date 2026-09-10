/* ===========================================================================
   ATLAS — proiectie si randare SVG
   Proiectie conica echidistanta simpla, centrata pe 45.8°N / 25°E:
   suficient de exacta pentru scara acestor harti si stabila intre ele.
   =========================================================================== */
import { REGIUNI, FRONTIERE, ZONE, APE, VECINI, L } from './geo.js'

const LAT0 = 45.8, LON0 = 25.0, K = 100
const kx = Math.cos((LAT0 * Math.PI) / 180) * K
export const proj = ([lon, lat]) => [(lon - LON0) * kx, -(lat - LAT0) * K]

const fmt = (n) => Math.round(n * 100) / 100
const path = (pts, close) => pts.map((p, i) => (i ? 'L' : 'M') + fmt(p[0]) + ' ' + fmt(p[1])).join('') + (close ? 'Z' : '')
export const d = (coords, close = true) => path(coords.map(proj), close)

/* centroid ponderat pe arie, pentru pozitionarea etichetelor de rezerva */
export function centroid(ring) {
  let a = 0, x = 0, y = 0
  const pts = ring.map(proj)
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]
    const f = x1 * y2 - x2 * y1
    a += f; x += (x1 + x2) * f; y += (y1 + y2) * f
  }
  a *= 0.5
  return a === 0 ? pts[0] : [x / (6 * a), y / (6 * a)]
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/* ---------------------------------------------------------------------------
   harta(spec) -> string SVG
   spec = {
     view:   [lonMin, latMin, lonMax, latMax]  cadrul geografic
     tonuri: { numeRegiune: 'a'|'b'|'c'|'d'|'nul' }   sau prin ansambluri
     contur: [numeRegiune...]   contur ingrosat comun (frontiera de stat)
     zone:   [{ ring:[[lon,lat]...], ton, haș, eticheta }]  suprafete ad-hoc
     linii:  [{ pts, stil:'frontiera'|'ceda'|'campanie', eticheta }]
     locuri: [{ p:[lon,lat,nume], tip:'capitala'|'oras'|'sit'|'batalie' }]
     note:   [{ p:[lon,lat], text, clasa }]
   }
   --------------------------------------------------------------------------- */
export function harta(spec) {
  const [lonA, latA, lonB, latB] = spec.view
  const [x0, y1] = proj([lonA, latA])
  const [x1, y0] = proj([lonB, latB])
  const W = x1 - x0, H = y1 - y0
  const pad = spec.pad ?? 8
  const vb = `${fmt(x0 - pad)} ${fmt(y0 - pad)} ${fmt(W + 2 * pad)} ${fmt(H + 2 * pad)}`
  const s = []
  const uid = spec.id || 'm'

  s.push(`<defs>`)
  s.push(`<pattern id="${uid}-h" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`,
         `<rect width="7" height="7" fill="none"/><line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" stroke-width="1.6" opacity=".5"/></pattern>`)
  s.push(`<pattern id="${uid}-p" width="5" height="5" patternUnits="userSpaceOnUse">`,
         `<circle cx="1.2" cy="1.2" r="1" fill="currentColor" opacity=".4"/></pattern>`)
  s.push(`<marker id="${uid}-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">`,
         `<path d="M0 1L9 5L0 9z" fill="currentColor"/></marker>`)
  s.push(`<clipPath id="${uid}-c"><rect x="${fmt(x0)}" y="${fmt(y0)}" width="${fmt(W)}" height="${fmt(H)}"/></clipPath>`)
  s.push(`</defs>`)

  s.push(`<g clip-path="url(#${uid}-c)">`)
  /* uscat + mare */
  s.push(`<rect class="m-uscat" x="${fmt(x0)}" y="${fmt(y0)}" width="${fmt(W)}" height="${fmt(H)}"/>`)
  s.push(`<path class="m-mare" d="${d(APE.marea)}"/>`)

  /* frontiere de context (vecini) */
  for (const k in VECINI) s.push(`<path class="m-vecin" d="${d(VECINI[k], false)}"/>`)

  /* regiuni tonate */
  const tonuri = spec.tonuri || {}
  for (const k in REGIUNI) {
    const t = tonuri[k]
    if (!t || t === 'nul') continue
    s.push(`<path class="m-reg m-t${t}" d="${d(REGIUNI[k].ring)}"><title>${esc(REGIUNI[k].nume)}</title></path>`)
  }
  /* zone ad-hoc */
  for (const z of spec.zone || []) {
    const cls = 'm-reg' + (z.ton ? ' m-t' + z.ton : '')
    s.push(`<path class="${cls}" d="${d(z.ring)}"${z.opac ? ` opacity="${z.opac}"` : ''}/>`)
    if (z.has) s.push(`<path class="m-has" d="${d(z.ring)}" fill="url(#${uid}-h)"/>`)
  }

  /* hasuri peste regiuni (teritorii pierdute / ocupate) */
  for (const k of spec.has || []) s.push(`<path class="m-has" d="${d(REGIUNI[k].ring)}" fill="url(#${uid}-h)"/>`)

  /* limitele interne dintre regiunile tonate */
  for (const k in REGIUNI) {
    if (!tonuri[k] || tonuri[k] === 'nul') continue
    s.push(`<path class="m-lim" d="${d(REGIUNI[k].ring)}"/>`)
  }

  /* ape desenate peste uscat */
  if (spec.ape !== false) {
    for (const k of (spec.rauri || ['dunare','prut','nistru','mures','olt','siret','tisa'])) {
      s.push(`<path class="m-rau" d="${d(APE[k], false)}"/>`)
    }
  }

  /* contur de stat */
  if (spec.contur && spec.contur.length) {
    s.push(`<path class="m-stat" d="${spec.contur.map((k) => d(REGIUNI[k].ring)).join('')}"/>`)
  }
  for (const c of spec.conturZone || []) s.push(`<path class="m-stat" d="${d(c)}"/>`)

  /* linii tematice */
  for (const l of spec.linii || []) {
    s.push(`<path class="m-linie m-l-${l.stil || 'frontiera'}" d="${d(l.pts, false)}"${l.sageata ? ` marker-end="url(#${uid}-a)"` : ''}/>`)
  }
  s.push(`</g>`)

  /* locuri */
  for (const o of spec.locuri || []) {
    const [lon, lat, nume] = o.p
    const [px, py] = proj([lon, lat])
    const tip = o.tip || 'oras'
    if (tip === 'batalie') {
      s.push(`<g class="m-loc m-batalie" transform="translate(${fmt(px)} ${fmt(py)})">`,
             `<path d="M-4.2-4.2L4.2 4.2M-4.2 4.2L4.2-4.2"/></g>`)
    } else if (tip === 'sit') {
      s.push(`<g class="m-loc m-sit" transform="translate(${fmt(px)} ${fmt(py)})"><path d="M0-5L4.5 3.5H-4.5Z"/></g>`)
    } else if (tip === 'capitala') {
      s.push(`<g class="m-loc m-capitala" transform="translate(${fmt(px)} ${fmt(py)})"><circle r="4.4"/><circle r="1.7" class="m-in"/></g>`)
    } else {
      s.push(`<circle class="m-loc m-oras" cx="${fmt(px)}" cy="${fmt(py)}" r="2.6"/>`)
    }
    const anc = o.anc || 'start'
    const dx = anc === 'end' ? -6.5 : anc === 'middle' ? 0 : 6.5
    const dy = o.sus ? -7.5 : anc === 'middle' ? 13 : 3.8
    s.push(`<text class="m-et m-et-loc" x="${fmt(px + dx)}" y="${fmt(py + dy)}" text-anchor="${anc}">${esc(nume)}</text>`)
  }

  /* etichete de regiune si note libere */
  for (const n of spec.note || []) {
    const [px, py] = proj(n.p)
    const cls = 'm-et ' + (n.clasa || 'm-et-reg')
    const linii = String(n.text).split('\n')
    s.push(`<text class="${cls}" x="${fmt(px)}" y="${fmt(py)}" text-anchor="${n.anc || 'middle'}"${n.rot ? ` transform="rotate(${n.rot} ${fmt(px)} ${fmt(py)})"` : ''}>`)
    linii.forEach((t, i) => s.push(`<tspan x="${fmt(px)}" dy="${i ? '1.15em' : '0'}">${esc(t)}</tspan>`))
    s.push(`</text>`)
  }

  /* rama */
  s.push(`<rect class="m-rama" x="${fmt(x0)}" y="${fmt(y0)}" width="${fmt(W)}" height="${fmt(H)}"/>`)

  /* scara grafica */
  if (spec.scara !== false) {
    const km = spec.scaraKm || 200
    const L = (km / 111.32) * K
    const bx = x0 + 12, by = y1 - 12
    s.push(`<g class="m-scara"><line x1="${fmt(bx)}" y1="${fmt(by)}" x2="${fmt(bx + L)}" y2="${fmt(by)}"/>`,
           `<line x1="${fmt(bx)}" y1="${fmt(by - 3)}" x2="${fmt(bx)}" y2="${fmt(by + 3)}"/>`,
           `<line x1="${fmt(bx + L)}" y1="${fmt(by - 3)}" x2="${fmt(bx + L)}" y2="${fmt(by + 3)}"/>`,
           `<text class="m-et m-et-scara" x="${fmt(bx + L / 2)}" y="${fmt(by - 6)}" text-anchor="middle">${km} km</text></g>`)
  }
  return { vb, body: s.join('') }
}

export { REGIUNI, FRONTIERE, ZONE, APE, VECINI, L }
