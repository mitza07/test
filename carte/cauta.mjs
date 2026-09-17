/* ===========================================================================
   Cautare la scara pe Wikimedia Commons, cu verificare de licenta.
   ---------------------------------------------------------------------------
   Descarcarea NU se face de pe upload.wikimedia.org, care limiteaza rata pe
   IP-uri partajate, ci prin commons.wikimedia.org/Special:Redirect/file, care
   serveste acelasi fisier fara plafon.
   =========================================================================== */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { execFileSync } from 'child_process'

const RAD = new URL('./', import.meta.url).pathname
const UA = 'IstoriaRomaniei-carte/1.0 (contact: mitza0704@gmail.com)'
const API = 'https://commons.wikimedia.org/w/api.php'

/* Commons raspunde cu text simplu, nu JSON, cand se depaseste rata permisa pe
   API. Fara verificarea asta, raspunsul pica la JSON.parse si cautarea pare doar
   sa nu fi gasit nimic — cea mai perfida forma de esec. Aici se astepta si se
   reia, iar ritmul de baza creste dupa fiecare refuz. */
let pauzaApi = 0.25
export const json = (params) => {
  const u = API + '?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params })
  for (let i = 0; i < 6; i++) {
    try { execFileSync('sleep', [String(pauzaApi.toFixed(2))]) } catch {}
    let brut = ''
    try { brut = execFileSync('curl', ['-sS', '--max-time', '60', '-A', UA, u], { maxBuffer: 128e6 }).toString() }
    catch { continue }
    if (/^\s*[[{]/.test(brut)) {
      try { const r = JSON.parse(brut); pauzaApi = Math.max(0.25, pauzaApi * 0.85); return r } catch {}
    }
    if (/too many requests/i.test(brut)) pauzaApi = Math.min(20, pauzaApi * 2 + 0.5)
  }
  console.error(`  API refuză (ritm ${pauzaApi.toFixed(1)}s): ${params.gcmtitle || params.gsrsearch || ''}`)
  return null
}

/* Fara latime se ia originalul, ceea ce scuteste serverul de generarea unei
   miniaturi — tocmai operatia pe care Commons o limiteaza cel mai strans. */
export const adresaFisier = (nume, latime = 2000) =>
  'https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/' +
  encodeURIComponent(nume.replace(/ /g, '_')) + (latime ? '&width=' + latime : '')

const curata = (h) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

/* --- licenta: ce intra intr-o carte care se vinde ------------------------- */
export function verdict(em) {
  const scurt = curata(em?.LicenseShortName?.value)
  const t = (scurt + ' ' + curata(em?.UsageTerms?.value) + ' ' + curata(em?.Copyrighted?.value)).toLowerCase()
  if (/share.?alike|by-sa|gfdl|gnu free|copyleft/.test(t)) return { ok: false }
  if (/non.?commercial|by-nc/.test(t)) return { ok: false }
  if (/no.?deriv|by-nd/.test(t)) return { ok: false }
  if (/public domain|^pd\b|pd-|cc0|no restrictions|public-domain/.test(t))
    return { ok: true, tip: 'domeniu public', licenta: scurt || 'domeniu public' }
  if (/\bcc by\b|creative commons attribution(?!\s*-?\s*share)/.test(t))
    return { ok: true, tip: 'CC BY', licenta: scurt }
  return { ok: false }
}

function extrage(pagini, minLat) {
  const out = []
  for (const p of pagini || []) {
    const ii = p.imageinfo?.[0]; if (!ii) continue
    if (!/^image\/(jpeg|png|tiff)$/.test(ii.mime || '')) continue
    if ((ii.width || 0) < minLat) continue
    const em = ii.extmetadata || {}
    const v = verdict(em); if (!v.ok) continue
    out.push({
      fisier: p.title.replace(/^File:/, ''),
      pagina: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(p.title),
      latime: ii.width, inaltime: ii.height, octeti: ii.size,
      autor: curata(em.Artist?.value) || '',
      data: curata(em.DateTimeOriginal?.value).replace(/\s*date QS.*/i, '') || curata(em.DateTime?.value) || '',
      descriere: curata(em.ImageDescription?.value).slice(0, 300),
      licenta: v.licenta, tipLicenta: v.tip,
      categorii: curata(em.Categories?.value).split('|').slice(0, 6),
    })
  }
  return out
}

export function dinCategorie(cat, { lim = 60, minLat = 1000 } = {}) {
  const r = json({ action: 'query', generator: 'categorymembers', gcmtitle: 'Category:' + cat,
    gcmtype: 'file', gcmlimit: String(lim), prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime' })
  return extrage(r?.query?.pages, minLat)
}

export function dinCautare(q, { lim = 40, minLat = 1000 } = {}) {
  const r = json({ action: 'query', generator: 'search', gsrsearch: 'filetype:bitmap ' + q,
    gsrnamespace: '6', gsrlimit: String(lim), prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime' })
  return extrage(r?.query?.pages, minLat)
}

/* ===========================================================================
   Programul iconografic: ce se cauta pentru fiecare parte a volumului.
   Accentul cade pe harti vechi si pe obiecte, care sunt colorate si aproape
   intotdeauna in domeniul public.
   =========================================================================== */
export const PROGRAM = [
  { cheie: 'preistorie', titlu: 'Epoca fierului',
    cat: ['Archaeological finds in Romania', 'Bronze Age Romania', 'Hallstatt culture in Romania'],
    q: ['Cotofenesti helmet gold', 'Hinova treasure', 'Sanislau bronze hoard Romania', 'Histria archaeological site Romania'] },
  { cheie: 'geti', titlu: 'Geții',
    cat: ['Agighiol treasure', 'Peretu treasure', 'Thracian treasures'],
    q: ['Getic silver rhyton', 'Thracian gold Romania museum', 'Borovo treasure'] },
  { cheie: 'burebista', titlu: 'Dacia preromană',
    cat: ['Sarmizegetusa Regia', 'Dacian bracelets', 'Dacian fortresses of the Orastie Mountains', 'Coins of Dacia'],
    q: ['Dacian gold bracelet spiral', 'Koson stater', 'Costesti Blidaru fortress', 'Dacian sanctuary andesite'] },
  { cheie: 'decebal', titlu: 'Războaiele daco-romane',
    cat: ["Trajan's Column", 'Cichorius Trajan Column plates', 'Dacian Wars'],
    q: ['Trajan Column cast Museo della Civilta Romana', 'Decebalus death relief', 'Tropaeum Traiani metope'] },
  { cheie: 'dacia-romana', titlu: 'Dacia romană',
    cat: ['Roman Dacia', 'Ulpia Traiana Sarmizegetusa', 'Roman archaeology in Romania', 'Tropaeum Traiani'],
    q: ['Roman mosaic Romania', 'Apulum Roman inscription', 'Porolissum Roman fort', 'Roman wax tablet Alburnus Maior'] },
  { cheie: 'migratii', titlu: 'Migrațiile',
    cat: ['Pietroasele Treasure', 'Sinnicolau Mare Treasure', 'Migration Period art'],
    q: ['Nagyszentmiklos treasure', 'Gothic eagle fibula', 'Biertan donarium', 'Apahida treasure'] },
  { cheie: 'voievodate', titlu: 'Evul mediu timpuriu',
    cat: ['Chronicon Pictum', 'Fortified churches in Transylvania', 'Densus Church'],
    q: ['Chronicon Pictum miniature', 'Saxon fortified church Transylvania', 'Biertan church', 'Prejmer'] },
  { cheie: 'intemeiere', titlu: 'Întemeierea',
    cat: ['Curtea de Argeș Princely Church', 'Cozia Monastery', 'Basarab I of Wallachia'],
    q: ['Curtea de Arges fresco 14th century', 'Mircea cel Batran Cozia fresco', 'Suceava fortress'] },
  { cheie: 'cruciada', titlu: 'Ștefan, Vlad, Iancu',
    cat: ['Voroneț Monastery', 'Stephen III of Moldavia', 'Vlad the Impaler', 'John Hunyadi'],
    q: ['Voronet blue fresco Last Judgement', 'Stephen the Great votive fresco', 'Humor monastery painted', 'Moldovita monastery'] },
  { cheie: 'otoman', titlu: 'Sub semilună',
    cat: ['Michael the Brave', 'Neagoe Basarab', 'Alba Carolina'],
    q: ['Michael the Brave Sadeler engraving', 'Wallachia Ottoman tribute miniature', 'Neagoe Basarab Arges church'] },
  { cheie: 'brancoveanu', titlu: 'Secolul XVII',
    cat: ['Horezu Monastery', 'Brâncovenesc style', 'Mogoșoaia Palace', 'Dimitrie Cantemir'],
    q: ['Brancovenesc carved stone', 'Hurezi fresco', 'Cantemir Descriptio Moldaviae', 'Biblia de la Bucuresti 1688'] },
  { cheie: 'fanarioti', titlu: 'Epoca fanariotă',
    cat: ['Phanariotes', 'Horea Closca and Crisan'],
    q: ['Phanariot costume engraving', 'Horea Closca Crisan execution engraving', 'Bucharest 18th century engraving'] },
  { cheie: 'renastere', titlu: 'Pașoptism și Unire',
    cat: ['Alexandru Ioan Cuza', 'Romanian Revolution of 1848', 'Avram Iancu'],
    q: ['Blaj 1848 assembly painting', 'Cuza proclamation 1859 lithograph', 'Theodor Aman painting', 'Tudor Vladimirescu portrait'] },
  { cheie: 'regat', titlu: 'Regatul',
    cat: ['Carol I of Romania', 'Romanian War of Independence', 'Nicolae Grigorescu'],
    q: ['Grigorescu painting Rosia', 'Plevna 1877 painting', 'Bucharest 1900 photograph', 'Peles Castle interior'] },
  { cheie: 'mare-razboi', titlu: 'Marele Război',
    cat: ['Romania in World War I', 'Great Union of 1918'],
    q: ['Marasesti 1917 photograph', 'Alba Iulia 1918 assembly photograph', 'Ferdinand Marie coronation 1922'] },
  { cheie: 'interbelic', titlu: 'Interbelic',
    cat: ['Interwar Romania', 'Constantin Brâncuși', 'Bucharest in the 1930s'],
    q: ['Brancusi Targu Jiu ensemble', 'Bucharest interwar architecture photograph', 'George Enescu photograph'] },
  { cheie: 'razboi2', titlu: 'Al Doilea Război',
    cat: ['Romania in World War II', 'Second Vienna Award'],
    q: ['Second Vienna Award 1940 photograph', 'Romanian troops 1941 Odessa', 'Ploiesti oil refinery bombing 1943'] },
  { cheie: 'comunism1', titlu: 'Comunismul',
    cat: ['Communist Romania', 'Michael I of Romania', 'Danube–Black Sea Canal'],
    q: ['Romania propaganda poster 1950s', 'Gheorghiu-Dej portrait', 'Sighet prison'] },
  { cheie: 'ceausescu', titlu: 'Ceaușescu',
    cat: ['Nicolae Ceaușescu', 'Palace of the Parliament', 'Systematization (Romania)'],
    q: ['Ceausescu 1968 balcony', 'Bucharest 1977 earthquake', 'Casa Poporului construction'] },
  { cheie: 'revolutia', titlu: '1989',
    cat: ['Romanian Revolution of 1989'],
    q: ['Bucharest December 1989', 'Timisoara December 1989 photograph'] },
  { cheie: 'contemporan', titlu: 'România de azi',
    cat: ['Romania', 'Bucharest'],
    q: ['Romania landscape Carpathians', 'Danube Delta photograph', 'Bucharest skyline'] },
  /* --------- programul cartografic, cel mai bogat si integral color -------- */
  { cheie: 'harti-antic', titlu: 'Hărți ale antichității',
    cat: ['Old maps of Dacia', 'Tabula Peutingeriana'],
    q: ['Dacia antiqua map Ortelius', 'Tabula Peutingeriana segment Dacia', 'Ptolemy map Dacia'] },
  { cheie: 'harti-1500', titlu: 'Hărți, secolele XVI–XVII',
    cat: ['Old maps of Transylvania', 'Old maps of Wallachia', 'Old maps of Moldavia'],
    q: ['Honterus Rudimenta Cosmographica', 'Ortelius Transylvania map', 'Mercator Walachia Moldavia', 'Blaeu Transylvania 1645'] },
  { cheie: 'harti-1700', titlu: 'Hărți, secolul XVIII',
    cat: ['Old maps of Romania', 'Josephine Land Survey'],
    q: ['Cantemir Descriptio Moldaviae map 1737', 'Specht map Wallachia 1791', 'Homann Walachia map', 'Josephinische Landesaufnahme Siebenbürgen'] },
  { cheie: 'harti-1800', titlu: 'Hărți, secolul XIX',
    cat: ['1878 maps', 'Maps of the Russo-Turkish War (1877–1878)'],
    q: ['Danubian Principalities map 1856', 'Romania map 1878 Berlin', 'ethnographic map Balkans 19th century', 'Dobruja map 1878'] },
  { cheie: 'harti-1900', titlu: 'Hărți, secolul XX',
    cat: ['Maps of Greater Romania', 'Treaty of Trianon maps'],
    q: ['Romania map 1920 Trianon', 'Second Vienna Award map 1940', 'Bessarabia map 1918', 'Romania ethnographic map 1919'] },
]

/* ========================================================================== */
if (process.argv[1]?.endsWith('cauta.mjs')) {
  mkdirSync(RAD + 'ilustratii', { recursive: true })
  const rezultat = []
  for (const p of PROGRAM) {
    const vazut = new Set(); let g = []
    for (const c of p.cat) for (const x of dinCategorie(c)) if (!vazut.has(x.fisier)) { vazut.add(x.fisier); g.push(x) }
    for (const q of p.q) for (const x of dinCautare(q)) if (!vazut.has(x.fisier)) { vazut.add(x.fisier); g.push(x) }
    g.sort((a, b) => (b.latime * b.inaltime) - (a.latime * a.inaltime))
    rezultat.push({ ...p, gasite: g })
    console.log(`${p.cheie.padEnd(14)} ${String(g.length).padStart(3)} acceptate   ` +
      `${g.filter(x => x.tipLicenta === 'domeniu public').length} PD`)
  }
  writeFileSync(RAD + 'ilustratii/candidati-mari.json', JSON.stringify(rezultat, null, 1))
  const tot = rezultat.reduce((n, r) => n + r.gasite.length, 0)
  console.log(`\n${tot} fișiere au trecut verificarea de licență`)
}
