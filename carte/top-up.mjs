import { writeFileSync, readFileSync } from 'fs'
import { json, dinCategorie, dinCautare } from './cauta.mjs'
const RAD = new URL('./', import.meta.url).pathname
const cats = (q,l=8) => (json({action:'query',list:'search',srsearch:q,srnamespace:'14',srlimit:String(l)})?.query?.search||[]).map(x=>x.title.replace(/^Category:/,''))

const TINTE = [
  { cheie:'fresce', cauta:['Voroneț monastery','Sucevița Monastery','Moldovița Monastery','Humor Monastery','Painted churches of northern Moldavia','Frescoes in Romania'],
    q:['Voronet Last Judgement fresco','Sucevita monastery frescoes exterior','Moldovita siege of Constantinople fresco','Humor monastery exterior fresco','Arbore church fresco'] },
  { cheie:'aur-dacic', cauta:['Dacian bracelets','Gold of Dacia','Treasures of Romania','National Museum of Romanian History'],
    q:['Dacian gold spiral bracelet Sarmizegetusa','Cotofenesti gold helmet','Pietroasa gold','Romanian treasure gold museum'] },
  { cheie:'brancusi', cauta:['Constantin Brâncuși','Târgu Jiu sculptural ensemble'],
    q:['Brancusi Endless Column','Brancusi Table of Silence','Brancusi Gate of the Kiss'] },
  { cheie:'documente', cauta:['Manuscripts of Romania','Old Romanian books','Cyrillic manuscripts'],
    q:['Neacsu letter 1521','Coresi print 16th century','Biblia de la Bucuresti 1688','Cazania lui Varlaam 1643'] },
  { cheie:'unirea1918', cauta:['Great Union of 1918','Union of Transylvania with Romania','Coronation of Ferdinand I'],
    q:['Alba Iulia 1 December 1918','Marea Unire 1918 photograph','coronation Alba Iulia 1922'] },
  { cheie:'pictura', cauta:['Nicolae Grigorescu','Theodor Aman','Romanian paintings','Ion Andreescu'],
    q:['Grigorescu Rosia painting','Theodor Aman Unirea painting','Nicolae Grigorescu Attack at Smardan'] },
  { cheie:'cetati', cauta:['Castles in Romania','Peleș Castle','Corvin Castle','Fortified churches in Transylvania'],
    q:['Corvin castle Hunedoara','Peles castle interior','Sighisoara historic centre','Rasnov fortress'] },
  { cheie:'biserici-lemn', cauta:['Wooden churches in Maramureș','Wooden churches of Romania'],
    q:['Maramures wooden church Barsana','Ieud wooden church'] },
]
const rez=[]
for(const t of TINTE){
  const v=new Set(); let out=[]
  const C=new Set(t.cauta); for(const c of t.cauta) for(const d of cats(c,4)) C.add(d)
  for(const c of C) for(const x of dinCategorie(c,{lim:50})) if(!v.has(x.fisier)){v.add(x.fisier);out.push(x)}
  for(const q of t.q) for(const x of dinCautare(q,{lim:30})) if(!v.has(x.fisier)){v.add(x.fisier);out.push(x)}
  out.sort((a,b)=>(b.latime*b.inaltime)-(a.latime*a.inaltime))
  rez.push({cheie:t.cheie,gasite:out})
  console.log(t.cheie.padEnd(14), String(out.length).padStart(3), 'acceptate ('+out.filter(x=>x.tipLicenta==='domeniu public').length+' PD) din', C.size, 'categorii')
}
const d=JSON.parse(readFileSync(RAD+'ilustratii/pentru-alegere.json','utf8'))
for(const r of rez) d[r.cheie]={titlu:r.cheie, candidati:r.gasite.slice(0,70).map((g,i)=>({nr:i,fisier:g.fisier,dim:g.latime+'x'+g.inaltime,data:g.data||'',autor:(g.autor||'').slice(0,60),licenta:g.tipLicenta,desc:(g.descriere||'').slice(0,180)}))}
writeFileSync(RAD+'ilustratii/pentru-alegere.json', JSON.stringify(d,null,1))
writeFileSync(RAD+'ilustratii/candidati-topup.json', JSON.stringify(rez,null,1))
console.log('\ntotal nou:', rez.reduce((n,r)=>n+r.gasite.length,0))
