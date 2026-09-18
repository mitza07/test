/* ===========================================================================
   Indreptari facute de mana peste continutul cules de workflow-uri.
   ---------------------------------------------------------------------------
   continut.json se reface din jurnalele workflow-urilor cu "node extrage.mjs".
   O corectura scrisa direct in el s-ar pierde la prima refacere. Aici stau deci
   indreptarile care nu vin din cercetare, ci din citirea cartii ca intreg:
   locurile in care doua capitole spun altfel acelasi lucru.

   Fiecare indreptare isi spune motivul. Niciuna nu aduce un fapt nou: toate
   aleg intre doua forme care erau deja in carte, sau scriu intr-un camp ce
   proza spunea deja alaturi.

   Se aplica la sfarsitul lui extrage.mjs si se pot verifica oricand cu
   "node indreptari.mjs".
   =========================================================================== */

export const INDREPTARI = [
  {
    unde: 'geografie', cine: 'Apollodor din Damasc', camp: 'ani',
    din: 'cca 60 - cca 130 d.Hr.', in: 'cca 50 - cca 130',
    de_ce: 'Aceeasi persoana era datata "cca 50" in capitolul despre Decebal, ' +
      'unde are fisa lui principala, si "cca 60" in tema geografica. Amandoua ' +
      'sunt aproximari, dar cartea nu poate da doua date nasterii aceluiasi om ' +
      'la treizeci de pagini distanta. Se pastreaza forma din capitolul unde ' +
      'podul de la Drobeta e subiect, nu pomenire.',
  },
  {
    unde: 'voievodate', cine: 'Universitas Saxonum', camp: 'ani',
    din: 'temeiuri în 1224, constituită formal în 1486', in: '1224–1876',
    de_ce: 'Aceeasi institutie purta trei datari deosebite in trei sectiuni: ' +
      '"temeiuri în 1224, constituită formal în 1486", "1224–1876" si ' +
      '"sec. XIII–1876". Niciuna nu e gresita — 1224 e Diploma andreana, 1486 ' +
      'confirmarea lui Matia Corvin, 1876 desfiintarea — dar banda vietilor o ' +
      'aseza in trei locuri deosebite pe trei benzi, ca pe trei institutii. ' +
      'Campul "ani" poarta de-acum intinderea institutiei; ce s-a intamplat in ' +
      '1224 si in 1486 scrie oricum in proza de alaturi, la toate trei.',
  },
  {
    unde: 'orase', cine: 'Universitas Saxonum', camp: 'ani',
    din: 'sec. XIII–1876', in: '1224–1876',
    de_ce: 'Acelasi motiv. "sec. XIII" si "1224" spun acelasi lucru, dar unul ' +
      'il spune cu o suta de ani de latime.',
  },
]

/** Le aplica pe o structura de continut; intoarce cate au prins. */
export function indreapta(continut) {
  let prinse = 0
  const ratate = []
  for (const x of INDREPTARI) {
    const s = [...(continut.capitole || []), ...(continut.teme || [])].find((c) => c.id === x.unde)
    const f = s && (s.figuri || []).find((g) => g.nume === x.cine)
    if (!f) { ratate.push({ ...x, cauza: 'nu s-a găsit fișa' }); continue }
    if (f[x.camp] === x.in) { prinse++; continue }      /* deja aplicata */
    if (f[x.camp] !== x.din) { ratate.push({ ...x, cauza: `scrie acum „${f[x.camp]}”` }); continue }
    f[x.camp] = x.in
    prinse++
  }
  return { prinse, ratate }
}

if (process.argv[1] && process.argv[1].endsWith('indreptari.mjs')) {
  const { readFileSync } = await import('fs')
  const c = JSON.parse(readFileSync(new URL('./continut.json', import.meta.url), 'utf8'))
  const { prinse, ratate } = indreapta(c)
  console.log(`${prinse}/${INDREPTARI.length} îndreptări aplicate`)
  for (const r of ratate) console.log(`✗ ${r.unde} · ${r.cine} · ${r.camp}: ${r.cauza}`)
  /* Si o verificare de intreg: aceeasi persoana, aceiasi ani peste tot. Se
     compara insa ce iese la citire, nu cum e scris: "1916-1989" si
     "1916 – 1989" dau acelasi interval, iar tipografic() le face oricum sa
     arate la fel in pagina. Ce ramane deosebit dupa citire e o nepotrivire
     adevarata — banda ar aseza acelasi om in doua locuri. */
  const { citesteAni } = await import('./data.mjs')
  const cheie = (a) => { const d = citesteAni(a); return d ? `${d.de}…${d.la}${d.deschis ? '→' : ''}` : 'necitit' }
  const pe = new Map()
  for (const s of [...(c.capitole || []), ...(c.teme || [])])
    for (const f of s.figuri || []) {
      const v = pe.get(f.nume) || new Map()
      const k = cheie(f.ani)
      v.set(k, [...(v.get(k) || []), `${s.id}: „${f.ani}”`])
      pe.set(f.nume, v)
    }
  const certate = [...pe.entries()].filter(([, v]) => v.size > 1)
  console.log(`\n${certate.length} persoane sau instituții pe care cartea le așază în locuri diferite pe axă:`)
  for (const [nume, v] of certate)
    console.log(`  · ${nume}\n      ` + [...v.values()].map((x) => x.join(' / ')).join('\n      '))
  process.exit(ratate.length ? 1 : 0)
}
