/* ===========================================================================
   MANUSCRISUL .docx — construit direct, fara biblioteci.
   Un .docx este un ZIP cu XML inauntru. Editura primeste asa ceva: text cu
   stiluri numite, imagini incluse si legendele lor, fara machetare de tipar.
   =========================================================================== */
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync, statSync, copyFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { PLAN, PLAN_TEME } from '../build/build.mjs'
import { HARTI } from '../build/harti.mjs'
import { SUBT_DIAG } from './tipar.mjs'
import { toateTabelele } from '../build/tabele.mjs'
import { CEASURI } from '../build/ceasuri.mjs'
import { aseaza } from '../build/asezare.mjs'
import { creditScurt } from '../build/credit.mjs'
import { tipografic } from '../build/tipo.mjs'

const RAD = new URL('./', import.meta.url).pathname
const OUT = RAD + '.docx-lucru'
const CTRL = new RegExp('[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f]', 'g')
const esc = (s) => tipografic(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(CTRL, '')
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV',
  'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII']

const TITLU = 'Istoria României'
const SUBTITLU = 'în 3.026 de ani'
const AUTOR = '[numele autorului]'
const EMU = 914400            /* unitati englezesti metrice intr-un inch */
const LAT_TEXT = 6 * EMU      /* latimea coloanei de text a manuscrisului */
const INALT_MAX = Math.round(7.2 * EMU)

/* --- caramizile documentului --------------------------------------------- */
const p = (text, stil) =>
  `<w:p>${stil ? `<w:pPr><w:pStyle w:val="${stil}"/></w:pPr>` : ''}` +
  `<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`

const pgol = () => '<w:p/>'
const saltPagina = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

function imagine(id, cx, cy, legenda, nr, fisier) {
  const desen = `<wp:inline distT="0" distB="0" distL="0" distR="0">
<wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="${fisier ? `Figura ${nr}` : `Ilustratia ${nr}`}" descr="${esc(legenda).slice(0, 180)}"/>
<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:nvPicPr><pic:cNvPr id="${id}" name="${fisier || `il${nr}.jpg`}"/><pic:cNvPicPr/></pic:nvPicPr>
<pic:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline>`
  return `<w:p><w:pPr><w:pStyle w:val="Ilustratie"/></w:pPr><w:r><w:drawing>${desen}</w:drawing></w:r></w:p>`
}

/* --- stilurile ------------------------------------------------------------ */
const stil = (id, nume, spec) =>
  `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nume}"/>` +
  `<w:basedOn w:val="Normal"/><w:qFormat/>${spec}</w:style>`

