/* ===========================================================================
   Barele comparative ale cartii: ce se compara, si din ce fraza vine.
   ---------------------------------------------------------------------------
   Ca la tabele-capitol.mjs: nicio cifra nu vine din afara cartii. Fiecare rand
   isi poarta fraza din care e luat, si "node bare-carte.mjs" verifica sa se
   gaseasca in sectiunea lui.
   =========================================================================== */

const PIERDERI = {
  id: 'b-pierderi',
  sectiune: 'razboi2',
  titlu: 'Unde s-a pierdut armata română, 1941–1945',
  unitate: 'oameni scoși din luptă',
  jos: 'Toate valorile sunt oameni scoși din luptă — morți, răniți, dispăruți, prizonieri —, nu morți; ' +
    'singura excepție sunt cei circa 21.000 de morți ai campaniei din vest, pe care cartea îi dă separat. ' +
    'Mustața de la Cotul Donului este intervalul pe care îl dă cartea, iar bara goală din spatele ei sunt ' +
    'oamenii angajați. Ultimul rând stă sub filet fiindcă nu e o pierdere de front.',
  randuri: [
    { et: 'Operațiunea München', sub: '2–26 iulie 1941', v: 20000,
      izvor: 'cu prețul a peste 20.000' },
    { et: 'Asediul Odesei', sub: '8 august – 16 octombrie 1941', v: 90000,
      izvor: 'a costat armata română aproximativ 90.000 de oameni' },
    { et: 'Cotul Donului', sub: '19 noiembrie 1942 – februarie 1943', v: 155000,
      de: 145000, la: 160000, din: 228000, dinEt: 'din circa 228.000 angajați',
      izvor: 'aproximativ 155.000 de militari' },
    { et: 'Campania din vest', sub: 'august 1944 – mai 1945', v: 170000,
      dinEt: 'din care circa 21.000 de morți',
      izvor: 'aproximativ 170.000 de pierderi' },
    { et: 'Dezarmați de Armata Roșie', sub: 'după 23 august 1944 · nu în luptă', v: 130000, rupt: true,
      izvor: 'aproximativ 130.000 de militari' },
  ],
}

export const BARE = [PIERDERI]
export const bareleSectiunii = (id) => BARE.filter((b) => b.sectiune === id)

/* --- verificarea ---------------------------------------------------------- */
if (process.argv[1] && process.argv[1].endsWith('bare-carte.mjs')) {
  const { readFileSync } = await import('fs')
  const c = JSON.parse(readFileSync(new URL('./continut.json', import.meta.url), 'utf8'))
  let rele = 0
  for (const b of BARE) {
    const s = [...(c.capitole || []), ...(c.teme || [])].find((x) => x.id === b.sectiune)
    /* cifrele pot fi si in alt capitol al aceleiasi carti: se cauta in tot */
    const tot = [...(c.capitole || []), ...(c.teme || [])].flatMap((x) => [
      ...(x.sectiuni || []).flatMap((y) => y.paragrafe || []),
      ...(x.cronologie || []).map((y) => `${y.an} ${y.eveniment}`),
      ...(x.cifre || []).map((y) => `${y.valoare} ${y.eticheta} ${y.nota}`),
    ]).join(' ')
    if (!s) { console.log(`✗ ${b.id}: secțiunea „${b.sectiune}” nu există`); rele++; continue }
    const lipsa = b.randuri.filter((r) => !tot.includes(r.izvor))
    if (lipsa.length) { rele++; console.log(`✗ ${b.id}: nu se găsesc în carte: ${lipsa.map((r) => `„${r.izvor}”`).join(', ')}`) }
    else console.log(`✓ ${b.id.padEnd(14)} ${b.randuri.length} rânduri, fiecare cu fraza lui în carte`)
  }
  process.exit(rele ? 1 : 0)
}
