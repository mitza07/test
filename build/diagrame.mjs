/* ===========================================================================
   Diagramele volumului. Fiecare marca este asezata pe o singura scara,
   fiecare eticheta numeste o valoare pe care graficul chiar o atinge.
   =========================================================================== */
const f = (n) => Math.round(n * 100) / 100
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const nr = (n) => n.toLocaleString('ro-RO')

/* --- suprafata statului roman, in kilometri patrati ---------------------- */
export const TERITORIU = [
  { an: 1859, km: 121913, ce: 'Principatele Unite' },
  { an: 1878, km: 131353, ce: 'Dobrogea în schimbul sudului Basarabiei' },
  { an: 1913, km: 138765, ce: 'Cadrilaterul' },
  { an: 1918, km: 295049, ce: 'Basarabia, Bucovina, Transilvania' },
  { an: 1940, km: 195311, ce: 'Trei cedări în zece săptămâni' },
  { an: 1947, km: 237500, ce: 'Nordul Transilvaniei revine' },
  { an: 2026, km: 238397, ce: 'Frontierele actuale' },
]

/* --- populatia la recensaminte, in milioane ------------------------------ */
export const POPULATIE = [
  { an: 1859, v: 3.86, n: 'Principatele Unite' }, { an: 1899, v: 5.96, n: 'Regatul' },
  { an: 1912, v: 7.23, n: 'Regatul' }, { an: 1930, v: 18.06, n: 'România Mare' },
  { an: 1948, v: 15.87, n: 'după pierderi și război' }, { an: 1956, v: 17.49 },
  { an: 1966, v: 19.10, n: 'anul decretului 770' }, { an: 1977, v: 21.56 },
  { an: 1992, v: 22.81, n: 'maximul istoric' }, { an: 2002, v: 21.68 },
  { an: 2011, v: 20.12 }, { an: 2021, v: 19.05, n: 'ultimul recensământ' },
]

/* --- straturile lexicale ale limbii romane -------------------------------- */
export const LEXIC = [
  { et: 'Latină moștenită', v: 30.33, c: 'var(--voronet)' },
  { et: 'Franceză', v: 22.12, c: 'var(--m-a)' },
  { et: 'Latină savantă', v: 15.26, c: 'var(--m-c)' },
  { et: 'Slavonă veche', v: 9.18, c: 'var(--aur)' },
  { et: 'Germană', v: 2.47, c: 'var(--m-d)' },
  { et: 'Bulgară', v: 2.17, c: 'var(--m-b)' },
  { et: 'Italiană', v: 1.72, c: 'var(--verde)' },
  { et: 'Maghiară', v: 1.43, c: 'var(--m-e)' },
  { et: 'Rusă', v: 1.12, c: 'var(--violet)' },
  { et: 'Sârbo-croată', v: 1.12, c: 'var(--m-f)' },
  { et: 'Greacă', v: 0.91, c: 'var(--chinovar)' },
  { et: 'Turcă', v: 0.85, c: 'var(--m-b)' },
  { et: 'Alte origini și etimologie nesigură', v: 11.32, c: 'var(--muted)' },
]

/* --- compozitia etnica, 1930 fata de 2021 -------------------------------- */
export const ETNIC = {
  1930: [['Români', 71.9], ['Maghiari', 7.9], ['Germani', 4.1], ['Evrei', 4.0],
         ['Ucraineni și ruteni', 3.2], ['Ruși', 2.3], ['Bulgari', 2.0], ['Romi', 1.5], ['Alții', 3.1]],
  2021: [['Români', 89.3], ['Maghiari', 6.0], ['Romi', 3.4], ['Ucraineni', 0.3],
         ['Germani', 0.2], ['Turci', 0.2], ['Alții', 0.6]],
}
const CULORI = ['var(--voronet)', 'var(--m-b)', 'var(--m-d)', 'var(--m-c)', 'var(--m-a)',
                'var(--chinovar)', 'var(--verde)', 'var(--violet)', 'var(--muted)']

