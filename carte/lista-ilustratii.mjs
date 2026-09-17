import { readFileSync, writeFileSync } from 'fs'
const RAD = new URL('./', import.meta.url).pathname
const toate = [...JSON.parse(readFileSync(RAD+'ilustratii/candidati.json','utf8')),
               ...JSON.parse(readFileSync(RAD+'ilustratii/candidati2.json','utf8'))]
const idx = {}
for (const r of toate) for (const g of r.gasite) idx[g.fisier] = g
const gaseste = (frag) => Object.keys(idx).find(k => k.toLowerCase().includes(frag.toLowerCase()))

/* selecţia: capitol, fragment din numele fişierului, legenda din carte */
const SEL = [
  ['preistorie',   'Kronprinzenwerk',            'Câmpul de morminte de la Hallstatt, care a dat numele epocii. Gravură din „Kronprinzenwerk”, 1886–1902.'],
  ['geti',         'tumba principesca geta de Peretu', 'Coiful din mormântul princiar getic de la Peretu, secolul al IV-lea î.Hr.'],
  ['burebista',    'Koson - Münzkabinett',       'Stater de aur de tip KOΣΩN, bătut în spațiul dacic în secolul I î.Hr.'],
  ['burebista2',   'Murus Dacicus',              'Murus dacicus: blocuri fasonate legate prin bârne transversale, tehnica zidurilor din Munții Orăștiei.'],
  ['decebal',      'Coloana lui Traian (detaliu)','Detaliu din Columna lui Traian, izvorul vizual principal al războaielor daco-romane.'],
  ['dacia-romana', 'Milliarum of Aiton',         'Miliarul de la Aiton, 108 d.Hr.: cea dintâi atestare epigrafică a numelui Napoca.'],
  ['migratii',     'Tesaurul de la Petrosa',     'Tezaurul de la Pietroasele, „Cloșca cu puii de aur”, depus în secolul al IV-lea. Gravură din 1889.'],
  ['voievodate',   'Chronicon Pictum 002',       'Filă din Chronicon Pictum, c. 1360, cronica ce relatează înfrângerea lui Carol Robert în 1330.'],
  ['intemeiere',   '004 - Basarab I',            'Basarab I, întemeietorul Țării Românești.'],
  ['cruciada',     'Vlad Ţepeş, the Impaler',    'Portretul de la Ambras al lui Vlad Țepeș, copie de secol XVI după un original contemporan.'],
  ['otoman',       'Portret van Mihai Viteazul', 'Mihai Viteazul, gravură de epocă, 1601.'],
  ['fanarioti',    'Horja and Clocska',          'Horea și Cloșca, gravură de epocă, sfârșitul secolului al XVIII-lea.'],
  ['fanarioti2',   'Principati1786',             'Harta Principatelor, 1782, în ajunul războaielor ruso-austro-turce.'],
  ['renastere',    'Stancescu - Alexandru Ioan Cuza', 'Alexandru Ioan Cuza, 1859.'],
  ['regat',        'Frederic Storck - Carol I - 1900 - 01', 'Carol I, bust de Frederic Storck, 1900.'],
  ['mare-razboi',  'Romanian troops at Marasesti', 'Trupe române la Mărășești, vara anului 1917.'],
  ['interbelic',   'Adevărul Newspaper',         'Sediul ziarului „Adevărul” din București, extindere din anii 1930.'],
  ['razboi2',      'Beszterce, Fa utca',         'Bistrița, 8 septembrie 1940: intrarea trupelor maghiare în nordul Transilvaniei cedat prin Dictatul de la Viena.'],
  ['minoritati',   'Ethnographic map Ami Bou',   'Harta etnografică a lui Ami Boué, 1847, una dintre primele cartografieri etnice ale sud-estului european.'],
  ['brancoveanu',  'Hurezi Monastery',           'Mănăstirea Hurezi, ctitoria lui Constantin Brâncoveanu, 1690–1697.'],
]

const man = [], lipsa = []
for (const [cap, frag, legenda] of SEL) {
  const k = gaseste(frag)
  if (!k) { lipsa.push(cap + ' — ' + frag); continue }
  const m = idx[k]
  const ext = (k.match(/\.(jpe?g|png)$/i) || ['.jpg'])[0].toLowerCase()
  man.push({ cap, legenda, local: 'ilustratii/fisiere/' + cap + ext,
    fisier: k, url: m.url.split('?')[0], pagina: m.pagina,
    autor: m.autor, data: m.data, licenta: m.licenta, tipLicenta: m.tipLicenta,
    latime: m.latime, inaltime: m.inaltime })
}
writeFileSync(RAD + 'ilustratii/manifest.json', JSON.stringify(man, null, 1))

/* scriptul pe care il ruleaza utilizatorul de pe conexiunea lui */
const sh = `#!/bin/bash
# Descarcă cele ${man.length} ilustrații de domeniu public alese pentru volum.
# Rulează-l din folderul carte/ :  bash descarca-ilustratii.sh
# Wikimedia limitează rata pe IP-uri partajate; de pe o conexiune obișnuită merge instant.
set -e
mkdir -p ilustratii/fisiere
UA="IstoriaRomaniei-carte/1.0 (contact: mitza0704@gmail.com)"
${man.map((m) => `echo "→ ${m.cap}"
curl -sSL --max-time 180 -A "$UA" -o "${m.local}" "${m.url}"`).join('\n')}
echo
echo "Gata. Verific dimensiunile:"
ls -la ilustratii/fisiere/
`
writeFileSync(RAD + 'descarca-ilustratii.sh', sh)

console.log(`${man.length} ilustrații în manifest`)
if (lipsa.length) console.log('negăsite: ' + lipsa.join('; '))
console.log('\nlicențe: ' + [...new Set(man.map(m=>m.tipLicenta))].join(', '))
console.log('\n' + man.map(m => `  ${m.cap.padEnd(14)} ${m.tipLicenta.padEnd(16)} ${m.fisier.slice(0,52)}`).join('\n'))
