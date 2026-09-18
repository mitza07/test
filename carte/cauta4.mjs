import { writeFileSync, readFileSync } from 'fs'
import { dinCautare, dinCategorie } from './cauta.mjs'
const RAD = new URL('./', import.meta.url).pathname
const T=[
 {k:'neolitic',q:['Cucuteni ceramic vessel museum','Hamangia thinker statuette','Neolithic figurine Romania museum','Cucuteni Trypillia pottery','Vinca tablet Tartaria','Karanovo Gumelnita idol','prehistoric pottery Romania National Museum'],cat:['Cucuteni–Trypillia culture','Prehistoric pottery']},
 {k:'femei',q:['Queen Marie of Romania 1916','Marie of Edinburgh portrait','Elisabeth of Wied queen consort','Romanian peasant woman 1900 photograph','Elena Ceausescu 1975'],cat:['Marie of Edinburgh','Elisabeth of Wied']},
 {k:'costume',q:['Romanian peasant costume lithograph 19th century','Wallachian costume engraving','Transylvanian costume plate 1860','Moldavian boyar costume engraving','Szekely costume plate'],cat:['Folk costumes of Romania','Historical costume plates']},
 {k:'harti-etnice',q:['ethnographic map Hungary 1910 Teleki','carte ethnographique Europe orientale','Sprachenkarte Osterreich-Ungarn','ethnographical map Balkan peninsula 1918','Kocsis ethnic map Transylvania'],cat:['Ethnographic maps','Maps of the Austro-Hungarian Empire']},
 {k:'harti-razboi',q:['carte du front roumain 1917','Karte Rumanien 1916 Weltkrieg','map Romania 1919 peace conference','Hungary Trianon map 1920 territorial','map Bessarabia Bukovina 1940'],cat:['Maps of Romania','World War I maps']},
 {k:'sport',q:['Nadia Comaneci gymnast','Romanian Olympic team historic','Ilie Nastase 1973','Romania football 1930 World Cup'],cat:['Sport in Romania']},
 {k:'mancare',q:['Romanian food traditional dish','sarmale','mamaliga polenta Romanian','Romanian wine cellar'],cat:['Food of Romania']},
 {k:'evrei',q:['synagogue Romania interior','Choral Temple Bucharest','Jewish Romania historical photograph','Iasi pogrom memorial','Sighet Elie Wiesel house'],cat:['Synagogues in Romania','Jewish history of Romania']},
]
const rez=[]
for(const t of T){
  const v=new Set(); let out=[]
  for(const c of (t.cat||[])) for(const x of dinCategorie(c,{lim:40})) if(!v.has(x.fisier)){v.add(x.fisier);out.push(x)}
  for(const q of t.q) for(const x of dinCautare(q,{lim:30})) if(!v.has(x.fisier)){v.add(x.fisier);out.push(x)}
  out.sort((a,b)=>(b.latime*b.inaltime)-(a.latime*a.inaltime))
  rez.push({cheie:t.k,gasite:out})
  console.log(t.k.padEnd(14), String(out.length).padStart(3), '('+out.filter(x=>x.tipLicenta==='domeniu public').length+' PD)  ', out.slice(0,2).map(x=>x.fisier.slice(0,40)).join(' | '))
}
const d=JSON.parse(readFileSync(RAD+'ilustratii/pentru-alegere.json','utf8'))
for(const r of rez) if(r.gasite.length) d[r.cheie]={titlu:r.cheie, candidati:r.gasite.slice(0,70).map((g,i)=>({nr:i,fisier:g.fisier,dim:g.latime+'x'+g.inaltime,data:g.data||'',autor:(g.autor||'').slice(0,60),licenta:g.tipLicenta,desc:(g.descriere||'').slice(0,180)}))}
writeFileSync(RAD+'ilustratii/pentru-alegere.json', JSON.stringify(d,null,1))
writeFileSync(RAD+'ilustratii/candidati-noi2.json', JSON.stringify(rez,null,1))
console.log('\ntotal:', rez.reduce((n,r)=>n+r.gasite.length,0))
