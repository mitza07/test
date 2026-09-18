/* ===========================================================================
   PROGRAMUL ICONOGRAFIC al volumului.
   ---------------------------------------------------------------------------
   Fiecare pozitie: [capitolul, plansa de unde vine, numarul din plansa, legenda].
   Alegerea s-a facut cu ochiul, pe planse de contact, nu dupa numele fisierului.
   Toate au trecut verificarea de licenta: domeniu public sau CC BY.
   =========================================================================== */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { execFileSync } from 'child_process'
import { adresaFisier } from './cauta.mjs'

const RAD = new URL('./', import.meta.url).pathname
const UA = 'IstoriaRomaniei-carte/1.0 (contact: mitza0704@gmail.com)'

export const PROGRAM = [
  /* capitol          sursa            nr   legenda */
  ['preistorie',      'preistorie',     0, 'Coiful de aur de la Coțofenești, secolul al IV-lea î.Hr. Ochii apotropaici de pe apărătorile obrajilor și scena sacrificiului de pe laterale îl leagă de repertoriul iconografic traco-getic.'],
  ['geti',            'geti',           0, 'Coiful din mormântul princiar getic de la Peretu, județul Teleorman, secolul al IV-lea î.Hr. Piesa face parte dintr-un inventar funerar care indică o elită războinică bogată, în contact cu lumea greacă.'],
  ['burebista',       'aur-dacic',      1, 'Brățări spiralice de aur dacice, recuperate după 2007 din tezaurele sustrase ilegal de la Sarmizegetusa Regia. Sunt singurele piese de acest tip cunoscute și au aparținut probabil unei elite sacerdotale sau regale.'],
  ['burebista',       'burebista',      0, 'Zid de tip murus dacicus: două paramente din blocuri fasonate de calcar, legate prin bârne transversale și umplute cu piatră. Tehnica apare numai în cetățile din Munții Orăștiei.'],
  ['decebal',         'decebal',        0, 'Moartea lui Decebal, scena CXLV de pe Columna lui Traian. Regele dac își taie gâtul pentru a nu fi luat prizonier; călărețul roman din stânga este Tiberius Claudius Maximus, care își va consemna fapta pe propria piatră funerară.'],
  ['decebal',         'decebal',        1, 'Capul lui Decebal arătat trupelor romane, scena CXLVII de pe Columnă. Reliefurile columnei rămân izvorul vizual principal al războaielor daco-romane, dar sunt un document de propagandă imperială, nu o cronică neutră.'],
  ['dacia-romana',    'dacia-romana',   0, 'Amfiteatrul de la Ulpia Traiana Sarmizegetusa, capitala provinciei Dacia. Orașul a fost întemeiat ex novo, la 40 de kilometri de vechea capitală dacică, iar numele preluat de la aceasta a fost un act politic.'],
  ['dacia-romana',    'harti-antic',    4, 'Tabula Peutingeriana, copie medievală după un itinerar rutier roman. Segmentele care acoperă Dunărea de Jos consemnează drumurile și distanțele provinciei Dacia.'],
  ['migratii',        'aur-dacic',      6, 'Patera tezaurului de la Pietroasele, cunoscut ca „Cloșca cu puii de aur”. Depus în secolul al IV-lea, tezaurul a fost legat de elita gotică din regiune; din cele douăzeci și două de piese originale se mai păstrează douăsprezece.'],
  ['migratii',        'aur-dacic',      9, 'Fibulă cu granate din tezaurul de la Pietroasele. Tehnica aurului cloisonné, cu pietre roșii încastrate în alveole, este caracteristică orfevrăriei germanice din epoca migrațiilor.'],
  ['voievodate',      'voievodate',     1, 'Filă din Chronicon Pictum, cronica ilustrată realizată la curtea lui Ludovic I al Ungariei în jurul anului 1360. Ea conține singura relatare contemporană a înfrângerii lui Carol Robert de Anjou în 1330.'],
  ['intemeiere',      'intemeiere',     0, 'Fresca „Cavalerului fără cap” din biserica Sfântul Nicolae Domnesc de la Curtea de Argeș, una dintre cele mai vechi picturi murale păstrate din Țara Românească.'],
  ['cruciada',        'cruciada',       2, 'Hrisov emis de Vlad Țepeș, secolul al XV-lea, cu pecetea domnească aplicată în chinovar. Actele de cancelarie sunt izvorul care corectează cel mai bine imaginea literară a domnitorului.'],
  ['cruciada',        'cruciada',       4, 'Ban de argint emis de Vlad al III-lea, 1462. Emisiunile monetare proprii sunt un indiciu al autorității domnești, într-o perioadă în care principatul plătea tribut Porții.'],
  ['cruciada',        'fresce',        11, 'Fațada sudică a bisericii mănăstirii Voroneț, ctitorie a lui Ștefan cel Mare din 1488. Pictura exterioară, adăugată în 1547, folosește albastrul care a dat numele culorii; tehnica pigmentului rămâne insuficient explicată.'],
  ['cruciada',        'fresce',         3, 'Asediul Constantinopolului, frescă exterioară de la mănăstirea Moldovița, 1537. Scena reprezintă căderea Bizanțului din 1453 cu armele și costumele secolului al XVI-lea, ca avertisment contemporan asupra primejdiei otomane.'],
  ['otoman',          'otoman',         0, 'Mihai Viteazul, gravură de Aegidius Sadeler, 1601, executată la Praga în anul morții domnitorului. Este portretul contemporan cel mai apropiat de realitate.'],
  ['otoman',          'otoman',         3, 'Neagoe Basarab, frescă de secol XVI. Domnul care a ctitorit biserica episcopală de la Curtea de Argeș și a lăsat „Învățăturile către fiul său Theodosie” este cea mai bună ilustrare a domniei ca act cultural.'],
  ['brancoveanu',     'brancoveanu',    0, 'Mănăstirea Hurezi, ctitoria lui Constantin Brâncoveanu, ridicată între 1690 și 1697. Ansamblul definește stilul brâncovenesc, sinteză de elemente bizantine, orientale și baroce.'],
  ['fanarioti',       'fanarioti',      0, 'Horea și Cloșca, gravură de epocă apărută în presa germană după răscoala din 1784. Execuția prin frângere cu roata, în februarie 1785 la Alba Iulia, a fost consemnată în toată Europa.'],
  ['fanarioti',       'harti-1500',    10, 'Harta Principatelor Moldovei și Valahiei, 1782, colorată de mână. Este ridicată în ajunul războaielor ruso-austro-turce care aveau să coste Moldova Bucovina și apoi Basarabia.'],
  ['renastere',       'renastere',      1, 'Tudor Vladimirescu, portret de Theodor Aman. Pictura este o reconstituire de secol XIX: nu se păstrează niciun portret executat în timpul vieții conducătorului mișcării de la 1821.'],
  ['renastere',       'renastere',      2, 'Deschiderea Corpului Legiuitor la București, gravură din L’Illustration, 1862. Anul în care cele două Adunări fuzionează, iar Principatele Unite primesc numele de România.'],
  ['regat',           'regat',          0, 'Carol I, bust de Frederic Storck, 1900. Domnia de patruzeci și opt de ani a regelui acoperă independența, proclamarea regatului și modernizarea instituțională a țării.'],
  ['regat',           'regat',          4, 'Legația Statelor Unite la București, 1900. Capitala de la sfârșitul secolului al XIX-lea își construia arhitectura de reprezentare după modele occidentale, într-o țară încă majoritar rurală.'],
  ['mare-razboi',     'unirea1918',     1, 'Încoronarea lui Ferdinand și a Mariei la Alba Iulia, 15 octombrie 1922. Ceremonia a fost gândită ca actul simbolic de încheiere a Marii Uniri; regele, catolic, nu a fost uns în biserică, ci încoronat în afara ei.'],
  ['mare-razboi',     'unirea1918',    10, 'Medalia încoronării de la Alba Iulia, 1922, cu efigiile suveranilor pe avers și cortegiul pe revers.'],
  ['mare-razboi',     'mare-razboi',    4, 'Batalionul revoluționar român de la Odesa, 1918. Unitățile formate din prizonieri și voluntari în Rusia revoluționară arată cât de neclare erau liniile în anul în care Basarabia s-a unit cu România.'],
  ['razboi2',         'razboi2',        2, 'Unitate de infanterie română pe frontul de Est, martie 1943. Fotografie din arhiva de propagandă germană: imaginea a fost făcută pentru a fi publicată, nu pentru a documenta.'],
  ['razboi2',         'razboi2',        1, 'Monumentul victimelor pogromului de la Iași. În iunie 1941, la Iași și în „trenurile morții” care au urmat, au fost uciși circa treisprezece mii de evrei.'],
  /* ---------------- programul cartografic, integral color ------------------ */
  ['harti',           'harti-1700',     5, 'Hartă centrată pe Transilvania, Paolo Forlani, 1513. Una dintre cele mai timpurii reprezentări tipărite ale spațiului intracarpatic.'],
  ['harti',           'harti-1500',     1, 'Transilvania, după Gerard Mercator. Rețeaua hidrografică și lanțul carpatic sunt redate cu o precizie neobișnuită pentru secolul al XVI-lea.'],
  ['harti',           'harti-1500',     4, 'Hungariae Descriptio, Wolfgang Lazius, colorată de mână. Harta acoperă întregul bazin carpatic, cu Transilvania ca unitate distinctă.'],
  ['harti',           'harti-1500',    11, 'Nova Transilvaniae principatus tabula, după 1696. Publicată la scurt timp după trecerea principatului sub stăpânire habsburgică.'],
  ['harti',           'harti-1500',     2, 'L’Ungheria e la Transilvania, Giovanni Maria Cassini. Exemplar colorat de mână, cu principatul marcat ca entitate separată de Ungaria.'],
  ['harti',           'harti-antic',    3, 'Tab. IX. Europae Continens Daciam, 1695. Reprezentare erudită a Daciei antice, suprapusă peste geografia contemporană autorului.'],
  ['harti',           'harti-1500',     8, 'Harta Valahiei a lui Rigas Velestinlis, 1797. Cartograful grec, executat de autoritățile otomane în 1798, a conceput-o ca instrument al unui proiect politic balcanic.'],
  ['harti',           'harti-1500',     6, 'Hartă a României desenată de mână în timpul Primului Război Mondial, circa 1917, cu localitățile de pe linia frontului.'],
  ['harti',           'harti-1500',     7, 'Europa de sud-est în atlasul Meyer, 1850, cu Principatele sub suzeranitate otomană și protectorat rusesc.'],
  /* ---------------- adaugiri: subiecte noi si harti etnografice ----------- */
  ['stiinta',         'stiinta',        0, 'Traian Vuia lângă aparatul său, 9 martie 1907. Zborul din 18 martie 1906 de la Montesson, pe o distanță de doisprezece metri, a fost primul cu un aparat mai greu decât aerul care a decolat prin propriile mijloace, fără catapultă sau plan înclinat.'],
  ['stiinta',         'stiinta',        9, 'Aurel Vlaicu și aeroplanul său pe câmpul de la Cotroceni, 1912. Vlaicu a murit în anul următor, încercând să traverseze Carpații.'],
  ['razboi2',         'stiinta',        2, 'Bombardarea aerodromului Otopeni, 26 august 1944, fotografie de recunoaștere americană. Rafinăriile și nodurile de transport din jurul Ploieștiului au fost una dintre țintele majore ale campaniei aeriene aliate.'],
  ['aromani',         'aromani',        0, 'Carte ethnographique des Macédo-Roumains, 1919, întocmită pentru Conferința de Pace de la Paris. Harta consemnează așezările aromânești din Balcani, într-un moment în care statutul lor devenise miză diplomatică.'],
  ['evrei',           'evrei',          0, 'Interiorul sinagogii Status Quo Ante din Târgu Mureș, ridicată în 1900. Din cele circa opt sute de sinagogi existente în România interbelică au mai rămas în folosință câteva zeci.'],
  ['evrei',           'evrei',          3, 'Templul Coral din București, inaugurat în 1866 după modelul sinagogii Leopoldstädter din Viena. Clădirea a fost devastată în timpul rebeliunii legionare din ianuarie 1941.'],
  ['orase',           'orase',          2, 'Piața Sfatului din Brașov în 1848, într-o vedere de epocă. Orașele săsești din Transilvania au păstrat cel mai bine structura medievală, cu piață centrală, casă a sfatului și ziduri de breaslă.'],
  ['orase',           'orase',          0, 'Palatul CEC din București, ridicat între 1897 și 1900 după planurile lui Paul Gottereau. Arhitectura oficială a capitalei la 1900 împrumuta deliberat vocabularul academismului francez.'],
  ['mediu',           'mediu',          1, 'Delta Dunării, rezervație a biosferei înscrisă în patrimoniul mondial UNESCO din 1991. Este cea mai întinsă zonă umedă compactă din Europa și adăpostește cea mai mare colonie de pelicani de pe continent.'],
  ['mediu',           'mediu',          0, 'Lacul Bucura din Parcul Național Retezat, cel mai întins lac glaciar din România. Retezatul a fost declarat parc național în 1935, primul din țară.'],
  ['minoritati',      'harti-etnice',   0, 'Harta etnografică a Ungariei pe densitatea populației, întocmită de Pál Teleki pe baza recensământului din 1910 și prezentată la Conferința de Pace de la Paris. Cunoscută drept „harta roșie”, ea reprezenta maghiarii cu roșu aprins și lăsa nelocuite zonele cu densitate mică, procedeu care exagera optic ponderea maghiară.'],
  ['minoritati',      'harti-etnice',   2, 'La clef de mon pluriel, hartă lingvistică și politică a Europei de Răsărit, Casimir Delamarre, 1868. Cartografia etnică devenise, încă înainte de 1900, un instrument al revendicărilor teritoriale.'],
  ['moldova-rep',     'moldova-rep',    0, 'Bălți, fotografie aeriană germană din 1944. Orașul, al doilea ca mărime din Basarabia, a trecut de patru ori dintr-o stăpânire în alta între 1918 și 1944.'],
  ['mancare',         'mancare',        0, 'Sarmale la oală. Felul, împrumutat din bucătăria otomană împreună cu numele, a devenit emblema mesei de sărbătoare, într-o alimentație structurată secole la rând de cele peste o sută optzeci de zile de post ortodox.'],
]