/* ======================================================================== */
export function diagramaTeritoriu() {
  const W = 880, H = 340, ml = 62, mr = 128, mt = 26, mb = 44
  const x0 = ml, x1 = W - mr, y0 = mt, y1 = H - mb
  const A0 = 1855, A1 = 2030, VMAX = 320000
  const X = (a) => x0 + ((a - A0) / (A1 - A0)) * (x1 - x0)
  const Y = (v) => y1 - (v / VMAX) * (y1 - y0)
  const s = []
  for (const g of [0, 100000, 200000, 300000]) {
    s.push(`<line class="d-grid" x1="${x0}" y1="${f(Y(g))}" x2="${x1}" y2="${f(Y(g))}"/>`,
      `<text class="d-et" x="${x0 - 8}" y="${f(Y(g) + 3.5)}" text-anchor="end">${g ? nr(g / 1000) + '.000' : '0'}</text>`)
  }
  /* treapta: suprafata ramane constanta pana la urmatoarea schimbare */
  const pts = []
  TERITORIU.forEach((d, i) => {
    const nx = i + 1 < TERITORIU.length ? TERITORIU[i + 1].an : A1 - 4
    pts.push([X(d.an), Y(d.km)], [X(nx), Y(d.km)])
  })
  s.push(`<path class="d-arie" d="M${f(pts[0][0])} ${y1}` + pts.map((p) => `L${f(p[0])} ${f(p[1])}`).join('') + `L${f(pts[pts.length - 1][0])} ${y1}Z"/>`)
  s.push(`<path class="d-linie" d="M` + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + `"/>`)
  TERITORIU.forEach((d) => {
    s.push(`<circle class="d-pct" cx="${f(X(d.an))}" cy="${f(Y(d.km))}" r="3"/>`)
    s.push(`<text class="d-et" x="${f(X(d.an))}" y="${y1 + 16}" text-anchor="middle">${d.an === 2026 ? 'azi' : d.an}</text>`)
  })
  /* etichete la dreapta, pentru cele trei praguri care conteaza */
  const marc = [
    { an: 1918, km: 295049, t: '295.049 km²', u: 'România Mare' },
    { an: 1940, km: 195311, t: '195.311 km²', u: 'după cedări' },
    { an: 2026, km: 238397, t: '238.397 km²', u: 'azi' },
  ]
  marc.forEach((m) => {
    s.push(`<line class="d-marc" x1="${f(X(m.an))}" y1="${f(Y(m.km))}" x2="${x1 + 6}" y2="${f(Y(m.km))}"/>`,
      `<text class="d-et-b" x="${x1 + 10}" y="${f(Y(m.km) - 1)}">${m.t}</text>`,
      `<text class="d-et" x="${x1 + 10}" y="${f(Y(m.km) + 12)}">${esc(m.u)}</text>`)
  })
  s.push(`<line class="d-ax" x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}"/>`)
  s.push(`<text class="d-et" x="${x0 - 8}" y="${y0 - 8}" text-anchor="start">km²</text>`)
  return { vb: `0 0 ${W} ${H}`, body: s.join('') }
}

/* ======================================================================== */
export function diagramaPopulatie() {
  const W = 880, H = 320, ml = 44, mr = 116, mt = 26, mb = 44
  const x0 = ml, x1 = W - mr, y0 = mt, y1 = H - mb
  const A0 = 1850, A1 = 2030, VMAX = 24
  const X = (a) => x0 + ((a - A0) / (A1 - A0)) * (x1 - x0)
  const Y = (v) => y1 - (v / VMAX) * (y1 - y0)
  const s = []
  for (const g of [0, 5, 10, 15, 20]) {
    s.push(`<line class="d-grid" x1="${x0}" y1="${f(Y(g))}" x2="${x1}" y2="${f(Y(g))}"/>`,
      `<text class="d-et" x="${x0 - 8}" y="${f(Y(g) + 3.5)}" text-anchor="end">${g}</text>`)
  }
  const P = POPULATIE.map((d) => [X(d.an), Y(d.v)])
  s.push(`<path class="d-arie" d="M${f(P[0][0])} ${y1}` + P.map((p) => `L${f(p[0])} ${f(p[1])}`).join('') + `L${f(P[P.length - 1][0])} ${y1}Z"/>`)
  s.push(`<path class="d-linie" d="M` + P.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + `"/>`)
  POPULATIE.forEach((d, i) => {
    s.push(`<circle class="d-pct" cx="${f(P[i][0])}" cy="${f(P[i][1])}" r="${d.n ? 3.4 : 2.4}"/>`)
    if (d.n) s.push(`<text class="d-et" x="${f(P[i][0])}" y="${f(P[i][1] - 9)}" text-anchor="middle">${d.v.toFixed(2).replace('.', ',')}</text>`)
  })
  for (const a of [1859, 1900, 1930, 1950, 1977, 2000, 2021]) {
    s.push(`<text class="d-et" x="${f(X(a))}" y="${y1 + 16}" text-anchor="middle">${a}</text>`)
  }
  /* prabusirea de dupa 1992 */
  s.push(`<line class="d-marc" x1="${f(X(1992))}" y1="${f(Y(22.81))}" x2="${f(X(1992))}" y2="${f(Y(19.05))}"/>`)
  s.push(`<text class="d-et-b" x="${x1 + 10}" y="${f(Y(21.2))}">−3,8 milioane</text>`)
  s.push(`<text class="d-et" x="${x1 + 10}" y="${f(Y(21.2)) + 13}">între 1992 și 2021</text>`)
  s.push(`<line class="d-ax" x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}"/>`)
  s.push(`<text class="d-et" x="${x0 - 8}" y="${y0 - 8}" text-anchor="start">milioane de locuitori</text>`)
  return { vb: `0 0 ${W} ${H}`, body: s.join('') }
}