const STILURI = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:line="480" w:lineRule="auto" w:after="0"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>
<w:pPr><w:ind w:firstLine="567"/><w:jc w:val="both"/></w:pPr></w:style>
${stil('Titlu', 'Title', '<w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="52"/></w:rPr>')}
${stil('Subtitlu', 'Subtitle', '<w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:sz w:val="32"/></w:rPr>')}
${stil('Heading1', 'heading 1', '<w:pPr><w:ind w:firstLine="0"/><w:jc w:val="left"/><w:spacing w:before="480" w:after="240"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr>')}
${stil('Heading2', 'heading 2', '<w:pPr><w:ind w:firstLine="0"/><w:jc w:val="left"/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr>')}
${stil('Rezumat', 'Rezumat', '<w:pPr><w:ind w:firstLine="0" w:left="567" w:right="567"/></w:pPr><w:rPr><w:i/></w:rPr>')}
${stil('Perioada', 'Perioada', '<w:pPr><w:ind w:firstLine="0"/></w:pPr><w:rPr><w:i/><w:color w:val="666666"/></w:rPr>')}
${stil('Ilustratie', 'Ilustratie', '<w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:spacing w:before="240" w:after="0"/></w:pPr>')}
${stil('Legenda', 'Legenda ilustratiei', '<w:pPr><w:ind w:firstLine="0" w:left="567" w:right="567"/><w:jc w:val="left"/><w:spacing w:line="240" w:lineRule="auto" w:after="240"/></w:pPr><w:rPr><w:sz w:val="20"/></w:rPr>')}
${stil('Celula', 'Celula de tabel', '<w:pPr><w:ind w:firstLine="0"/><w:jc w:val="left"/><w:spacing w:line="240" w:lineRule="auto" w:after="0"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr>')}
${stil('Aparat', 'Aparat critic', '<w:pPr><w:ind w:firstLine="0" w:left="283" w:hanging="283"/><w:jc w:val="left"/><w:spacing w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr>')}
</w:styles>`

/* --- ilustratia, cu legenda si creditul ei -------------------------------- */
/* Latimea in pixeli a unui JPEG, citita din antetul lui: se cauta markerul de
   cadru (SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15) si se citesc cele
   doua numere de dupa. Fara biblioteca: manifestul da pixelii originalului, iar
   noua ne trebuie ai fisierului lipit. */
function pixeliLati(cale) {
  const b = readFileSync(cale)
  if (b[0] !== 0xff || b[1] !== 0xd8) return 0
  let i = 2
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue }
    const m = b[i + 1]
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue }
    const len = b.readUInt16BE(i + 2)
    const cadru = (m >= 0xc0 && m <= 0xcf) && m !== 0xc4 && m !== 0xc8 && m !== 0xcc
    if (cadru) return b.readUInt16BE(i + 7)
    i += 2 + len
  }
  return 0
}

/* Manuscrisul e ce primeste un editor ca sa culeaga din el, nu ce se citeste pe
   ecran: acolo o poza sub trei sute de puncte pe tol nu se poate tipari. Pana
   acum manuscrisul lipea copia de ecran — 900 px mediana — dar ii dadea latimea
   socotita din pixelii originalului, asa ca toate cele 331 de ilustratii ieseau
   la 150 de puncte pe tol, niciuna peste 200. Acum se lipeste varianta de tipar
   si latimea se socoteste din pixelii fisierului lipit, nu din ai originalului.
   Manuscrisul creste de la 44 la vreo 140 de megaocteti — atat cantareste un
   manuscris care se poate tipari. Cu DOCX_USOR=1 se face copia usoara, de
   citit, cu pozele de ecran. */
const USOR = Boolean(process.env.DOCX_USOR)
const PPT = USOR ? 200 : 300     /* puncte pe tol cerute de poza lipita */

function pune(m, stare) {
  const nume = m.local.split('/').pop()
  const potrivite = USOR
    ? ['ilustratii/ecran/' + nume, 'ilustratii/tipar/' + nume]
    : ['ilustratii/tipar/' + nume, 'ilustratii/ecran/' + nume]
  const src = potrivite.map((x) => RAD + x).find(existsSync)
  const mare = RAD + m.local
  /* Pragul de 40 KB e pentru descarcari stricate si se masoara pe original.
     Aplicat pe copia deja comprimata pentru ecran, taia opt ilustratii bune. */
  if (!src) return ''
  if (!existsSync(mare) || statSync(mare).size < 40000) return ''
  const id = ++stare.id
  copyFileSync(src, `${OUT}/word/media/il${id}.jpg`)
  stare.rels.push(`<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/il${id}.jpg"/>`)
  const nr = ++stare.nr
  /* Raportul se ia din pixelii pe care ii avem cu adevarat. Unsprezece intrari
     din manifest n-au latime/inaltime, dar le au pe pxLatime/pxInaltime, pe
     care macheta de tipar le foloseste; fara ele, poza iesea turtita la 0,7. */
  const lat = m.pxLatime || m.latime || 0
  const inalt = m.pxInaltime || m.inaltime || 0
  const raport = (lat && inalt) ? inalt / lat : 0.7
  /* Latimea se ia din fisierul LIPIT, nu din original: o poza de 1.600 de
     pixeli tine cinci toli si un sfert la trei sute de puncte pe tol, si atat
     i se da. */
  const px = pixeliLati(src) || lat
  let cx = px ? Math.min(LAT_TEXT, Math.round((px / PPT) * EMU)) : LAT_TEXT
  let cy = Math.round(cx * raport)
  if (cy > INALT_MAX) { cy = INALT_MAX; cx = Math.round(cy / raport) }
  const credit = creditScurt(m)
  return imagine(id, cx, cy, m.legenda, nr) + p(`Ilustrația ${nr}. ${m.legenda} [${credit}]`, 'Legenda')
}

/* --- harta sau diagrama, randata mai devreme ca PNG -----------------------
   Word nu deseneaza SVG, asa ca figurile vectoriale ale cartii intra aici ca
   poze. Legenda hartii, care sta in afara desenului, se muta in text: altfel
   tonurile n-ar spune nimic. */