/* ========================================================================== */
export function manifest() {
  const date = JSON.parse(readFileSync(RAD + 'ilustratii/pentru-alegere.json', 'utf8'))
  const brut = {}
  for (const f of ['candidati-mari', 'candidati-goluri', 'candidati-topup']) {
    if (!existsSync(RAD + `ilustratii/${f}.json`)) continue
    for (const r of JSON.parse(readFileSync(RAD + `ilustratii/${f}.json`, 'utf8')))
      for (const g of r.gasite) brut[g.fisier] = g
  }
  const out = []
  PROGRAM.forEach(([cap, plansa, nr, legenda], i) => {
    const c = date[plansa]?.candidati?.[nr]
    if (!c) { console.error(`lipsă: ${plansa}[${nr}]`); return }
    const meta = brut[c.fisier] || {}
    out.push({ n: i + 1, cap, legenda, fisier: c.fisier,
      local: `ilustratii/mari/${String(i + 1).padStart(2, '0')}-${cap}.jpg`,
      pagina: meta.pagina || 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(c.fisier),
      autor: (meta.autor || c.autor || '').replace(/\s*\(\s*talk\s*\)/gi, '').trim(),
      data: (meta.data || c.data || '').replace(/\s*date QS.*/i, '').trim(),
      licenta: meta.licenta || c.licenta || '', tipLicenta: meta.tipLicenta || c.licenta || '',
      latime: meta.latime, inaltime: meta.inaltime, sursa: 'Wikimedia Commons' })
  })
  return out
}