/* ======================================================================== */
export function diagramaLexic() {
  const W = 880, H = 190, ml = 4, mr = 4, mt = 34, mb = 8
  const x0 = ml, x1 = W - mr
  const total = LEXIC.reduce((a, b) => a + b.v, 0)
  let x = x0
  const s = [], sub = []
  const BH = 40
  LEXIC.forEach((d, i) => {
    const w = (d.v / total) * (x1 - x0)
    s.push(`<rect x="${f(x)}" y="${mt}" width="${f(w)}" height="${BH}" fill="${d.c}"/>`)
    if (w > 40) s.push(`<text class="d-et" x="${f(x + w / 2)}" y="${mt + BH / 2 + 4}" text-anchor="middle" fill="var(--surface)" font-weight="600">${d.v.toFixed(1).replace('.', ',')}%</text>`)
    /* legenda pe doua randuri sub bara */
    const col = i % 5, rand = Math.floor(i / 5)
    const lx = x0 + col * ((x1 - x0) / 5), ly = mt + BH + 26 + rand * 17
    sub.push(`<rect x="${f(lx)}" y="${f(ly - 8)}" width="9" height="9" fill="${d.c}"/>`,
      `<text class="d-et" x="${f(lx + 14)}" y="${f(ly)}">${esc(d.et)} · ${d.v.toFixed(2).replace('.', ',')}%</text>`)
    x += w
  })
  s.push(`<text class="d-et-b" x="${x0}" y="20">Vocabularul reprezentativ al limbii române — 2.581 de cuvinte</text>`)
  return { vb: `0 0 ${W} ${mt + BH + 26 + 3 * 17}`, body: s.join('') + sub.join('') }
}

/* ======================================================================== */
export function diagramaEtnic() {
  const W = 880, BH = 46, gap = 62, ml = 60, mr = 4, mt = 26
  const x0 = ml, x1 = W - mr
  const s = []
  let y = mt
  for (const an of ['1930', '2021']) {
    const date = ETNIC[an]
    let x = x0
    s.push(`<text class="d-et-b" x="${x0 - 10}" y="${f(y + BH / 2 + 4)}" text-anchor="end">${an}</text>`)
    date.forEach((d, i) => {
      const w = (d[1] / 100) * (x1 - x0)
      s.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${BH}" fill="${CULORI[i % CULORI.length]}"/>`)
      if (w > 46) s.push(`<text class="d-et" x="${f(x + w / 2)}" y="${f(y + BH / 2 + 4)}" text-anchor="middle" fill="var(--surface)" font-weight="600">${String(d[1]).replace('.', ',')}%</text>`)
      if (w > 24) s.push(`<text class="d-et" x="${f(x + w / 2)}" y="${f(y + BH + 14)}" text-anchor="middle">${esc(d[0])}</text>`)
      x += w
    })
    y += BH + gap
  }
  s.push(`<text class="d-et" x="${x0}" y="16">Ponderea grupurilor etnice declarate, la recensămintele din 1930 și 2021</text>`)
  return { vb: `0 0 ${W} ${y - gap + BH + 24}`, body: s.join('') }
}

/* ======================================================================== */
/* Cronograma: 3.000 de ani la scara reala. Arata cat de scurt este in timp
   secolul care ocupa cea mai mare parte a textului.                        */
export function cronograma(capitole) {
  const W = 1160, H = 108, ml = 2, mr = 2, mt = 30, hb = 30
  const x0 = ml, x1 = W - mr
  const A0 = -1000, A1 = 2026
  const X = (a) => x0 + ((a - A0) / (A1 - A0)) * (x1 - x0)
  const s = []
  capitole.forEach((c, i) => {
    const a = Math.max(A0, c.de), b = Math.min(A1, c.la)
    const w = X(b) - X(a)
    s.push(`<a href="#${c.id}"><rect x="${f(X(a))}" y="${mt}" width="${f(Math.max(w, 1.2))}" height="${hb}" fill="${i % 2 ? 'var(--voronet)' : 'var(--m-a)'}" opacity="${0.55 + (i / capitole.length) * 0.45}"><title>${esc(c.titlu)} · ${esc(c.per)}</title></rect></a>`)
  })
  const ticks = [-1000, -500, 0, 500, 1000, 1500, 1800, 1900, 2000]
  ticks.forEach((t) => {
    s.push(`<line class="d-ax" x1="${f(X(t))}" y1="${mt + hb}" x2="${f(X(t))}" y2="${mt + hb + 5}"/>`,
      `<text class="d-et" x="${f(X(t))}" y="${mt + hb + 18}" text-anchor="${t === -1000 ? 'start' : t === 2000 ? 'end' : 'middle'}">${t < 0 ? Math.abs(t) + ' î.Hr.' : t === 0 ? '1' : t}</text>`)
  })
  s.push(`<text class="d-et-b" x="${x0}" y="17">3.026 de ani, la scară</text>`)
  s.push(`<line class="d-marc" x1="${f(X(1918))}" y1="${mt - 8}" x2="${f(X(1918))}" y2="${mt + hb + 2}"/>`)
  s.push(`<text class="d-et-marc" x="${f(X(1918)) - 5}" y="${mt - 11}" text-anchor="end">1918</text>`)
  return { vb: `0 0 ${W} ${H}`, body: s.join('') }
}
