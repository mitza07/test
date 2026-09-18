/* ===========================================================================
   Ilustratiile de arhiva: incarcare, redimensionare si asezare in volum.
   ---------------------------------------------------------------------------
   Fiecare imagine poarta cu ea autorul, sursa, licenta si adresa paginii de
   origine. Creditul se tipareste sub imagine si se reia, complet, in lista
   ilustratiilor de la sfarsitul volumului. Fara aceste date o imagine nu
   intra in carte, oricat de potrivita ar fi.
   =========================================================================== */
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs'

const RAD = new URL('./', import.meta.url).pathname
const MANIFEST = RAD + 'ilustratii/manifest.json'
const CACHE = RAD + 'ilustratii/redimensionate'

export function incarca() {
  if (!existsSync(MANIFEST)) return []
  const man = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  return man.filter((m) => {
    const p = RAD + m.local
    return existsSync(p) && statSync(p).size > 20000   /* sub 20 KB e pagina de eroare, nu imagine */
  })
}

/* --- redimensionare, o singura data per latime ---------------------------- */
export async function pregateste(lista, latime = 1600) {
  mkdirSync(CACHE, { recursive: true })
  let sharp
  try { sharp = (await import('sharp')).default } catch { return lista }
  for (const m of lista) {
    const dest = `${CACHE}/${m.cap}-${latime}.jpg`
    if (!existsSync(dest)) {
      try {
        await sharp(RAD + m.local).rotate().resize({ width: latime, withoutEnlargement: true })
          .jpeg({ quality: 84, mozjpeg: true }).toFile(dest)
      } catch { continue }
    }
    m[`cale${latime}`] = dest
    m[`dim${latime}`] = statSync(dest).size
  }
  return lista
}

export const dataUri = (cale) =>
  'data:image/jpeg;base64,' + readFileSync(cale).toString('base64')

/* --- creditul, in forma scurta de sub imagine ----------------------------- */
export function credit(m) {
  const p = []
  if (m.autor && !/neidentificat/i.test(m.autor)) p.push(m.autor)
  if (m.data) p.push(String(m.data).replace(/\s*date QS.*/i, '').trim())
  p.push(m.sursa || 'Wikimedia Commons')
  p.push(m.tipLicenta === 'domeniu public' ? 'domeniu public' : m.licenta)
  return p.filter(Boolean).join(' · ')
}

/* --- creditul complet, pentru lista de la sfarsit ------------------------- */
export function creditLung(m) {
  return `${m.legenda} — ${m.autor}${m.data ? ', ' + String(m.data).replace(/\s*date QS.*/i, '').trim() : ''}. ` +
    `${m.sursa || 'Wikimedia Commons'}, ${m.tipLicenta === 'domeniu public' ? 'domeniu public' : m.licenta}. ${m.pagina}`
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/* --- figura, in cele trei destinatii -------------------------------------- */
export function figura(m, { sursaImagine, nr, clasa = '' }) {
  return `<figure class="ilustratie ${clasa}" id="il-${m.cap}">
<img src="${sursaImagine}" alt="${esc(m.legenda)}"/>
<figcaption>${nr ? `<span class="fig-nr">Ilustrația ${nr}</span>` : ''}${esc(m.legenda)}
<span class="credit">${esc(credit(m))}</span></figcaption>
</figure>`
}

export const CSS = `
.ilustratie { margin: 6mm 0; break-inside: avoid; page-break-inside: avoid; }
.ilustratie img { display: block; width: 100%; height: auto; }
.ilustratie figcaption .credit { display: block; margin-top: 1.2mm; font-size: .88em; opacity: .8; }
`
