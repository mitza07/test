/* ===========================================================================
   MANUSCRISUL .docx — construit direct, fara biblioteci.
   Un .docx este un ZIP cu XML inauntru. Editura primeste asa ceva: text cu
   stiluri numite, imagini incluse si legendele lor, fara machetare de tipar.
   =========================================================================== */
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync, statSync, copyFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { PLAN, PLAN_TEME } from '../build/build.mjs'

const RAD = new URL('./', import.meta.url).pathname
const OUT = RAD + '.docx-lucru'
const CTRL = new RegExp('[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f]', 'g')
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

function imagine(id, cx, cy, legenda, nr) {
  const desen = `<wp:inline distT="0" distB="0" distL="0" distR="0">
<wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Ilustratia ${nr}" descr="${esc(legenda).slice(0, 180)}"/>
<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:nvPicPr><pic:cNvPr id="${id}" name="il${nr}.jpg"/><pic:cNvPicPr/></pic:nvPicPr>
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
${stil('Aparat', 'Aparat critic', '<w:pPr><w:ind w:firstLine="0" w:left="283" w:hanging="283"/><w:jc w:val="left"/><w:spacing w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr>')}
</w:styles>`

/* --- ilustratia, cu legenda si creditul ei -------------------------------- */
function pune(m, stare) {
  /* varianta redusa pentru tipar, daca exista: altfel .docx ajunge la sute de MB */
  const redus = RAD + 'ilustratii/tipar/' + m.local.split('/').pop()
  const src = existsSync(redus) ? redus : RAD + m.local
  if (!existsSync(src) || statSync(src).size < 40000) return ''
  const id = ++stare.id
  copyFileSync(src, `${OUT}/word/media/il${id}.jpg`)
  stare.rels.push(`<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/il${id}.jpg"/>`)
  const nr = ++stare.nr
  const raport = (m.inaltime && m.latime) ? m.inaltime / m.latime : 0.7
  let cx = LAT_TEXT, cy = Math.round(cx * raport)
  if (cy > INALT_MAX) { cy = INALT_MAX; cx = Math.round(cy / raport) }
  const credit = [m.autor, m.data, m.sursa, /domeniu public/i.test(m.tipLicenta) ? 'domeniu public' : m.licenta]
    .filter(Boolean).join(' · ')
  return imagine(id, cx, cy, m.legenda, nr) + p(`Ilustrația ${nr}. ${m.legenda} [${credit}]`, 'Legenda')
}

/* --- un capitol sau o tema ------------------------------------------------ */
function sectiune(c, eticheta, poze, stare) {
  const b = []
  b.push(p(eticheta, 'Perioada'))
  b.push(p(c.titlu, 'Heading1'))
  if (c.per) b.push(p(c.per, 'Perioada'))
  if (c.rezumat) b.push(p(c.rezumat, 'Rezumat'), pgol())
  const sec = c.sectiuni || []
  const intre = sec.length > 1 ? Math.floor(poze.length / sec.length) : 0
  let k = 0
  sec.forEach((s, i) => {
    b.push(p(s.subtitlu, 'Heading2'))
    for (const x of s.paragrafe || []) b.push(p(x))
    if (i < sec.length - 1) { b.push(...poze.slice(k, k + intre).map((m) => pune(m, stare))); k += intre }
  })
  b.push(...poze.slice(k).map((m) => pune(m, stare)))

  if (c.cronologie?.length) {
    b.push(p('Cronologie', 'Heading2'))
    for (const x of c.cronologie) b.push(p(`${x.an} — ${x.eveniment}`, 'Aparat'))
  }
  if (c.figuri?.length) {
    b.push(p('Oameni', 'Heading2'))
    for (const x of c.figuri) b.push(p(`${x.nume} (${x.ani}), ${x.rol}. ${x.descriere}`, 'Aparat'))
  }
  if (c.cifre?.length) {
    b.push(p('Cifre', 'Heading2'))
    for (const x of c.cifre) b.push(p(`${x.valoare} — ${x.eticheta}. ${x.nota || ''}`.trim(), 'Aparat'))
  }
  if (c.citat?.text) {
    b.push(p('Citat', 'Heading2'))
    b.push(p(`„${c.citat.text}” — ${c.citat.autor}. ${c.citat.context || ''}`.trim(), 'Rezumat'))
  }
  if (c.controversa) { b.push(p('Ce se discută', 'Heading2')); b.push(p(c.controversa)) }
  b.push(saltPagina())
  return b.join('')
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

  const stare = { id: 0, nr: 0, rels: [] }
  const b = []
  b.push(p(TITLU, 'Titlu'), p(SUBTITLU, 'Subtitlu'), pgol(), p(AUTOR, 'Subtitlu'), saltPagina())
  cap.forEach((c, i) => b.push(sectiune(c, `Capitolul ${ROMAN[i + 1]}`, ILUSTRATII[c.id] || [], stare)))
  teme.forEach((c) => b.push(sectiune(c, 'Priviri transversale', ILUSTRATII[c.id] || [], stare)))
  /* plansa cartografica, la sfarsit */
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
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`)

  const dest = RAD + 'Istoria-Romaniei-manuscris.docx'
  rmSync(dest, { force: true })
  execFileSync('zip', ['-Xr9Dq', dest, '[Content_Types].xml', '_rels', 'docProps', 'word'], { cwd: OUT })
  return { dest, ilustratii: stare.nr, paragrafe: b.join('').split('<w:p').length - 1 }
}

if (process.argv[1]?.endsWith('docx.mjs')) {
  const continut = JSON.parse(readFileSync(new URL('../build/continut.json', import.meta.url), 'utf8'))
  const r = construiesteDocx(continut)
  console.log(`${r.dest.split('/').pop()} · ${(statSync(r.dest).size / 1048576).toFixed(1)} MB · ` +
    `${r.paragrafe} paragrafe · ${r.ilustratii} ilustrații`)
}
