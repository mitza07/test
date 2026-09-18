/* ===========================================================================
   Tabelele din corpul capitolelor.
   ---------------------------------------------------------------------------
   Pana acum cartea avea patru tabele, toate la sfarsitul volumului, in aparat:
   sinopticul, disputele, indicele de persoane si cifrele. In corpul celor
   patruzeci de sectiuni — o mie de pagini — nu era niciunul.

   Sunt lucruri pe care proza le spune bine o data si prost a doua oara. Cand
   un paragraf insira cinci inchisori cu cinci functii deosebite, sau
   cincisprezece hotarari de ortografie luate de sase instante, cititorul le
   citeste, dar nu le poate compara si nu le poate cauta inapoi. Un tabel le
   asaza unele langa altele si arata dintr-o privire ce fraza spune in trecere.

   REGULA: nicio celula nu aduce ceva din afara cartii. Fiecare valoare de aici
   e in continut.json, la sectiunea numita in campul "izvor", si se verifica cu
   "node tabele-capitol.mjs".

   O celula goala e ingaduita si e informatie: inseamna ca textul nu consemneaza
   nimic acolo. Un tabel poate purta cinstit un gol; un grafic, nu.
   =========================================================================== */

/* limba — Normarea academica si disputele ortografice */
const ORTOGRAFIE = {
  id: 'tc-ortografie',
  sectiune: 'limba',
  titlu: 'Cum s-a scris româna',
  intro: 'Cincisprezece hotărâri de scriere, de la prima gramatică cu litere latine până la ediția din 2021 a dicționarului normativ. Aceeași literă — „â” — a fost scoasă și readusă de trei ori, de trei instanțe, și de fiecare dată pentru motive care n-au fost lingvistice. Coloana din dreapta rămâne goală acolo unde cartea nu consemnează o contestare.',
  izvor: 'temele „De la chirilice la alfabetul latin” și „Normarea academică și disputele ortografice”',
  coloane: [
    { cheie: 'an', et: 'Anul', clasa: 'num' },
    { cheie: 'cine', et: 'Cine hotărăște' },
    { cheie: 'ce', et: 'Ce se schimbă' },
    { cheie: 'contra', et: 'Ce s-a reproșat' },
  ],
  randuri: [
    { an: '1780', cine: 'Samuil Micu și Gheorghe Șincai, Viena',
      ce: 'Elementa linguae daco-romanae sive valachicae: prima gramatică a românei tipărită cu litere latine.', contra: '' },
    { an: '1825', cine: 'Lexiconul de la Buda',
      ce: 'Ortografie etimologizantă, care apropia artificial cuvintele de forma lor latină.',
      contra: 'Eliminarea sistematică a elementelor slave și maghiare din lexic, respinsă ulterior de filologie ca nefirească și impracticabilă.' },
    { an: '1828', cine: 'Ion Heliade Rădulescu, Sibiu',
      ce: 'Gramatica românească reduce inventarul chirilic de la patruzeci și trei la douăzeci și șapte de semne; încep alfabetele de tranziție.', contra: '' },
    { an: '1860', cine: 'Ministerul instrucțiunii publice',
      ce: 'Alfabetul latin, introdus oficial în școli și în administrație.', contra: '' },
    { an: '1862', cine: 'Decret',
      ce: 'Alfabetul latin, generalizat.',
      contra: 'În Basarabia aflată sub stăpânire rusă cărțile în română au continuat să apară cu litere chirilice până la 1918.' },
    { an: '1866', cine: 'Societatea Literară Română',
      ce: 'Întemeiată la 1 aprilie, cu sarcina de a stabili ortografia și de a redacta gramatica și dicționarul.', contra: '' },
    { an: '1869', cine: 'Societatea Academică Română',
      ce: 'Se adoptă sistemul etimologic al lui Timotei Cipariu.',
      contra: 'Poziția principiului fonetic, formulată de Titu Maiorescu încă din 1866.' },
    { an: '1871–1876', cine: 'August Treboniu Laurian și Ioan Massim',
      ce: 'Dicționarul limbei române împinge consecvența etimologică până la absurd, izgonind cuvintele de origine nelatină într-un Glosariu (1877).',
      contra: 'Eșecul public al lucrării a discreditat direcția latinistă.' },
    { an: '1880', cine: 'Academia Română',
      ce: 'Primul sistem ortografic academic.', contra: 'Mai păstra concesii etimologice.' },
    { an: '1904', cine: 'Academia Română',
      ce: 'Ortografie preponderent fonetică.', contra: '' },
    { an: '1932', cine: 'Academia Română',
      ce: '„â” în interiorul cuvântului, „î” la început și la sfârșit.', contra: '' },
    { an: '1953', cine: 'Academia Republicii Populare Române',
      ce: 'Litera „â” este eliminată, „î” generalizat, forma „sînt” impusă.',
      contra: 'Percepută de contemporani ca dezlatinizare simbolică, într-o perioadă de aliniere culturală la modelul sovietic.' },
    { an: '1964', cine: 'Academia',
      ce: '„â” readmis în „român” și în derivatele sale.', contra: '' },
    { an: '17 februarie 1993', cine: 'Academia Română',
      ce: '„â” revine în interiorul cuvintelor; forma „sunt”.',
      contra: 'Contestată public de o mare parte a lingviștilor de profesie, care i-au reproșat lipsa unei justificări științifice, costurile practice și caracterul de gest simbolic.' },
    { an: '2005 și 2021', cine: 'Dicționarul ortografic, ortoepic și morfologic',
      ce: 'Cele două ediții consfințesc soluțiile din 1993.', contra: '' },
  ],
}

