/* ===========================================================================
   Cauta pe Wikimedia Commons imagini pentru ilustrarea volumului si verifica
   licenta fiecarui fisier inainte de a-l retine.
   ---------------------------------------------------------------------------
   Regula de acceptare, pentru o carte care se vinde:
     - se primesc: domeniu public sub orice forma, CC0, PDM
     - se primesc, cu credit obligatoriu tiparit: CC BY (oricare versiune)
     - se RESPING: CC BY-SA si orice ShareAlike (ar contamina volumul),
       CC BY-NC (interzice uzul comercial), GFDL, "fair use", licente necunoscute
   Fiecare fisier retinut pastreaza autorul, sursa, licenta si adresa paginii,
   ca sa poata fi tiparite in lista de ilustratii.
   =========================================================================== */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { execFileSync } from 'child_process'

const RAD = new URL('./', import.meta.url).pathname
const DIR = RAD + 'ilustratii'
const UA = 'IstoriaRomaniei-carte/1.0 (contact: mitza0704@gmail.com)'
const API = 'https://commons.wikimedia.org/w/api.php'

const cere = (params) => {
  const u = API + '?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params })
  const raw = execFileSync('curl', ['-sS', '--max-time', '45', '-A', UA, u], { maxBuffer: 64 * 1024 * 1024 })
  return JSON.parse(raw.toString())
}

/* --- verdictul de licenta -------------------------------------------------- */
function verdict(em) {
  const scurt = String(em?.LicenseShortName?.value || '').trim()
  const termeni = String(em?.UsageTerms?.value || '').trim()
  const t = (scurt + ' ' + termeni).toLowerCase()
  if (/share.?alike|by-sa|gfdl|gnu free/.test(t)) return { ok: false, motiv: 'ShareAlike sau GFDL', licenta: scurt }
  if (/non.?commercial|by-nc|\bnc\b/.test(t)) return { ok: false, motiv: 'interzice uzul comercial', licenta: scurt }
  if (/fair use|non-free|copyright/.test(t) && !/public domain/.test(t)) return { ok: false, motiv: 'neliber', licenta: scurt }
  if (/public domain|^pd\b|pd-|cc0|no restrictions|public-domain/.test(t)) return { ok: true, tip: 'domeniu public', licenta: scurt || 'domeniu public' }
  if (/cc by(?!-)|creative commons attribution(?! share)/.test(t)) return { ok: true, tip: 'CC BY, credit obligatoriu', licenta: scurt }
  return { ok: false, motiv: 'licență neidentificată', licenta: scurt || '(gol)' }
}

const curata = (h) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim()

/* --- cautare + verificare -------------------------------------------------- */
async function cauta(interogare, { limita = 14 } = {}) {
  let r
  try {
    r = cere({ action: 'query', generator: 'search', gsrsearch: 'filetype:bitmap ' + interogare,
      gsrnamespace: '6', gsrlimit: String(limita), prop: 'imageinfo',
      iiprop: 'url|extmetadata|size|mime', iiurlwidth: '1600' })
  } catch (e) { return [] }
  const pagini = r?.query?.pages || []
  const bune = []
  for (const p of pagini) {
    const ii = p.imageinfo?.[0]; if (!ii) continue
    if (!/^image\/(jpeg|png)$/.test(ii.mime || '')) continue
    if ((ii.width || 0) < 900) continue
    const em = ii.extmetadata || {}
    const v = verdict(em)
    if (!v.ok) continue
    bune.push({
      fisier: p.title.replace(/^File:/, ''),
      pagina: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(p.title),
      url: ii.url, urlMare: ii.thumburl || ii.url,
      latime: ii.width, inaltime: ii.height,
      autor: curata(em.Artist?.value) || '(autor neidentificat)',
      data: curata(em.DateTimeOriginal?.value) || curata(em.DateTime?.value) || '',
      descriere: curata(em.ImageDescription?.value).slice(0, 220),
      licenta: v.licenta, tipLicenta: v.tip,
      credit: curata(em.Credit?.value).slice(0, 160),
    })
  }
  return bune
}