const FIGURI = (() => {
  const cale = RAD + 'ilustratii/figuri/index.json'
  if (!existsSync(cale)) {
    console.warn('ATENȚIE: lipsesc PNG-urile hărților și diagramelor; rulează mai întâi\n' +
      '  node figuri-png.mjs\naltfel manuscrisul iese fără nicio hartă.')
    return {}
  }
  return Object.fromEntries(JSON.parse(readFileSync(cale, 'utf8')).map((f) => [f.cheie, f]))
})()

const TITLU_BANDA = {
  banda: ['Reperele capitolului, la scară',
    'Fiecare semn este un reper din lista de mai jos, așezat la locul lui în timp; cercul gol înseamnă datare aproximativă, bara sub axă o durată. Fâșia de sus arată unde cade capitolul în cele opt mii de ani ale volumului.'],
  vieti: ['Cine trăiește când',
    'Anii celor cinci oameni ai capitolului, pe aceeași axă: se vede cine pe cine a apucat. Bara goală înseamnă datare aproximativă, săgeata că textul nu dă un an de sfârșit. Fâșia umbrită este epoca propriu-zisă a capitolului.'],
}

function puneFigura(cheie, stare) {
  const f = FIGURI[cheie]
  const src = RAD + 'ilustratii/figuri/' + cheie + '.png'
  if (!f || !existsSync(src)) return ''
  const h = HARTI[cheie]
  /* Banda cu ora isi poarta titlul in configuratia ei, fiindca difera de la
     un capitol la altul — nu toate se desfac pe acelasi ceas. */
  const ceas = cheie.startsWith('ceas-') ? CEASURI[cheie.slice(5)] : null
  const banda = ceas ? [ceas.titlu, ceas.jos] : TITLU_BANDA[(cheie.split('-')[0])]
  const [titlu, jos] = h ? [h.titlu, h.jos] : banda || (SUBT_DIAG[cheie] || ['', ''])
  if (!titlu) return ''
  const id = ++stare.id
  copyFileSync(src, `${OUT}/word/media/fig${id}.png`)
  stare.rels.push(`<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/fig${id}.png"/>`)
  /* Fiecare fel de figura isi are sirul lui: altfel hartile ieseau numerotate
     1, 8, 13, 16 … 58, fiindca benzile foloseau acelasi contor. */
  const fel0 = h ? 'harta' : banda ? 'banda' : 'diagrama'
  stare.nrPe = stare.nrPe || {}
  const nr = stare.nrPe[fel0] = (stare.nrPe[fel0] || 0) + 1
  stare.nrFig = (stare.nrFig || 0) + 1
  const raport = f.inaltime / f.latime
  let cx = LAT_TEXT, cy = Math.round(cx * raport)
  if (cy > INALT_MAX) { cy = INALT_MAX; cx = Math.round(cy / raport) }
  /* Cheia legendei nu se arunca: un sir de cuvinte fara semnul lor nu spune
     ce ton sau ce linie inseamna fiecare. */
  const NUME_SEMN = { ceda: 'linie roșie întreruptă', campanie: 'linie roșie',
    hasu: 'hașură', batalie: 'cruce', sit: 'triunghi', oras: 'cerc plin',
    capitala: 'cerc dublu', h0: 'ton', h1: 'ton', h2: 'ton', h3: 'ton', h4: 'ton' }
  const leg = (h?.legenda || []).map(([k, t]) => `${t} (${NUME_SEMN[k] || 'ton ' + k})`).join('; ')
  const fel = h ? 'Harta' : banda ? 'Banda' : 'Diagrama'
  /* Explicatia benzii se da o data, la prima; pe urma numai titlul — altfel
     acelasi paragraf de doua sute treizeci de semne s-ar repeta de patruzeci. */
  stare.spus = stare.spus || new Set()
  let text = jos
  if (banda) { text = stare.spus.has(fel0) ? '' : jos; stare.spus.add(fel0) }
  const cap = `${fel} ${nr}. ${titlu}${text ? '. ' + text : '.'}` + (leg ? ` Legendă: ${leg}.` : '')
  return imagine(id, cx, cy, titlu, nr, `fig${id}.png`) + p(cap, 'Legenda')
}

