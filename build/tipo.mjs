/* ===========================================================================
   TIPOGRAFIE: semnele care deosebesc un text cules de unul tastat.
   ---------------------------------------------------------------------------
   Textul volumului a fost scris de-a lungul mai multor treceri si poarta urmele
   lor. Numarate pe cele 2.144 de fragmente:

     — intervalele de ani sunt scrise de 470 de ori, jumatate cu cratima si
       jumatate cu linie de unire: "1867-1944" langa "1867–1944", uneori pentru
       acelasi om, in doua capitole diferite;
     — linia de pauza e "—" de 439 de ori, dar de 31 de ori e o cratima cu
       spatii si de 9 ori o linie de unire;
     — ghilimelele sunt romanesti („ ”) de 291 de ori si drepte de 43;
     — apostroful din "anii '60" e drept peste tot.

   Nimic din toate astea nu se vede intr-o verificare de fapte, si toate se vad
   pe pagina tiparita. Se indreapta aici, o singura data, in drumul fiecarui sir
   catre oricare din cele patru formate — nu in continut, care ramane asa cum
   l-a lasat verificarea.
   =========================================================================== */

const LUNA = 'ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie'
const DATA_INAINTE = new RegExp(`(?:\\d|\\b(?:${LUNA})|î\\.Hr\\.|d\\.Hr\\.)\\s*$`, 'i')
const DATA_DUPA = new RegExp(`^\\s*(?:\\d|(?:${LUNA})\\b)`, 'i')

/**
 * Indreapta semnele unui sir de text din carte.
 * Nu atinge cifrele si nu schimba niciun cuvant: numai semnele.
 */
export function tipografic(text) {
  let s = String(text ?? '')
  if (!s) return s

  /* trei puncte → elipsa */
  s = s.replace(/\.\.\./g, '…')

  /* O data ISO — "2011-06-12", cum vin datele din manifestul de imagini — nu e
     un interval de ani: se pune deoparte cat tine indreptarea si se aseaza la
     loc dupa. Altfel iesea "2011–06–12". */
  const puse = []
  s = s.replace(/\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?\b/g, (m) => {
    puse.push(m); return `\u0000${puse.length - 1}\u0000`
  })

  /* interval de numere, fara spatii: 1867-1944 → 1867–1944 */
  s = s.replace(/(\d)\s?-\s?(?=\d)/g, '$1–')

  /* Doi ani goi despartiti de linie cu spatii — "1893 – 1960" — se string:
     asa se scrie un interval de ani. Cand de-o parte sau de alta e altceva
     decat un an gol ("23 august – 2 decembrie 1944", "300 î.Hr. – 87 d.Hr.")
     spatiile raman, fiindca acolo linia desparte doua date intregi. */
  s = s.replace(/(\d{3,4})\s+–\s+(?=\d{3,4}(?!\d))/g, '$1–')

  /* Cratima sau linia de unire cu spatii de-o parte si de alta e ori un
     interval de date — "23 august - 2 decembrie 1944" — ori o linie de pauza.
     Se hotaraste dupa ce sta in jurul ei. */
  /* Se trece de mai multe ori: intr-o insiruire — "Lederata - Arcidava -
     Berzobis" — o singura trecere prinde numai cratimile neinvecinate, fiindca
     fiecare potrivire inghite si contextul de dupa ea. */
  for (let i = 0; i < 4; i++) {
    const inainte = s
    s = s.replace(/([\s\S]{0,22})\s[-–]\s([\s\S]{0,22})/g, (tot, a, b) =>
      (DATA_INAINTE.test(a) && DATA_DUPA.test(b)) ? `${a} – ${b}` : `${a} — ${b}`)
    if (s === inainte) break
  }

  /* apostroful deceniilor: anii '60 → anii ’60 */
  s = s.replace(/'(?=\d)/g, '’')

  /* ghilimele drepte → romanesti, alternand deschis/inchis in acelasi sir;
     daca sirul e deja deschis cu „, urmatorul drept inchide */
  if (s.includes('"')) {
    let deschis = false
    s = s.replace(/[„”"]/g, (c) => {
      if (c === '„') { deschis = true; return '„' }
      if (c === '”') { deschis = false; return '”' }
      deschis = !deschis
      return deschis ? '„' : '”'
    })
  }

  /* apostroful ramas, in nume ca O'Shea */
  s = s.replace(/'/g, '’')

  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => puse[Number(i)])
  return s
}
