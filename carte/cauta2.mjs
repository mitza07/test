/* A doua trecere: descopera categoriile reale prin cautare, apoi extrage din ele. */
import { writeFileSync, readFileSync } from 'fs'
import { json, dinCategorie, dinCautare } from './cauta.mjs'
const RAD = new URL('./', import.meta.url).pathname

const categoriiPentru = (q, lim = 6) => {
  const r = json({ action: 'query', list: 'search', srsearch: q, srnamespace: '14', srlimit: String(lim) })
  return (r?.query?.search || []).map(x => x.title.replace(/^Category:/, ''))
}

const GOLURI = [
  { cheie: 'cruciada', cauta: ['Voroneț', 'Stephen the Great', 'Vlad Țepeș', 'painted churches Moldavia', 'John Hunyadi'],
    q: ['Voronet monastery fresco', 'Sucevita monastery painted', 'Moldovita monastery fresco', 'Humor monastery'] },
  { cheie: 'interbelic', cauta: ['Interwar Romania', 'Bucharest 1930s', 'Constantin Brâncuși'],
    q: ['Brancusi Endless Column Targu Jiu', 'Bucharest Calea Victoriei 1930', 'Romania 1930s photograph'] },
  { cheie: 'razboi2', cauta: ['Romania in World War II', 'Second Vienna Award', 'Holocaust in Romania'],
    q: ['Romanian army 1941', 'Ploiesti bombing 1943', 'Iasi pogrom 1941'] },
  { cheie: 'harti-1700', cauta: ['18th-century maps of Romania', '18th-century maps of Wallachia', '18th-century maps of Moldavia', '18th-century maps of Transylvania'],
    q: ['Descriptio Moldaviae map Cantemir', 'Homann Walachia Moldavia map'] },
  { cheie: 'harti-1800', cauta: ['19th-century maps of Romania', '19th-century maps of Wallachia', '19th-century maps of Moldavia', 'Maps of the Principality of Romania'],
    q: ['Danubian Principalities map 1856', 'Romania map 1878'] },
  { cheie: 'harti-1900', cauta: ['20th-century maps of Romania', 'Greater Romania', 'Maps of the history of Romania'],
    q: ['Romania map 1920', 'Romania 1940 territorial losses map'] },
  { cheie: 'harti-1400', cauta: ['15th-century maps of Romania', '16th-century maps of Romania', '17th-century maps of Romania'],
    q: ['Ortelius Daciarum Moesiarumque', 'Mercator Transylvania 1585'] },
  { cheie: 'intemeiere', cauta: ['Curtea de Argeș', 'Cozia Monastery', 'Princely Church Curtea de Argeș'],
    q: ['Curtea de Arges princely church fresco', 'Cozia monastery Mircea'] },
  { cheie: 'dacia-romana', cauta: ['Roman Dacia', 'Ulpia Traiana Sarmizegetusa', 'Tropaeum Traiani', 'Roman mosaics in Romania'],
    q: ['Roman Dacia artifacts museum', 'Adamclisi metope'] },
  { cheie: 'migratii', cauta: ['Pietroasele Treasure', 'Treasure of Nagyszentmiklós', 'Apahida'],
    q: ['Pietroasele gold eagle brooch', 'Sannicolau Mare treasure gold'] },
]

const rez = []
for (const g of GOLURI) {
  const vazut = new Set(); let out = []
  const cats = new Set()
  for (const c of g.cauta) { cats.add(c); for (const d of categoriiPentru(c, 4)) cats.add(d) }
  for (const c of cats) for (const x of dinCategorie(c, { lim: 50 })) if (!vazut.has(x.fisier)) { vazut.add(x.fisier); out.push(x) }
  for (const q of (g.q || [])) for (const x of dinCautare(q, { lim: 30 })) if (!vazut.has(x.fisier)) { vazut.add(x.fisier); out.push(x) }
  out.sort((a, b) => (b.latime * b.inaltime) - (a.latime * a.inaltime))
  rez.push({ cheie: g.cheie, gasite: out })
  console.log(`${g.cheie.padEnd(14)} ${String(out.length).padStart(3)} acceptate  (${out.filter(x=>x.tipLicenta==='domeniu public').length} PD)  din ${cats.size} categorii`)
}
writeFileSync(RAD + 'ilustratii/candidati-goluri.json', JSON.stringify(rez, null, 1))
console.log('\ntotal nou:', rez.reduce((n, r) => n + r.gasite.length, 0))
