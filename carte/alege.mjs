import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { execFileSync } from 'child_process'
const RAD = new URL('./', import.meta.url).pathname
const toate = [...require0('./ilustratii/candidati.json'), ...require0('./ilustratii/candidati2.json')]
function require0(p){ return JSON.parse(execFileSync('cat',[RAD+p.replace('./','')]).toString()) }
const index = {}
for (const r of toate) for (const g of r.gasite) index[g.fisier] = g

/* alegerea: un singur fisier per capitol, ales pentru relevanta, nu pentru scor */
const ALESE = [
  ['preistorie',   '01894 Kronprinzenwerk, Geschichte Böhmens (1. Ab.), Hallstatter Gräberfeld.jpg', 'Câmpul de morminte de la Hallstatt, care a dat numele epocii. Gravură din „Kronprinzenwerk”, 1886–1902.'],
  ['geti',         'Cabeza - Ajuar funerario de la tumba principesca geta de Peretu..jpg', 'Coiful de argint aurit din mormântul princiar getic de la Peretu, secolul al IV-lea î.Hr.'],
  ['burebista',    'Koson - Münzkabinett, Berlin - 5498176.jpg', 'Staterul de aur de tip KOΣΩN, bătut în spațiul dacic în secolul I î.Hr.'],
  ['burebista2',   'Murus Dacicus.JPG', 'Murus dacicus: blocuri fasonate legate prin bârne transversale, tehnica zidurilor din Munții Orăștiei.'],
  ['decebal',      'Coloana lui Traian (detaliu).jpg', 'Detaliu din Columna lui Traian, izvorul vizual principal al războaielor daco-romane.'],
  ['dacia-romana', 'Milliarum of Aiton, plaque of the modern copy erected in Turda, Romania.jpg', 'Miliarul de la Aiton, 108 d.Hr.: cea dintâi atestare epigrafică a numelui Napoca.'],
  ['migratii',     'Tesaurul de la Petrosa.jpg', 'Tezaurul de la Pietroasele, „Cloșca cu puii de aur”, depus în secolul al IV-lea. Gravură din 1889.'],
  ['voievodate',   'Chronicon Pictum 002.jpg', 'Filă din Chronicon Pictum, c. 1360, izvorul care relatează înfrângerea lui Carol Robert în 1330.'],
  ['intemeiere',   '004 - Basarab I.jpg', 'Basarab I, întemeietorul Țării Românești.'],
  ['cruciada',     'Vlad Ţepeş, the Impaler, Prince of Wallachia (1456-1462) (died 1477).jpg', 'Portretul de la Ambras al lui Vlad Țepeș, copie de secol XVI după un original contemporan.'],
  ['otoman',       'Portret van Mihai Viteazul, RP-P-OB-5054.jpg', 'Mihai Viteazul, gravură de epocă, 1601.'],
  ['fanarioti',    'Horja and Clocska.jpg', 'Horea și Cloșca, gravură de epocă, sfârșitul secolului al XVIII-lea.'],
  ['fanarioti2',   'Principati1786.jpg', 'Harta Principatelor, 1782, în ajunul războaielor ruso-austro-turce.'],
  ['renastere',    'CI Stancescu - Alexandru Ioan Cuza.jpg', 'Alexandru Ioan Cuza, 1859.'],
  ['regat',        'Frederic Storck - Carol I - 1900 - 01.jpg', 'Carol I, bust de Frederic Storck, 1900.'],
  ['mare-razboi',  'Romanian troops at Marasesti in 1917.jpg', 'Trupe române la Mărășești, vara anului 1917.'],
  ['interbelic',   'Extension from the 1930s of the Adevărul Newspaper Headquarter on Constantin Mille street.jpg', 'Sediul ziarului „Adevărul” din București, extindere de ani 1930.'],
  ['razboi2',      'Beszterce, Fa utca (strada Liviu Rebreanu), 1940. szeptember 8..jpg', 'Bistrița, 8 septembrie 1940: intrarea trupelor maghiare în nordul Transilvaniei cedat prin Dictatul de la Viena.'],
  ['harti1',       'Ethnographic map Ami Boué, 1847.jpg', 'Harta etnografică a lui Ami Boué, 1847, una dintre primele cartografieri etnice ale sud-estului european.'],
]

mkdirSync(RAD+'ilustratii/fisiere', {recursive:true})
const manifest = []
for (const [cap, fisier, legenda] of ALESE) {
  const m = index[fisier]
  if (!m) { console.log('LIPSĂ  ' + cap.padEnd(14) + fisier.slice(0,60)); continue }
  const ext = (fisier.match(/\.(jpe?g|png)$/i)||['.jpg'])[0].toLowerCase()
  const local = 'ilustratii/fisiere/' + cap + ext
  if (!existsSync(RAD+local)) {
    try {
      execFileSync('curl', ['-sSL','--max-time','120','-A','IstoriaRomaniei-carte/1.0 (mitza0704@gmail.com)',
        '-o', RAD+local, m.url], {stdio:'pipe'})
    } catch(e) { console.log('EȘEC   ' + cap); continue }
  }
  const dim = execFileSync('bash',['-c',`stat -c%s "${RAD+local}"`]).toString().trim()
  manifest.push({ cap, local, legenda, ...m })
  console.log('✓ ' + cap.padEnd(14) + (Number(dim)/1024).toFixed(0).padStart(6) + ' KB  ' + (m.tipLicenta||'').padEnd(16) + m.autor.slice(0,40))
}
writeFileSync(RAD+'ilustratii/manifest.json', JSON.stringify(manifest,null,1))
console.log('\n' + manifest.length + ' ilustrații descărcate')