/* --- tabelele materialului final ------------------------------------------
   Un manuscris fara tabele obliga editura sa le refaca. Se scriu aici ca tabele
   de Word adevarate, nu ca text aliniat cu spatii. */
const LAT_TABEL = 9000                        /* douazecimi de punct, cat coloana */

function tabelDocx(t) {
  const n = t.coloane.length
  /* coloanele numerice sunt inguste; restul isi impart ce ramane */
  const inguste = t.coloane.filter((c) => c.clasa === 'num').length
  const latIngusta = Math.round(LAT_TABEL * 0.09)
  const latLarga = Math.round((LAT_TABEL - inguste * latIngusta) / Math.max(1, n - inguste))
  const lat = t.coloane.map((c) => (c.clasa === 'num' ? latIngusta : latLarga))

  const celula = (text, i, cap) =>
    `<w:tc><w:tcPr><w:tcW w:w="${lat[i]}" w:type="dxa"/></w:tcPr>` +
    `<w:p><w:pPr><w:pStyle w:val="Celula"/></w:pPr><w:r>${cap ? '<w:rPr><w:b/></w:rPr>' : ''}` +
    `<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p></w:tc>`

  const cap = `<w:tr><w:trPr><w:tblHeader/></w:trPr>` +
    t.coloane.map((c, i) => celula(c.et, i, true)).join('') + `</w:tr>`
  const randuri = t.randuri.map((r) =>
    `<w:tr>` + t.coloane.map((c, i) => celula(r[c.cheie], i, false)).join('') + `</w:tr>`).join('')

  const margine = `<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="0" w:type="dxa"/>` +
    `<w:bottom w:w="40" w:type="dxa"/><w:right w:w="113" w:type="dxa"/></w:tblCellMar>`
  const borduri = `<w:tblBorders><w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>` +
    `<w:top w:val="single" w:sz="8" w:space="0" w:color="888888"/>` +
    `<w:bottom w:val="single" w:sz="8" w:space="0" w:color="888888"/></w:tblBorders>`
  return `<w:tbl><w:tblPr><w:tblW w:w="${LAT_TABEL}" w:type="dxa"/>${borduri}${margine}</w:tblPr>` +
    `<w:tblGrid>${lat.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>` +
    cap + randuri + `</w:tbl>`
}

function sectiuneaTabel(t) {
  return p(t.titlu, 'Heading1') + p(t.intro, 'Legenda') + tabelDocx(t) + pgol() + saltPagina()
}

/* --- un capitol sau o tema ------------------------------------------------ */
/* Impartirea blocurilor printre subcapitole sta in build/asezare.mjs, comuna
   celor patru formate; aici raman numai randatoarele. */
function sectiune(c, eticheta, poze, stare) {
  const cap = p(eticheta, 'Perioada') + p(c.titlu, 'Heading1') + (c.per ? p(c.per, 'Perioada') : '')
  return cap + aseaza(c, {
    poze,
    rezumat: (c) => c.rezumat ? p(c.rezumat, 'Rezumat') + pgol() : '',
    proza: (s) => p(s.subtitlu, 'Heading2') + (s.paragrafe || []).map((x) => p(x)).join(''),
    ilustratie: (m) => pune(m, stare),
    harta: (cheie) => puneFigura(cheie, stare),
    diagrama: (cheie) => puneFigura(cheie, stare),
    ceas: (c) => puneFigura('ceas-' + c.id, stare),
    tabel: (t) => p(t.titlu, 'Heading2') + p(t.intro, 'Legenda') + tabelDocx(t) + pgol(),
    citat: (c) => c.citat?.text
      ? p('Citat', 'Heading2') + p(`„${c.citat.text}” — ${c.citat.autor}. ${c.citat.context || ''}`.trim(), 'Rezumat')
      : '',
    cifre: (c) => c.cifre?.length
      ? p('Cifre', 'Heading2') + c.cifre.map((x) => p(`${x.valoare} — ${x.eticheta}. ${x.nota || ''}`.trim(), 'Aparat')).join('')
      : '',
    vieti: (c) => c.figuri?.length ? puneFigura('vieti-' + c.id, stare) : '',
    figuri: (c) => c.figuri?.length
      ? p('Oameni', 'Heading2') + c.figuri.map((x) => p(`${x.nume} (${x.ani}), ${x.rol}. ${x.descriere}`, 'Aparat')).join('')
      : '',
    cronologie: (c) => c.cronologie?.length
      ? p('Cronologie', 'Heading2') + puneFigura('banda-' + c.id, stare) +
        c.cronologie.map((x) => p(`${x.an} — ${x.eveniment}`, 'Aparat')).join('')
      : '',
    controversa: (c) => c.controversa ? p('Ce se discută', 'Heading2') + p(c.controversa) : '',
  }).join('') + saltPagina()
}

