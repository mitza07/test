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

/* dacia-romana — Alburnus Maior: doua preturi din tablitele cerate */
const PRETURI = {
  id: 'b-preturi',
  sectiune: 'dacia-romana',
  titlu: 'Un om și un sezon de lucru, în denari',
  unitate: 'denari',
  jos: 'Cele două prețuri sunt scrise în tăblițele cerate de la Alburnus Maior, la douăzeci și doi de ani ' +
    'unul de altul; alăturate, se vede că un om costa cât aproape trei sezoane de lucru ale unui om liber. ' +
    'Din arhivă — 25 de tăblițe păstrate din circa 50 semnalate între 1786 și 1855 — nu se poate scoate o ' +
    'serie de prețuri, ci numai aceste două puncte.',
  randuri: [
    { et: 'O fată, Passia', sub: 'act de vânzare, 6 mai 142', v: 205,
      izvor: 'cumpărarea unei fete pe nume Passia pentru 205 denari' },
    { et: 'Un sezon de lucru în mină', sub: 'contract din 164 · circa șase luni', v: 70,
      dinEt: 'de aproape trei ori mai puțin',
      izvor: 'plata unui lucrător la 70 de denari pentru un sezon de aproximativ șase luni' },
  ],
}

/* sport — bilantul olimpic, pe discipline */
const MEDALII = {
  id: 'b-medalii',
  sectiune: 'sport',
  titlu: 'Cele 317 medalii olimpice, pe discipline',
  unitate: 'medalii',
  jos: 'Defalcarea pe aur, argint și bronz nu se desenează: cartea o dă numai pe total — 93, 101 și 123 —, ' +
    'nu pe discipline, iar o bară compusă ar sugera o repartiție pe care n-o știm. Rândul de sub filet este ' +
    'bilanțul de la Jocurile de iarnă, pus la aceeași scară: aceea e chiar figura.',
  randuri: [
    { et: 'Gimnastică', v: 73, izvor: 'dintre care 73 la gimnastică' },
    { et: 'Canotaj', v: 46, izvor: '46 la canotaj' },
    { et: 'Atletism', v: 35, izvor: '35 la atletism' },
    { et: 'Caiac-canoe', v: 34, izvor: '34 la caiac-canoe' },
    /* cartea scrie "câte 34 la caiac-canoe și la lupte", deci pentru lupte
       fraza care poarta cifra e cea din campul cifre[] */
    { et: 'Lupte', v: 34, izvor: 'lupte (34)' },
    /* Nu e o disciplina, ci restul: sta la coada si cu bara goala, ca sa nu
       para a sasea disciplina, cea mai productiva dintre toate. */
    { et: 'Celelalte discipline', sub: 'prin diferență', v: 95, deschis: true,
      izvor: '317 medalii la Jocurile Olimpice de vară' },
    { et: 'Jocurile de iarnă', rupt: true, sub: 'bob 2 persoane, Grenoble 1968', v: 1,
      izvor: 'o singură medalie, bronzul obținut de Ion Panțuru' },
  ],
}

/* mediu — taierile ilegale, asa cum le da cartea */
const LEMN = {
  id: 'b-lemn',
  sectiune: 'mediu',
  titlu: 'Cât lemn se taie și cât se recoltează legal',
  unitate: 'milioane de metri cubi pe an',
  jos: 'Datele sunt ale celui de-al doilea ciclu al Inventarului Forestier Național, 2013–2018; diferența a ' +
    'fost anunțată public în noiembrie 2019. Mustața de pe bara recoltei legale este intervalul pe care îl ' +
    'dă cartea, 18–20 de milioane. Ultimul rând este singurul lucru pe care cartea îl spune despre ciclul ' +
    'următor: o scădere substanțială, dar tot circa opt milioane nedocumentate anual — totalul acelui ciclu ' +
    'nu e dat, deci nu se desenează. Amploarea rămâne disputată: autoritățile și industria o pun pe seama ' +
    'metodologiei și a lemnului de foc neevidențiat, cercetătorii inventarului pe seama raportării.',
  randuri: [
    { et: 'Consum anual estimat', sub: 'ciclul 2013–2018', v: 38.6,
      izvor: 'un consum anual de circa 38,6 milioane de metri cubi' },
    /* bara sta la mijlocul intervalului, dar scrie intervalul: "19" nu e
       tiparit nicaieri in carte */
    { et: 'Recoltat legal', sub: 'ciclul 2013–2018', v: 19, vEt: '18–20', de: 18, la: 20,
      dinEt: 'diferența, circa 20 de milioane, e nedocumentată',
      izvor: 'aproximativ 18–20 de milioane recoltate legal' },
    { et: 'Nedocumentat anual', rupt: true, sub: 'ciclul următor · totalul lui nu e dat de carte', v: 8,
      izvor: 'în jur de opt milioane de metri cubi nedocumentați anual' },
  ],
}

export const BARE = [PIERDERI, PRETURI, MEDALII, LEMN]
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