if (process.argv[1]?.endsWith('program.mjs')) {
  const man = manifest()
  mkdirSync(RAD + 'ilustratii/mari', { recursive: true })
  writeFileSync(RAD + 'ilustratii/manifest.json', JSON.stringify(man, null, 1))
  let ok = 0
  for (const m of man) {
    const dest = RAD + m.local
    if (existsSync(dest) && statSync(dest).size > 60000) { ok++; continue }
    try {
      const cod = execFileSync('curl', ['-sSL', '--max-time', '240', '-A', UA, '-w', '%{http_code}',
        '-o', dest, adresaFisier(m.fisier, 2400)], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
      const dim = existsSync(dest) ? statSync(dest).size : 0
      if (cod === '200' && dim > 60000) { ok++; console.log(`✓ ${String(m.n).padStart(2)} ${m.cap.padEnd(14)} ${(dim/1024).toFixed(0).padStart(5)} KB`) }
      else console.log(`✗ ${String(m.n).padStart(2)} ${m.cap.padEnd(14)} cod ${cod}, ${(dim/1024).toFixed(0)} KB`)
    } catch (e) { console.log(`✗ ${m.n} ${m.cap} — ${String(e).slice(0, 60)}`) }
  }
  console.log(`\n${ok}/${man.length} ilustrații la rezoluție mare`)
}