/* --- ce cautam, capitol cu capitol ----------------------------------------- */
export const CERERI = [
  { cap: 'preistorie',   q: 'Hallstatt bronze hoard Romania archaeology' , alt: 'Histria Romania archaeological site' },
  { cap: 'geti',         q: 'Getae Thracian helmet gold treasure', alt: 'Agighiol helmet' },
  { cap: 'burebista',    q: 'Sarmizegetusa Regia dacian fortress', alt: 'Dacian koson gold coin' },
  { cap: 'decebal',      q: 'Trajan Column relief Dacian wars', alt: 'Decebalus Tropaeum Traiani' },
  { cap: 'dacia-romana', q: 'Roman Dacia inscription Apulum Sarmizegetusa Ulpia', alt: 'Tropaeum Traiani Adamclisi' },
  { cap: 'migratii',     q: 'Pietroasele treasure Gothic gold', alt: 'Biertan Donarium' },
  { cap: 'voievodate',   q: 'Biertan fortified church Transylvania medieval', alt: 'Chronicon Pictum Hungary illumination' },
  { cap: 'intemeiere',   q: 'Curtea de Arges princely church fresco', alt: 'Mircea cel Batran fresco Cozia' },
  { cap: 'cruciada',     q: 'Vlad the Impaler portrait Ambras', alt: 'Stephen III of Moldavia Voronet fresco' },
  { cap: 'otoman',       q: 'Michael the Brave portrait engraving 1601', alt: 'Voronet monastery Last Judgement fresco' },
  { cap: 'brancoveanu',  q: 'Constantin Brancoveanu Hurezi monastery', alt: 'Dimitrie Cantemir portrait' },
  { cap: 'fanarioti',    q: 'Horea Closca Crisan 1784 engraving', alt: 'old map Moldavia Wallachia 18th century' },
  { cap: 'renastere',    q: 'Alexandru Ioan Cuza portrait 1859', alt: 'Blaj 1848 assembly Romanian revolution' },
  { cap: 'regat',        q: 'Carol I of Romania portrait Plevna 1877', alt: 'Bucharest 1900 photograph' },
  { cap: 'mare-razboi',  q: 'Romania World War I Marasesti 1917', alt: 'Alba Iulia 1 December 1918 assembly' },
  { cap: 'interbelic',   q: 'Bucharest interwar 1930s photograph', alt: 'Constantin Brancusi Targu Jiu endless column' },
  { cap: 'razboi2',      q: 'Romania 1940 Vienna Award map', alt: 'Ion Antonescu 1941 photograph' },
  { cap: 'comunism1',    q: 'Romania 1947 King Michael abdication', alt: 'Danube Black Sea canal 1950s labour' },
  { cap: 'ceausescu',    q: 'Nicolae Ceausescu 1968 speech balcony', alt: 'Bucharest 1977 earthquake damage' },
  { cap: 'revolutia',    q: 'Romanian Revolution 1989 Bucharest', alt: 'Timisoara December 1989' },
  { cap: 'tranzitie',    q: 'Bucharest University Square 1990 protest', alt: 'Romania NATO accession 2004' },
  { cap: 'contemporan',  q: 'Bucharest 2017 protest Piata Victoriei', alt: 'Romania European Union 2007' },
  { cap: 'harti-vechi',  q: 'Valachia Moldavia Transylvania old map 17th century', alt: 'Dacia antiqua old map' },
  { cap: 'harti-vechi2', q: 'Ottoman Empire map 1600 Danube principalities', alt: 'map Romania 1919 Paris peace' },
]

/* ========================================================================== */
if (process.argv[1]?.endsWith('imagini.mjs')) {
  mkdirSync(DIR, { recursive: true })
  const rezultate = []
  for (const c of CERERI) {
    let g = await cauta(c.q)
    if (g.length < 2 && c.alt) g = g.concat(await cauta(c.alt))
    rezultate.push({ cap: c.cap, cerere: c.q, gasite: g })
    console.log(`${c.cap.padEnd(15)} ${String(g.length).padStart(2)} acceptate  ${g.slice(0,2).map(x=>x.fisier.slice(0,42)).join(' | ')}`)
  }
  writeFileSync(DIR + '/candidati.json', JSON.stringify(rezultate, null, 1))
  const total = rezultate.reduce((n, r) => n + r.gasite.length, 0)
  console.log(`\n${total} fișiere au trecut verificarea de licență · ilustratii/candidati.json`)
}
