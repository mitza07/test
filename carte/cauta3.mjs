import { writeFileSync, readFileSync } from 'fs'
import { json, dinCategorie, dinCautare } from './cauta.mjs'
const RAD = new URL('./', import.meta.url).pathname
const cats=(q,l=6)=>(json({action:'query',list:'search',srsearch:q,srnamespace:'14',srlimit:String(l)})?.query?.search||[]).map(x=>x.title.replace(/^Category:/,''))
const T=[
 {k:'neolitic',c:['Cucuteni culture','Hamangia culture','Vinča symbols','Neolithic Romania','Tărtăria tablets'],
  q:['Cucuteni pottery painted','Thinker of Hamangia Cernavoda','Tartaria tablets','Gumelnita figurine','Varna gold necropolis']},
 {k:'aromani',c:['Aromanians','Moscopole','Aromanian costumes'],
  q:['Aromanian traditional costume','Moscopole ruins Albania','Vlachs Balkans engraving']},
 {k:'evrei',c:['Synagogues in Romania','Jewish cemeteries in Romania','History of the Jews in Romania'],
  q:['Great Synagogue Bucharest','Iasi synagogue','Jewish quarter Bucharest old photograph','Sighet Jewish memorial']},
 {k:'romi',c:['Romani people in Romania','Romani slavery'],
  q:['Romani slavery Wallachia engraving','Gypsy camp Romania 19th century','Romani traditional Romania']},
 {k:'stiinta',c:['Henri Coandă','Traian Vuia','Aurel Vlaicu','Nicolae Paulescu','Emil Racoviță'],
  q:['Coanda 1910 aircraft','Traian Vuia flying machine 1906','Vlaicu aeroplane','Belgica antarctic expedition 1897']},
 {k:'femei',c:['Marie of Romania','Elisabeth of Wied','Women of Romania'],
  q:['Queen Marie of Romania portrait','Carmen Sylva','Romanian women traditional costume']},
 {k:'sport',c:['Nadia Comăneci','Romania at the Olympics','Gheorghe Hagi'],
  q:['Nadia Comaneci 1976 Montreal','Steaua Bucuresti 1986 European Cup','Ilie Nastase tennis']},
 {k:'orase',c:['Old Bucharest','Historic centre of Sighișoara','Sibiu','Cluj-Napoca historical'],
  q:['Bucharest Calea Victoriei 1900','Sighisoara clock tower','Sibiu large square','Brasov council square']},
 {k:'mediu',c:['Danube Delta','Roșia Montană','Carpathian forests'],
  q:['Danube Delta pelicans','Rosia Montana landscape','Carpathian primeval forest','Retezat national park']},
 {k:'moldova-rep',c:['Chișinău','History of Moldova','Transnistria'],
  q:['Chisinau historical photograph','Bessarabia 1918','Moldova independence 1991']},
 {k:'mancare',c:['Cuisine of Romania','Romanian wine'],
  q:['Romanian traditional food','Romanian vineyard','mamaliga']},
 {k:'harti-etnice',c:['Ethnographic maps of the Balkans','Maps of Austria-Hungary','Linguistic maps of Europe'],
  q:['ethnographic map Austria-Hungary 1910','Romanian ethnographic map 1919','Balkans ethnic map 1918','Emmanuel de Martonne map']},
 {k:'harti-razboi',c:['Maps of World War I','Maps of the Treaty of Trianon','Maps of World War II Europe'],
  q:['Romania front 1916 map','Trianon Hungary map 1920','Romania 1940 map territorial losses','Bessarabia 1940 map']},
 {k:'costume',c:['Folk costumes of Romania','Romanian traditional clothing'],
  q:['Romanian folk costume 19th century engraving','ie Romanian blouse','Transylvanian Saxon costume']},
]
const rez=[]
for(const t of T){
  const v=new Set(); let out=[]
  const C=new Set(t.c); for(const c of t.c) for(const d of cats(c,3)) C.add(d)
  for(const c of C) for(const x of dinCategorie(c,{lim:40})) if(!v.has(x.fisier)){v.add(x.fisier);out.push(x)}
  for(const q of t.q) for(const x of dinCautare(q,{lim:25})) if(!v.has(x.fisier)){v.add(x.fisier);out.push(x)}
  out.sort((a,b)=>(b.latime*b.inaltime)-(a.latime*a.inaltime))
  rez.push({cheie:t.k,gasite:out})
  console.log(t.k.padEnd(14), String(out.length).padStart(3), '('+out.filter(x=>x.tipLicenta==='domeniu public').length+' PD)')
}
const d=JSON.parse(readFileSync(RAD+'ilustratii/pentru-alegere.json','utf8'))
for(const r of rez) d[r.cheie]={titlu:r.cheie, candidati:r.gasite.slice(0,70).map((g,i)=>({nr:i,fisier:g.fisier,dim:g.latime+'x'+g.inaltime,data:g.data||'',autor:(g.autor||'').slice(0,60),licenta:g.tipLicenta,desc:(g.descriere||'').slice(0,180)}))}
writeFileSync(RAD+'ilustratii/pentru-alegere.json', JSON.stringify(d,null,1))
writeFileSync(RAD+'ilustratii/candidati-noi.json', JSON.stringify(rez,null,1))
console.log('\ntotal nou:', rez.reduce((n,r)=>n+r.gasite.length,0))