export function construiesteDocx(continut) {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT + '/word/media', { recursive: true })
  mkdirSync(OUT + '/word/_rels', { recursive: true })
  mkdirSync(OUT + '/_rels', { recursive: true })
  mkdirSync(OUT + '/docProps', { recursive: true })

  const ILUSTRATII = {}
  const caleMan = RAD + 'ilustratii/manifest.json'
  if (existsSync(caleMan)) for (const m of JSON.parse(readFileSync(caleMan, 'utf8')))
    (ILUSTRATII[m.cap] = ILUSTRATII[m.cap] || []).push(m)

  const capById = Object.fromEntries((continut.capitole || []).map((c) => [c.id, c]))
  const temeById = Object.fromEntries((continut.teme || []).map((c) => [c.id, c]))
  const cap = PLAN.map((pl) => ({ ...pl, ...(capById[pl.id] || {}) })).filter((c) => c.sectiuni?.length)
  const teme = PLAN_TEME.map((pl) => ({ ...pl, ...(temeById[pl.id] || {}) })).filter((c) => c.sectiuni?.length)

  const stare = { id: 0, nr: 0, nrFig: 0, rels: [] }
  const b = []
  b.push(p(TITLU, 'Titlu'), p(SUBTITLU, 'Subtitlu'), pgol(), p(AUTOR, 'Subtitlu'), saltPagina())
  cap.forEach((c, i) => b.push(sectiune(c, `Capitolul ${ROMAN[i + 1]}`, ILUSTRATII[c.id] || [], stare)))
  teme.forEach((c) => b.push(sectiune(c, 'Priviri transversale', ILUSTRATII[c.id] || [], stare)))
  /* materialul final: tabelele, apoi plansa cartografica */
  for (const t of toateTabelele([...cap, ...teme.map((x) => ({ ...x, tema: true, per: 'transversal' }))]))
    b.push(sectiuneaTabel(t))

  const atlas = ILUSTRATII.atlas || []
  if (atlas.length) {
    b.push(p('Planșă cartografică', 'Perioada'), p('Cum a fost desenat acest pământ', 'Heading1'))
    b.push(p('Hărțile de mai jos nu sunt ilustrații ale textului, ci izvoare în sine.', 'Rezumat'))
    b.push(...atlas.map((m) => pune(m, stare)))
  }

  writeFileSync(OUT + '/word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<w:body>${b.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709"/>
</w:sectPr></w:body></w:document>`)

  writeFileSync(OUT + '/word/styles.xml', STILURI)
  writeFileSync(OUT + '/word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStil" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
${stare.rels.join('\n')}</Relationships>`)

  writeFileSync(OUT + '/_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`)

  writeFileSync(OUT + '/docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(TITLU + ' ' + SUBTITLU)}</dc:title><dc:creator>${esc(AUTOR)}</dc:creator>
<dc:language>ro-RO</dc:language></cp:coreProperties>`)

  writeFileSync(OUT + '/[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="jpg" ContentType="image/jpeg"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`)

  const dest = RAD + 'Istoria-Romaniei-manuscris.docx'
  rmSync(dest, { force: true })
  execFileSync('zip', ['-Xr9Dq', dest, '[Content_Types].xml', '_rels', 'docProps', 'word'], { cwd: OUT })
  return { dest, ilustratii: stare.nr, figuri: stare.nrFig, paragrafe: b.join('').split('<w:p').length - 1 }
}

if (process.argv[1]?.endsWith('docx.mjs')) {
  const continut = JSON.parse(readFileSync(new URL('../build/continut.json', import.meta.url), 'utf8'))
  const r = construiesteDocx(continut)
  console.log(`${r.dest.split('/').pop()} · ${(statSync(r.dest).size / 1048576).toFixed(1)} MB · ` +
    `${r.paragrafe} paragrafe · ${r.ilustratii} ilustrații · ${r.figuri} hărți și diagrame`)
}
