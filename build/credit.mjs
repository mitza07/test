/* ===========================================================================
   Creditul unei ilustratii, scris o singura data.
   ---------------------------------------------------------------------------
   Manifestul vine de la Commons cu gunoiul lui: autori scrisi de doua ori
   ("Unknown author Unknown author"), nume de utilizator lipite de numele
   adevarat, date cu timbru de ceas. Tiparul avea o functie care curata; editia
   web, EPUB-ul si manuscrisul lipeau campurile brute. De aici incolo o singura
   functie, pentru toate patru.
   =========================================================================== */

const NECUNOSCUT = /neidentificat|unknown|anonim|no author|not (known|stated)|autor necunoscut/i

/** Data, fara timbru de ceas si fara zecimile ei. */
export function dataScurta(d) {
  const s = String(d || '').trim()
  if (!s) return ''
  /* "2011-06-12 14:03:22" sau "2011-06-12T14:03:22Z" → "12 iunie 2011" */
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
      'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']
    const zi = Number(iso[3]), luna = LUNI[Number(iso[2]) - 1]
    return luna ? `${zi} ${luna} ${iso[1]}` : iso[1]
  }
  return s.replace(/\s*\d{1,2}:\d{2}(:\d{2})?.*$/, '').trim().slice(0, 40)
}

/** Autorul, o singura data si fara repetitii. */
export function autorScurt(a) {
  let s = String(a || '').replace(/\s+/g, ' ').trim()
  if (!s || NECUNOSCUT.test(s)) return ''
  /* "Unknown author Unknown author" → o data; la fel orice repetitie lipita */
  for (let i = 0; i < 3; i++) {
    const m = s.match(/^(.{4,60}?)\s*\1(\s|$)/i)
    if (!m) break
    s = m[1].trim()
  }
  /* numele de utilizator lipit dupa numele adevarat */
  s = s.replace(/\s*\((talk|discuție)\)\s*/gi, ' ').replace(/\s*\|\s*.*$/, '')
  return s.trim().slice(0, 70)
}

/**
 * Creditul complet: autor · data · fond · licenta.
 * @param {object} m intrarea din manifest
 */
export function creditScurt(m) {
  const p = []
  const a = autorScurt(m.autor)
  if (a) p.push(a)
  const d = dataScurta(m.data)
  if (d) p.push(d)
  p.push(m.sursa || 'Wikimedia Commons')
  p.push(/domeniu public/i.test(m.tipLicenta || '') ? 'domeniu public' : (m.licenta || ''))
  return p.filter(Boolean).join(' · ')
}
