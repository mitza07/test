import { REGIUNI, FRONTIERE, ZONE } from './geo.js'
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
