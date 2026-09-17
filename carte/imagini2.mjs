import { writeFileSync, readFileSync } from 'fs'
import { execFileSync } from 'child_process'
const RAD = new URL('./', import.meta.url).pathname
const UA = 'IstoriaRomaniei-carte/1.0 (contact: mitza0704@gmail.com)'
const API = 'https://commons.wikimedia.org/w/api.php'
const cere = (p) => JSON.parse(execFileSync('curl', ['-sS','--max-time','45','-A',UA,
  API + '?' + new URLSearchParams({ format:'json', formatversion:'2', ...p })], { maxBuffer: 64e6 }).toString())
const curata = (h) => String(h||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/\s+/g,' ').trim()
function verdict(em){
  const t = ((em?.LicenseShortName?.value||'')+' '+(em?.UsageTerms?.value||'')).toLowerCase()
  if(/share.?alike|by-sa|gfdl|gnu free/.test(t)) return {ok:false}
  if(/non.?commercial|by-nc/.test(t)) return {ok:false}
  if(/public domain|^pd\b|pd-|cc0|no restrictions/.test(t)) return {ok:true,tip:'domeniu public',licenta:curata(em?.LicenseShortName?.value)||'domeniu public'}
  if(/cc by(?!-)|creative commons attribution(?! share)/.test(t)) return {ok:true,tip:'CC BY',licenta:curata(em?.LicenseShortName?.value)}
  return {ok:false}
}
function extrage(pagini){
  const out=[]
  for(const p of pagini||[]){
    const ii=p.imageinfo?.[0]; if(!ii) continue
    if(!/^image\/(jpeg|png)$/.test(ii.mime||'')) continue
    if((ii.width||0)<800) continue
    const em=ii.extmetadata||{}; const v=verdict(em); if(!v.ok) continue
    out.push({fisier:p.title.replace(/^File:/,''), pagina:'https://commons.wikimedia.org/wiki/'+encodeURIComponent(p.title),
      url:ii.url, latime:ii.width, inaltime:ii.height,
      autor:curata(em.Artist?.value)||'(autor neidentificat)',
      data:curata(em.DateTimeOriginal?.value)||curata(em.DateTime?.value)||'',
      descriere:curata(em.ImageDescription?.value).slice(0,200),
      licenta:v.licenta, tipLicenta:v.tip})
  }
  return out
}
const dinCategorie = (cat,lim=30)=>{ try{ return extrage(cere({action:'query',generator:'categorymembers',
  gcmtitle:'Category:'+cat, gcmtype:'file', gcmlimit:String(lim), prop:'imageinfo',
  iiprop:'url|extmetadata|size|mime'}).query?.pages) }catch{ return [] } }
const dinCautare = (q,lim=20)=>{ try{ return extrage(cere({action:'query',generator:'search',
  gsrsearch:'filetype:bitmap '+q, gsrnamespace:'6', gsrlimit:String(lim), prop:'imageinfo',
  iiprop:'url|extmetadata|size|mime'}).query?.pages) }catch{ return [] } }

const TINTE = [
  {cap:'preistorie', cat:['Hallstatt culture','Archaeological museums in Romania'], q:['Cotofenesti helmet','Hamangia Thinker']},
  {cap:'geti', cat:['Agighiol treasure','Thracian art'], q:['Peretu treasure','Getic silver helmet']},
  {cap:'burebista', cat:['Sarmizegetusa Regia','Dacian fortresses of the Orastie Mountains'], q:['Koson coin','Dacian bracelet']},
  {cap:'decebal', cat:["Trajan's Column",'Reliefs of Trajans Column'], q:['Cichorius Trajan column plate','Trajan column cast']},
  {cap:'dacia-romana', cat:['Tropaeum Traiani','Roman Dacia'], q:['Ulpia Traiana Sarmizegetusa ruins','Roman inscription Dacia']},
  {cap:'migratii', cat:['Pietroasele Treasure','Migration Period'], q:['Cloșca cu puii de aur','Gothic fibula gold Romania']},
  {cap:'voievodate', cat:['Chronicon Pictum','Fortified churches in Transylvania'], q:['Chronicon Pictum illumination','Andreanum']},
  {cap:'comunism1', cat:['Communist Romania','Michael I of Romania'], q:['Romania 1947 abdication','Danube Black Sea Canal 1950s']},
  {cap:'revolutia', cat:['Romanian Revolution of 1989'], q:['Romanian revolution 1989 Bucharest','Timisoara 1989']},
  {cap:'contemporan', cat:['2017–2019 Romanian protests','Romania in the European Union'], q:['Piata Victoriei protest 2017']},
  {cap:'harti-vechi2', cat:['Old maps of Romania','Old maps of Wallachia','Old maps of Moldavia'], q:['Dacia antiqua map','Valachia map 1700']},
]
const rez=[]
for(const t of TINTE){
  let g=[]
  for(const c of t.cat) g=g.concat(dinCategorie(c))
  for(const q of t.q) if(g.length<6) g=g.concat(dinCautare(q))
  const vazut=new Set(); g=g.filter(x=>!vazut.has(x.fisier)&&vazut.add(x.fisier))
  rez.push({cap:t.cap,gasite:g})
  console.log(t.cap.padEnd(15), String(g.length).padStart(2), 'acceptate ', g.slice(0,2).map(x=>x.fisier.slice(0,46)).join(' | '))
}
writeFileSync(RAD+'ilustratii/candidati2.json', JSON.stringify(rez,null,1))
console.log('\ntotal', rez.reduce((n,r)=>n+r.gasite.length,0))
