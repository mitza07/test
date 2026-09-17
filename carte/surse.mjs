/* Cauta ilustratii de domeniu public la Metropolitan Museum (CC0) si la
   Library of Congress (no known restrictions). Wikimedia limiteaza rata
   pe IP-ul partajat al proxy-ului, deci nu se poate folosi de aici. */
import { execFileSync } from 'child_process'
const UA = 'IstoriaRomaniei-carte/1.0 (mitza0704@gmail.com)'
const json = (u) => JSON.parse(execFileSync('curl',['-sS','--max-time','60','-A',UA,u],{maxBuffer:64e6}).toString())

export function met(q, max = 6) {
  let r; try { r = json(`https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(q)}&hasImages=true`) } catch { return [] }
  const ids = (r.objectIDs || []).slice(0, 25)
  const out = []
  for (const id of ids) {
    if (out.length >= max) break
    let o; try { o = json(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`) } catch { continue }
    if (!o.isPublicDomain || !o.primaryImage) continue
    out.push({ sursa: 'Metropolitan Museum of Art', licenta: 'CC0 / domeniu public',
      titlu: o.title, autor: o.artistDisplayName || o.culture || '—', data: o.objectDate || '',
      material: o.medium || '', url: o.primaryImage, pagina: o.objectURL, id })
  }
  return out
}

export function loc(q, max = 6, sectiune = 'maps') {
  let r; try { r = json(`https://www.loc.gov/${sectiune}/?q=${encodeURIComponent(q)}&fo=json&c=20`) } catch { return [] }
  const out = []
  for (const it of (r.results || [])) {
    if (out.length >= max) break
    const drept = String(it.rights || it.access_restricted || '').toLowerCase()
    if (/restrict|permission|copyright/.test(drept) && !/no known/.test(drept)) continue
    const img = (it.image_url || []).filter(u => /\.(jpg|jpeg|png)$/i.test(u) || /full\/pct:100/.test(u))
    const u = img[img.length - 1] || (it.image_url || [])[ (it.image_url||[]).length - 1 ]
    if (!u) continue
    out.push({ sursa: 'Library of Congress', licenta: it.rights || 'no known restrictions',
      titlu: Array.isArray(it.title) ? it.title[0] : it.title,
      autor: (it.contributor || []).join(', ') || '—',
      data: it.date || '', url: u.startsWith('//') ? 'https:' + u : u, pagina: it.id || it.url })
  }
  return out
}

if (process.argv[1]?.endsWith('surse.mjs')) {
  const CERERI = [
    ['met', 'Thracian silver'], ['met', 'Dacian'], ['met', 'Trajan Dacia coin'],
    ['met', 'Roman Danube province'], ['met', 'Ottoman map Danube'],
    ['loc', 'Wallachia Moldavia map'], ['loc', 'Transylvania map'],
    ['loc', 'Dacia ancient map'], ['loc', 'Romania Bucharest'],
    ['loc', 'Ottoman Empire Europe map 1700'],
  ]
  for (const [s, q] of CERERI) {
    const r = s === 'met' ? met(q) : loc(q)
    console.log(`\n### ${s.toUpperCase()} · ${q} → ${r.length}`)
    r.forEach((x, i) => console.log(`  [${i}] ${String(x.titlu).slice(0,62).padEnd(62)} ${String(x.data).slice(0,14).padEnd(14)} ${String(x.autor).slice(0,26)}`))
  }
}