/* comunism1 — Securitatea si universul concentrationar */
const INCHISORI = {
  id: 'tc-inchisori',
  sectiune: 'comunism1',
  titlu: 'Ce era fiecare loc',
  intro: 'Sistemul penitenciar avea o diviziune a muncii: fiecare loc o funcție, fiecare funcție o categorie de oameni. Ultimul rând nu este o închisoare, ci o deportare, și de aceea stă despărțit. Acolo unde cartea nu dă o cifră, celula rămâne goală.',
  izvor: 'capitolul „Comunismul stalinist”, secțiunea „Securitatea și universul concentraționar”; morțile, din secțiunile despre lichidarea pluralismului politic și luptele din partid',
  coloane: [
    { cheie: 'loc', et: 'Locul' },
    { cheie: 'ce', et: 'Ce era' },
    { cheie: 'cine', et: 'Cine ajungea acolo' },
    { cheie: 'morti', et: 'Ce spune cartea despre morți' },
  ],
  randuri: [
    { loc: 'Sighet', ce: 'Închisoare pentru elita interbelică, după arestările din noaptea de 5 spre 6 mai 1950',
      cine: 'Miniștri, parlamentari, ierarhi, academicieni',
      morti: 'Peste cincizeci au murit acolo, îngropați fără nume; Iuliu Maniu, la 5 februarie 1953' },
    { loc: 'Aiud', ce: 'Închisoare', cine: 'Legionarii și ofițerii', morti: 'Vasile Luca, în 1963' },
    { loc: 'Gherla', ce: 'Închisoare și loc al „reeducării”', cine: 'Deținuții tineri', morti: '' },
    { loc: 'Pitești', ce: '„Reeducarea”, între decembrie 1949 și 1952, extinsă la Gherla, Târgu Ocna, Ocnele Mari și pe șantierul Canalului',
      cine: 'Tinerii încarcerați, torturați de propriii colegi de celulă',
      morti: 'Eugen Țurcanu și mai mulți coinculpați, executați în decembrie 1954' },
    { loc: 'Râmnicu Sărat', ce: 'Închisoarea izolării și a tăcerii absolute', cine: 'Liderii țărăniști',
      morti: 'Ion Mihalache, în 1963' },
    { loc: 'Jilava', ce: 'Loc de tranzit și de execuții', cine: '',
      morti: 'Ion Antonescu, la 1 iunie 1946; Lucrețiu Pătrășcanu, la 17 aprilie 1954' },
    { loc: 'Canalul Dunăre–Marea Neagră', ce: 'Muncă forțată; șantier deschis în 1949 și abandonat în 1953',
      cine: 'Colonii la Poarta Albă, Peninsula și Capul Midia',
      morti: 'Disputat: documentele interne consemnează câteva sute, estimările memorialistice merg până la câteva mii' },
    { loc: 'Delta Dunării', ce: 'Lagăre de muncă', cine: 'Periprava și Salcia', morti: '' },
    { loc: 'Baia Sprie și Cavnic', ce: 'Muncă forțată în minele de neferoase', cine: '', morti: '' },
    { loc: 'Balta Brăilei', ce: 'Muncă forțată', cine: '', morti: '' },
    { loc: 'Bărăganul', rupe: true, ce: 'Deportare, nu detenție: 17–18 iunie 1951, lăsați în câmp deschis',
      cine: 'Aproximativ 40.000–44.000 de persoane din fâșia de frontieră cu Iugoslavia — români, germani, sârbi, refugiați basarabeni, aromâni, foști proprietari',
      morti: 'Au întemeiat optsprezece localități noi; cei mai mulți s-au putut întoarce abia din 1955–1956' },
  ],
}

