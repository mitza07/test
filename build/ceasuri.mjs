/* ===========================================================================
   Care sectiuni isi merita o banda cu ora, si cum se desface ziua lor.
   ---------------------------------------------------------------------------
   Nu toate capitolele au nevoie: intr-unul care tine trei secole, ziua nu
   inseamna nimic. Aici stau cele in care unitatea de masura chiar e ziua.

   Orele si cifrele sunt scrise in capitol, cuvant cu cuvant; se verifica cu
   "node ceasuri.mjs".
   =========================================================================== */
export const CEASURI = {
  revolutia: {
    de: '15 decembrie 1989',
    la: '31 decembrie 1989',
    lupa: '22 decembrie 1989',
    lupaDeLa: 6,
    lupaPanaLa: 24,
    titlu: 'Treisprezece zile, și dimineața care le-a rupt',
    jos: 'Sus, cele saptesprezece luni ale capitolului, cu fereastra deschisă peste ultimele șaptesprezece zile ale lui 1989; semnele din afara ferestrei sunt reperele rămase pe dinafară. Jos, ziua de 22 decembrie desfăcută pe ceas: represiunea ține cinci zile, prăbușirea ține trei ore. Cartea nu dă o repartiție pe zile a victimelor, ci numai pragul de la prânz.',
    momente: [
      { h: 9.5, et: '9:30 · moartea lui Milea' },
      { h: 11, et: '11 · mulțimea în CC' },
      { h: 12.1, et: '12:06 · elicopterul' },
      { h: 12.42, et: '12:25 · televiziunea liberă' },
    ],
    prag: { h: 12, stanga: 'circa 162 de morți', dreapta: 'circa 942, din 1.104' },
  },
}

export const ceasulSectiunii = (id) => CEASURI[id] || null

/* --- verificarea ---------------------------------------------------------- */
/* Fiecare ora si fiecare cifra de pe banda trebuie sa fie tiparita in capitol.
   O banda care spune mai mult decat cartea e o afirmatie noua, nu o figura. */
if (process.argv[1] && process.argv[1].endsWith('ceasuri.mjs')) {
  const { readFileSync } = await import('fs')
  const c = JSON.parse(readFileSync(new URL('./continut.json', import.meta.url), 'utf8'))
  let rele = 0
  for (const [id, cfg] of Object.entries(CEASURI)) {
    const s = [...(c.capitole || []), ...(c.teme || [])].find((x) => x.id === id)
    if (!s) { console.log(`✗ ${id}: sectiunea nu exista`); rele++; continue }
    const tot = [
      ...(s.sectiuni || []).flatMap((x) => x.paragrafe || []),
      ...(s.cronologie || []).map((x) => `${x.an} ${x.eveniment}`),
      ...(s.cifre || []).map((x) => `${x.valoare} ${x.eticheta} ${x.nota}`),
    ].join(' ')
    const cere = [
      ...cfg.momente.map((m) => m.et.split('·')[0].trim()),
      ...[cfg.prag.stanga, cfg.prag.dreapta].flatMap((t) => t.match(/[\d.]+/g) || []),
    ]
    const lipsa = cere.filter((x) => !tot.includes(x))
    if (lipsa.length) { rele++; console.log(`✗ ${id}: nu sunt in capitol: ${lipsa.join(', ')}`) }
    else console.log(`✓ ${id.padEnd(12)} ${cfg.momente.length} momente și ${cere.length - cfg.momente.length} cifre, toate tipărite în capitol`)
  }
  process.exit(rele ? 1 : 0)
}
