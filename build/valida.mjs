import { REGIUNI, FRONTIERE, ZONE, ABATERI } from './geo.js'
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
function seg(p1,p2,p3,p4){
  const d=(p2[0]-p1[0])*(p4[1]-p3[1])-(p2[1]-p1[1])*(p4[0]-p3[0])
  if(Math.abs(d)<1e-12) return false
  const t=((p3[0]-p1[0])*(p4[1]-p3[1])-(p3[1]-p1[1])*(p4[0]-p3[0]))/d
  const u=((p3[0]-p1[0])*(p2[1]-p1[1])-(p3[1]-p1[1])*(p2[0]-p1[0]))/d
  return t>1e-9&&t<1-1e-9&&u>1e-9&&u<1-1e-9
}
function check(name,r){
  const n=r.length, probs=[]
  let maxJump=0, jumpAt=-1
  for(let i=0;i<n;i++){const d=dist(r[i],r[(i+1)%n]); if(d>maxJump){maxJump=d;jumpAt=i}}
  // self intersection
  let xs=0, ex=null
  for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){
    if(i===0&&j===n-1) continue
    if(seg(r[i],r[(i+1)%n],r[j],r[(j+1)%n])){xs++; if(!ex)ex=[i,j,r[i],r[j]]}
  }
  // area (shoelace, deg^2)
  let a=0; for(let i=0;i<n;i++){const p=r[i],q=r[(i+1)%n]; a+=p[0]*q[1]-q[0]*p[1]}
  a=Math.abs(a/2)
  const km2 = Math.round(a*111.32*111.32*Math.cos(45.8*Math.PI/180))
  if(xs) probs.push(`AUTOINTERSECTII: ${xs} (prima: laturile ${ex[0]}-${ex[1]}, la ${JSON.stringify(ex[2])} / ${JSON.stringify(ex[3])})`)
  if(maxJump>1.6) probs.push(`SALT MARE ${maxJump.toFixed(2)}° la indexul ${jumpAt}: ${JSON.stringify(r[jumpAt])} -> ${JSON.stringify(r[(jumpAt+1)%n])}`)
  console.log(`${probs.length?'✗':'✓'} ${name.padEnd(26)} ${String(n).padStart(3)} pct  ~${String(km2).padStart(7)} km²  ${probs.join(' | ')}`)
}
console.log('--- REGIUNI ---')
for(const k in REGIUNI) check(k, REGIUNI[k].ring)
console.log('--- FRONTIERE ---')
for(const k in FRONTIERE) check(k, FRONTIERE[k])
console.log('--- ZONE ---')
for(const k in ZONE) check(k, ZONE[k])

/* nodurile de apa trebuie sa stea pe apa: altfel hotarul croit din rau porneste
   de alaturi si intre doua regiuni vecine ramane o dunga alba */
console.log('--- NODURI PE APA ---')
/* Un nod de apa poate fi capat pe mai multe cursuri deodata: gura Prutului e si
   pe Prut, si pe Dunare. Pe cursul lui propriu trebuie sa cada exact; pe celalalt
   are voie sa ramana la cativa kilometri, fiindca cele doua fisiere de
   hidrografie nu impart varful de la confluenta. Se cere deci ca fiecare nod sa
   stea exact pe cel putin un curs. */
const peNod = new Map()
for (const a of ABATERI) {
  const v = peNod.get(a.nod)
  if (!v || a.km < v.km) peNod.set(a.nod, a)
}
let rele = 0
for (const [nod, a] of peNod) {
  if (a.km <= 0.3) continue
  rele++
  console.log(`✗ ${nod} nu sta pe niciun curs: cel mai aproape e "${a.apa}", la ${a.km.toFixed(2)} km`)
}
const punti = ABATERI.filter((a) => a.km > 0.3).length
console.log(`${rele ? '✗' : '✓'} ${peNod.size} noduri de apa, toate pe curs ` +
  `(abaterea cea mai mare ${Math.max(...[...peNod.values()].map((a) => a.km)).toFixed(3)} km); ` +
  `${punti} capete de segment trec peste o confluenta`)