const TOATE = [ORTOGRAFIE, INCHISORI]

/** Tabelele din corpul unei sectiuni, dupa id. */
export function tabeleleSectiunii(id) {
  return TOATE.filter((t) => t.sectiune === id)
}

export { TOATE as TABELE_CAPITOL }

/* --- verificarea ---------------------------------------------------------- */
/* Fiecare celula trebuie sa se regaseasca in textul sectiunii. Nu se compara
   fraza cu fraza — tabelul scurteaza, si asa trebuie — ci cuvant cu cuvant:
   fiecare cuvant de continut din celula trebuie sa aiba o pereche in sectiunea
   lui. Romana fiind flexionara, perechea se cauta pe radacina, nu pe forma:
   "alfabetele" se leaga de "alfabete", "impusa" de "a impus", "Baraganul" de
   "Baragan". Radacina e prefixul de lungime max(4, n-3) — destul cat sa nu
   confunde doua cuvinte deosebite, scurt cat sa treaca peste desinenta.
   Ce nu are pereche se tipareste, ca sa fie privit cu ochiul. */
if (process.argv[1] && process.argv[1].endsWith('tabele-capitol.mjs')) {
  const { readFileSync } = await import('fs')
  const c = JSON.parse(readFileSync(new URL('./continut.json', import.meta.url), 'utf8'))
  const gasit = (id) => [...(c.capitole || []), ...(c.teme || [])].find((x) => x.id === id)
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f\u0326\u0327]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
  const comun = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i }
  const pereche = (a, b) => comun(a, b) >= Math.max(4, Math.min(a.length, b.length) - 3)
  let rele = 0
  for (const t of TOATE) {
    const s = gasit(t.sectiune)
    if (!s) { console.log(`✗ ${t.id}: sectiunea "${t.sectiune}" nu exista`); rele++; continue }
    const cuvinteText = norm([
      ...(s.sectiuni || []).flatMap((x) => [x.subtitlu, ...(x.paragrafe || [])]),
      ...(s.cronologie || []).map((x) => `${x.an} ${x.eveniment}`),
      ...(s.figuri || []).map((x) => `${x.nume} ${x.ani} ${x.rol} ${x.descriere}`),
      ...(s.cifre || []).map((x) => `${x.valoare} ${x.eticheta} ${x.nota}`),
      s.controversa, s.rezumat,
    ].join(' ')).split(' ')
    const vocabular = [...new Set(cuvinteText)]
    const strain = new Set()
    for (const r of t.randuri) for (const col of t.coloane) {
      for (const cuv of norm(r[col.cheie]).split(' ')) {
        if (!cuv || cuv.length <= 3) continue
        if (!vocabular.some((w) => pereche(cuv, w))) strain.add(cuv)
      }
    }
    if (strain.size) { rele++; console.log(`✗ ${t.id}: ${strain.size} cuvinte fără pereche în secțiune: ${[...strain].join(', ')}`) }
    else console.log(`✓ ${t.id.padEnd(16)} ${String(t.randuri.length).padStart(2)} rânduri × ${t.coloane.length} coloane — fiecare cuvânt are pereche în „${t.sectiune}”`)
  }
  process.exit(rele ? 1 : 0)
}
