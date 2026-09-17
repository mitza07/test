/* ===========================================================================
   ATLAS — geometria istorica a spatiului carpato-danubiano-pontic
   ---------------------------------------------------------------------------
   Contururile sunt date in coordonate reale [longitudine, latitudine] si se
   proiecteaza la randare. Fiecare hotar este definit O SINGURA DATA, ca
   segment intre doua noduri comune; regiunile si frontierele de stat se
   compun din aceleasi segmente, asa incat suprafetele se imbina exact si
   raman identice de la o harta la alta.

   Hotarele care merg pe apa nu mai sunt trasate din ochi: se decupeaza din
   cursurile adevarate — Dunarea, Prutul, Nistrul, Tisa, Oltul, Muresul,
   Siretul si linia tarmului — asa cum vin din Natural Earth. Raman desenate
   de mana numai hotarele de creasta si cele conventionale, care nu au sub ele
   niciun obiect natural dupa care sa fie luate.
   =========================================================================== */
import { RAURI, COASTA } from './hidro.js'

/* --- croirea unui hotar dupa cursul real ---------------------------------- */
const APA = { ...RAURI, tarm: COASTA }
const KMLAT = 111.2, KMLON = 78.1           /* grade -> km, la 45,5° latitudine */
const km = (a, b) => Math.hypot((b[0] - a[0]) * KMLON, (b[1] - a[1]) * KMLAT)
const rnd = (p) => [Math.round(p[0] * 1e3) / 1e3, Math.round(p[1] * 1e3) / 1e3]

/* Punctul de pe traseu cel mai apropiat de p: nu varful cel mai apropiat, ci
   proiectia pe latura, ca sa nu se piarda exactitatea unde firul e rar. */
function proiecteaza(fir, p) {
  let bun = { d: Infinity }
  for (let i = 0; i + 1 < fir.length; i++) {
    const a = fir[i], b = fir[i + 1]
    const dx = b[0] - a[0], dy = b[1] - a[1]
    let t = (dx || dy) ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy) : 0
    t = Math.max(0, Math.min(1, t))
    const q = [a[0] + t * dx, a[1] + t * dy]
    const d = km(p, q)
    if (d < bun.d) bun = { d, q, i, t }
  }
  return bun
}

/**
 * Bucata reala de apa dintre doua puncte, in sensul A -> B.
 * Se alege firul care trece cel mai aproape de amandoua, se taie intre
 * proiectiile lor, iar la capete se asaza exact punctele cerute. Nodurile de
 * apa ale atlasului sunt chiar proiectiile lor pe fir, asa ca substituirea nu
 * abate traseul cu nimic, dar pastreaza garantia veche: doua segmente care
 * pleaca din acelasi nod se inchid la virgula.
 */
/* Cat de departe de fir a cazut fiecare NOD impus ca si capat. Daca hidrografia
   se regenereaza cu alta toleranta, cursurile se misca putin, iar nodurile raman
   pe loc: lista asta scoate la iveala imediat nodurile ramase in urma, inainte
   sa se vada ca dunga alba intre doua regiuni. valida.mjs o citeste.
   Capetele care nu sunt noduri — colturile libere ale zonelor istorice — n-au ce
   cauta aici: ele sunt puse dinadins pe uscat, si sunt oricum singure. */
export const ABATERI = []
let NODURI = new Map()
const noteaza = (q, p, cheie) => {
  if (NODURI.has(p)) ABATERI.push({ nod: NODURI.get(p), apa: cheie, km: km(q, p) })
}

function peApa(cheie, A, B, opt = {}) {
  const fire = APA[cheie]
  if (!fire) throw new Error(`nu cunosc apa "${cheie}"`)
  let ales = null
  for (const fir of fire) {
    const a = proiecteaza(fir, A), b = proiecteaza(fir, B)
    if (!ales || a.d + b.d < ales.a.d + ales.b.d) ales = { fir, a, b }
  }
  const { fir, a, b } = ales
  const invers = a.i > b.i || (a.i === b.i && a.t > b.t)
  const [p, q] = invers ? [b, a] : [a, b]
  let out = [p.q, ...fir.slice(p.i + 1, q.i + 1), q.q].map(rnd)
  if (invers) out.reverse()
  if (opt.capA !== false) { noteaza(out[0], A, cheie); out[0] = A }
  if (opt.capB !== false) { noteaza(out[out.length - 1], B, cheie); out[out.length - 1] = B }
  const cap = out[0], coada = out[out.length - 1]
  /* un varf cazut peste capatul impus ar face un colt de nimic */
  return out.filter((pt, i) => i === 0 || i === out.length - 1 ||
    (km(pt, cap) > 0.4 && km(pt, coada) > 0.4))
}

/** Prefixul unui traseu, pana in dreptul unui punct. */
function panaLa(pct, p) {
  let k = 0, bun = Infinity
  pct.forEach((q, i) => { const d = km(q, p); if (d < bun) { bun = d; k = i } })
  return pct.slice(0, k + 1)
}

/* --- noduri: punctele in care se intalnesc trei sau mai multe hotare -------
   Cele care stau pe apa sunt asezate exact pe cursul real: altfel hotarul
   croit din rau ar porni de alaturi si ar lasa o dunga alba intre regiuni. */
const N = {
  halmeu:     [22.995, 48.112],  prislop:    [24.90, 47.79],
  satmarV:    [22.05, 47.55],    satmarE:    [23.60, 47.45],
  beba:       [20.26, 46.11],    nadlac:     [20.753, 46.142],
  zam:        [22.697, 45.949],  hateg:      [22.60, 45.45],
  orsova:     [22.416, 44.729],  turnuRosu:  [24.265, 45.532],
  turnuMag:   [24.774, 43.746],  vrancea:    [26.35, 45.68],
  galati:     [28.047, 45.407],  reni:       [28.202, 45.443],
  silistra:   [27.258, 44.136],  vamaVeche:  [28.578, 43.749],
  bucSV:      [25.50, 47.30],    herta:      [26.55, 48.28],
  horodistea: [26.704, 48.272],  hotin:      [26.601, 48.452],
  chilia:     [29.686, 45.194],  sulina:     [29.673, 45.136],
  liman:      [30.494, 46.080],  turtucaia:  [26.596, 44.089],
  bucE:       [26.20, 47.92],
  ekrene:     [28.072, 43.327],
  /* capatul de rasarit al hotarului pe Tisa: varsarea Viseului */
  viseu:      [24.148, 47.912],
  /* Ceatalul Chiliei, unde Dunarea se desface in bratele Deltei */
  ceatal:     [28.747, 45.231],
}

NODURI = new Map(Object.entries(N).map(([k, p]) => [p, k]))

/* --- segmente de hotar: fiecare porneste si se incheie intr-un nod --------- */
const S = {
  /* frontiera de nord: pe Tisa pana la varsarea Viseului, apoi pe creasta
     Muntilor Maramuresului pana in Prislop */
  tisa: [...peApa('tisa', N.halmeu, N.viseu), [24.42, 47.96], [24.70, 47.90], N.prislop],

  /* frontiera de nord-vest, cu Ungaria: Beba Veche -> Halmeu, cu doua opriri.
     Pana la Mures frontiera si malul se suprapun, asa ca ungV1 si mures1 sunt
     una si aceeasi linie. */
  ungV1: [N.beba, N.nadlac],
  ungV2: [N.nadlac, [21.05,46.55],[21.25,46.75],[21.32,46.98],[21.50,47.20],[21.75,47.42], N.satmarV],
  ungV3: [N.satmarV, [22.35,47.75],[22.65,47.87],[22.90,48.02], N.halmeu],

  /* frontiera de vest, cu Serbia: Dunare la Orsova -> Beba Veche */
  serb1: [N.orsova, [21.95,44.68],[21.66,44.73],[21.50,44.88],[21.42,45.20]],
  serb2: [[21.42,45.20],[21.10,45.30],[20.90,45.42],[20.78,45.75],[20.55,45.95], N.beba],

  /* Dunarea de sud, frontiera cu Bulgaria: Orsova -> gura Oltului -> Silistra */
  dunS1: peApa('dunare', N.orsova, N.turnuMag),
  dunS2: peApa('dunare', N.turnuMag, N.turtucaia),
  dunS3: peApa('dunare', N.turtucaia, N.silistra),

  /* Dunarea dobrogeana: Silistra -> Galati */
  dunD: peApa('dunare', N.silistra, N.galati),

  /* Dunarea intre Galati si gura Prutului */
  dunGR: peApa('dunare', N.galati, N.reni),

  /* bratul Chilia: gura Prutului -> Ceatalul Chiliei -> gura Musura */
  chiliaS0: [...peApa('dunare', N.reni, N.ceatal), ...peApa('chilia', N.ceatal, N.chilia).slice(1)],

  /* tarmul dintre gura Chiliei si gura Sulinei */
  chiliaCS: peApa('tarm', N.chilia, N.sulina),

  /* litoralul Marii Negre: Sulina -> Vama Veche -> Ekrene */
  coastaN: peApa('tarm', N.sulina, N.vamaVeche),
  coastaC: peApa('tarm', N.vamaVeche, N.ekrene),

  /* litoralul Bugeacului: limanul Nistrului -> gura Chiliei */
  coastaB: peApa('tarm', N.liman, N.chilia),

  /* frontiera de sud a Cadrilaterului, 1913-1940: Ekrene -> Turtucaia */
  cadrS: [N.ekrene, [27.50,43.45],[27.00,43.62],[26.72,43.88], N.turtucaia],

  /* frontiera de sud a Dobrogei, din 1878: Silistra -> Vama Veche */
  dobS: [N.silistra, [27.60,44.05],[27.95,43.95],[28.20,43.80], N.vamaVeche],

  /* Prutul: Horodistea -> gura Prutului */
  prut: peApa('prut', N.horodistea, N.reni),

  /* Nistrul: Hotin -> liman */
  nistru: peApa('nistru', N.hotin, N.liman),

  /* coltul de nord al Basarabiei: Herta -> Hotin, si Herta -> Horodistea */
  basN: [N.herta, N.hotin],
  hertaE: [N.herta, N.horodistea],

  /* frontiera Bucovinei de nord, 1918-1940: Prislop -> Herta */
  bucN: [N.prislop, [25.05,48.05],[24.95,48.32],[25.30,48.42],[25.80,48.45],[26.20,48.38], N.herta],

  /* frontiera de nord actuala, dupa 1940: Prislop -> Horodistea */
  nordAzi1: [N.prislop, [25.20,47.93],[25.70,47.95],[26.05,48.00], N.bucE],
  nordAzi2: [N.bucE, [26.50,48.10], N.horodistea],

  /* hotarul de sud si est al Bucovinei istorice: Bucovina de sud-vest -> Herta */
  bucSE1: [N.bucSV, [25.95,47.40],[26.30,47.70], N.bucE],
  bucSE2: [N.bucE, [26.45,48.00], N.herta],

  /* Carpatii Orientali: Prislop -> Bucovina SV -> Vrancea */
  carpO1: [N.prislop, [25.20,47.55], N.bucSV],
  carpO2: [N.bucSV, [25.75,47.00],[25.95,46.70],[26.10,46.40],[26.25,46.05],[26.40,45.80], N.vrancea],

  /* Carpatii Meridionali: Vrancea -> Turnu Rosu -> Hateg */
  carpM1: [N.vrancea, [26.30,45.55],[25.90,45.45],[25.50,45.45],[25.10,45.40],[24.70,45.45], N.turnuRosu],
  carpM2: [N.turnuRosu, [23.90,45.45],[23.50,45.35],[23.10,45.25],[22.80,45.30], N.hateg],

  /* Oltul: Turnu Rosu -> varsarea in Dunare */
  olt: peApa('olt', N.turnuRosu, N.turnuMag),

  /* Cerna si Mehedinti: Hateg -> Orsova */
  cerna: [N.hateg, [22.60,45.30],[22.52,45.00], N.orsova],

  /* Milcovul pana in Siret, apoi Siretul pana la Dunare: Vrancea -> Galati */
  milcov: [N.vrancea, [26.70,45.79],[27.00,45.78],
    ...peApa('siret', [27.20,45.74], N.galati, { capA: false })],

  /* marginea Apusenilor: Hateg -> Zam -> Satmar est -> Prislop */
  apus1: [N.hateg, [22.72,45.70], N.zam],
  apus2: [N.zam, [22.85,46.40],[23.00,46.70],[23.20,47.00],[23.35,47.28], N.satmarE],
  apus3: [N.satmarE, [24.10,47.60],[24.60,47.70], N.prislop],

  /* Muresul, hotarul de nord al Banatului: Beba Veche -> Nadlac -> Zam */
  mures1: [N.beba, N.nadlac],
  mures2: peApa('mures', N.nadlac, N.zam),

  /* hotarul Crisana / Maramures-Satmar: Satmar vest -> Satmar est */
  satmar: [N.satmarV, [22.55,47.52],[23.10,47.48], N.satmarE],
}

/* --- compunere ------------------------------------------------------------ */
export const rev = (a) => a.slice().reverse()
export function ring(...segs) {
  const out = []
  for (const s of segs) for (const pt of s) {
    const last = out[out.length - 1]
    if (!last || last[0] !== pt[0] || last[1] !== pt[1]) out.push(pt)
  }
  const first = out[0], last = out[out.length - 1]
  if (out.length > 2 && first[0] === last[0] && first[1] === last[1]) out.pop()
  return out
}

/* --- regiunile istorice --------------------------------------------------- */
export const REGIUNI = {
  maramures: { nume: 'Maramureș', eticheta: [23.35, 47.78],
    ring: ring(S.ungV3, S.tisa, rev(S.apus3), rev(S.satmar)) },

  crisana: { nume: 'Crișana', eticheta: [21.90, 46.85],
    ring: ring(S.ungV2, S.satmar, rev(S.apus2), rev(S.mures2)) },

  banat: { nume: 'Banat', eticheta: [21.40, 45.55],
    ring: ring(S.mures1, S.mures2, rev(S.apus1), S.cerna, S.serb1, S.serb2) },

  transilvania: { nume: 'Transilvania', eticheta: [24.30, 46.60],
    ring: ring(S.apus1, S.apus2, S.apus3, S.carpO1, S.carpO2, S.carpM1, S.carpM2) },

  bucovina: { nume: 'Bucovina', eticheta: [25.55, 48.20],
    ring: ring(S.bucN, rev(S.bucSE2), rev(S.bucSE1), rev(S.carpO1)) },

  bucovinaSud: { nume: 'Bucovina de Sud', eticheta: [25.60, 47.62],
    ring: ring(S.nordAzi1, rev(S.bucSE1), rev(S.carpO1)) },

  bucovinaNord: { nume: 'Bucovina de Nord', eticheta: [25.55, 48.22],
    ring: ring(S.bucN, rev(S.bucSE2), rev(S.nordAzi1)) },

  moldova: { nume: 'Moldova', eticheta: [27.20, 46.75],
    ring: ring(S.bucSE1, S.bucSE2, S.hertaE, S.prut, rev(S.dunGR), rev(S.milcov), rev(S.carpO2)) },

  basarabia: { nume: 'Basarabia', eticheta: [28.95, 47.00],
    ring: ring(S.nistru, S.coastaB, rev(S.chiliaCS), rev(S.chiliaS0), rev(S.prut), rev(S.hertaE), S.basN) },

  muntenia: { nume: 'Muntenia', eticheta: [26.00, 44.80],
    ring: ring(rev(S.carpM1), S.milcov, rev(S.dunD), rev(S.dunS3), rev(S.dunS2), rev(S.olt)) },

  oltenia: { nume: 'Oltenia', eticheta: [23.60, 44.55],
    ring: ring(S.olt, rev(S.dunS1), rev(S.cerna), rev(S.carpM2)) },

  dobrogea: { nume: 'Dobrogea', eticheta: [28.35, 44.80],
    ring: ring(S.dunD, S.dunGR, S.chiliaS0, S.chiliaCS, S.coastaN, rev(S.dobS)) },

  cadrilater: { nume: 'Cadrilater', eticheta: [27.60, 43.85],
    ring: ring(S.dobS, S.coastaC, S.cadrS, S.dunS3) },
}

/* --- frontierele de stat, compuse din aceleasi segmente ------------------- */
export const FRONTIERE = {
  /* Romania Mare, 1920-1940 */
  romaniaMare: ring(S.ungV1, S.ungV2, S.ungV3, S.tisa, S.bucN, S.basN, S.nistru, S.coastaB,
    S.chiliaCS, S.coastaN, S.coastaC, S.cadrS, rev(S.dunS2), rev(S.dunS1), S.serb1, S.serb2),

  /* Romania de azi */
  romaniaAzi: ring(S.ungV1, S.ungV2, S.ungV3, S.tisa, S.nordAzi1, S.nordAzi2, S.prut, S.chiliaS0, S.chiliaCS,
    S.coastaN, rev(S.dobS), rev(S.dunS3), rev(S.dunS2), rev(S.dunS1), S.serb1, S.serb2),

  /* Regatul Romaniei, 1878-1913 */
  regat1878: ring(S.bucSE1, S.bucSE2, S.hertaE, S.prut, S.chiliaS0, S.chiliaCS, S.coastaN, rev(S.dobS),
    rev(S.dunS3), rev(S.dunS2), rev(S.dunS1), rev(S.cerna), rev(S.carpM2), rev(S.carpM1), rev(S.carpO2)),

  /* Principatele Unite, 1859-1878: fara Dobrogea, cu sudul Basarabiei */
  principate1859: ring(S.bucSE1, S.bucSE2, S.hertaE, S.prut, rev(S.dunGR), rev(S.dunD), rev(S.dunS3),
    rev(S.dunS2), rev(S.dunS1), rev(S.cerna), rev(S.carpM2), rev(S.carpM1), rev(S.carpO2)),

  /* Tara Romaneasca */
  taraRomaneasca: ring(S.milcov, rev(S.dunD), rev(S.dunS3), rev(S.dunS2), rev(S.dunS1),
    rev(S.cerna), rev(S.carpM2), rev(S.carpM1)),

  /* Moldova medievala, de la munte pana la mare */
  moldovaMedievala: ring(S.bucN, S.basN, S.nistru, S.coastaB, rev(S.chiliaCS), rev(S.chiliaS0),
    rev(S.dunGR), rev(S.milcov), rev(S.carpO2), rev(S.carpO1)),

  /* Moldova dupa 1812: intre Carpati si Prut, fara Bucovina */
  moldovaVest: ring(S.bucSE1, S.bucSE2, S.hertaE, S.prut, rev(S.dunGR), rev(S.milcov), rev(S.carpO2), rev(S.carpO1), S.carpO1),

  /* Principatul Transilvaniei, cu Partium, Maramures si Banat */
  principatTransilvania: ring(S.ungV1, S.ungV2, S.ungV3, S.tisa, S.carpO1, S.carpO2,
    S.carpM1, S.carpM2, S.cerna, S.serb1, S.serb2),
}
FRONTIERE.moldovaVest = ring(S.bucSE1, S.bucSE2, S.hertaE, S.prut, rev(S.dunGR), rev(S.milcov), rev(S.carpO2))

/* --- suprafete istorice care nu urmeaza hotarele regionale ----------------
   Si aici hotarul de apa se ia din segmentele deja croite, nu se copiaza de
   mana: altfel Moesia ar ramane cu Dunarea veche, desenata din ochi, si ar
   iesi o dunga alba intre ea si Oltenia pe harta pe care apar amandoua. */
export const ZONE = {
  /* stapanirea lui Burebista la apogeu, c. 60-44 i.Hr. (aproximativa) */
  daciaBurebista: ring(
    [[20.30,45.10],[20.10,45.90],[20.60,46.60],[21.40,47.20],[22.30,47.80],[23.30,48.30],
     [24.40,48.60],[25.60,48.80],[27.00,48.80],[28.40,48.50],[29.60,47.90],[30.60,47.10],
     [31.60,46.70],[32.00,46.30],[31.20,46.00]],
    peApa('tarm', [31.20,46.00], [27.95,43.18]),
    [[27.60,43.20],[26.80,43.15],[26.00,43.25],[25.20,43.35],[24.40,43.45],[23.60,43.60],
     [22.90,43.85],[22.20,44.10],[21.40,44.50],[20.70,44.80]]),

  /* nucleul regatului dac: Muntii Orastiei */
  muntiiOrastiei: [[22.90,45.85],[23.60,45.95],[23.90,45.70],[23.60,45.40],[23.00,45.35],[22.70,45.60]],

  /* provincia Dacia romana, cu limes-ul de vest si Limes Transalutanus */
  daciaRomana: ring(
    [[21.30,46.15],[21.60,46.55],[22.00,46.95],[22.60,47.25],[23.15,47.18],[23.70,47.30],
     [24.30,47.25],[24.80,47.05],[25.30,46.75],[25.70,46.35],[26.00,45.95],[26.30,45.60],
     [25.90,45.45],[25.50,45.45],[25.10,45.40],[25.10,45.00],[25.20,44.50],[25.30,44.00]],
    peApa('dunare', [25.35,43.68], N.orsova), S.serb1, [[21.30,45.55],[21.20,45.90]]),

  /* Moesia Inferior si Scythia Minor, sud de Dunare */
  moesia: ring(
    peApa('dunare', [23.55,43.85], N.silistra),
    S.dobS, S.coastaC,
    [[27.92,43.20],[27.50,43.10],[26.80,43.00],[26.00,43.00],[25.20,43.05],[24.40,43.10],
     [23.70,43.25],[23.45,43.55]]),

  /* sudul Basarabiei retrocedat Moldovei intre 1856 si 1878 */
  bugeacSud: ring(
    [[28.22,46.20],[28.60,46.10],[29.20,45.95]],
    peApa('tarm', [29.60,45.90], N.chilia),
    rev(S.chiliaS0),
    rev(peApa('prut', [28.22,46.20], N.reni))),

  /* Transnistria sub administratie romaneasca, 1941-1944 */
  transnistria: ring(
    peApa('nistru', [27.785,48.442], N.liman),
    [[30.90,46.30],[31.60,46.60],[32.20,47.00],[31.80,47.60],[30.90,48.05],[29.80,48.50],[28.60,48.65]]),

  /* nord-vestul Transilvaniei, cedat Ungariei prin Dictatul de la Viena */
  vienaNV: ring(
    [[21.60,46.72],[22.10,46.68],[22.60,46.72],[23.10,46.72],[23.50,46.70],[23.72,46.65],
     [24.10,46.55],[24.45,46.50],[24.75,46.40],[25.05,46.30],[25.30,46.10],[25.55,45.95],
     [25.80,45.83],[26.05,45.85],[26.25,45.75]],
    rev(S.carpO2), rev(S.carpO1), rev(S.tisa), rev(S.ungV3),
    panaLa(rev(S.ungV2), [21.25,46.75])),
}

/* --- frontiere ale vecinilor, pentru context ------------------------------ */
export const VECINI = {
  ungariaSerbia: [[20.26,46.11],[19.60,46.17],[19.10,46.15],[18.85,45.90]],
  serbiaBulgaria: [[22.70,44.25],[22.55,43.80],[22.45,43.40],[22.55,43.00],[22.35,42.75],[22.35,42.30]],
  bulgariaTurcia: [[28.03,41.98],[27.50,41.95],[26.95,41.72],[26.35,41.72],[26.05,41.35]],
  bulgariaGrecia: [[26.05,41.35],[25.20,41.30],[24.50,41.40],[23.80,41.40],[23.00,41.35],[22.35,42.30]],
  ungariaUcraina: [...rev(panaLa(rev(peApa('tisa', [21.40,48.03], N.halmeu)), [22.15,48.32])), [20.90,48.55]],
  ucrainaPoloniaSlovacia: [[21.40,48.00],[22.00,48.40],[22.60,49.10]],
  moldovaUcrainaN: [[26.60,48.45],[26.20,48.70],[25.60,49.00]],
}

/* --- orase, cetati si situri (longitudine, latitudine, nume) -------------- */
export const L = {
  /* antichitate */
  sarmizegetusa: [23.31,45.62,'Sarmizegetusa Regia'], ulpia: [22.79,45.51,'Ulpia Traiana'],
  apulum: [23.58,46.07,'Apulum'], napoca: [23.60,46.77,'Napoca'], potaissa: [23.79,46.57,'Potaissa'],
  porolissum: [23.15,47.18,'Porolissum'], drobeta: [22.66,44.63,'Drobeta'], romula: [24.35,44.28,'Romula'],
  tibiscum: [22.19,45.45,'Tibiscum'], sucidava: [24.51,43.78,'Sucidava'], dierna: [22.42,44.72,'Dierna'],
  histria: [28.77,44.55,'Histria'], tomis: [28.65,44.17,'Tomis'], callatis: [28.58,43.82,'Callatis'],
  adamclisi: [27.95,44.09,'Tropaeum Traiani'], durostorum: [27.27,44.11,'Durostorum'],
  novae: [25.39,43.62,'Novae'], viminacium: [21.23,44.74,'Viminacium'], singidunum: [20.45,44.82,'Singidunum'],
  olbia: [31.90,46.69,'Olbia'], dionysopolis: [28.15,43.42,'Dionysopolis'],
  costesti: [23.15,45.68,'Costești'], piatraRosie: [23.05,45.60,'Piatra Roșie'], capalna: [23.65,45.80,'Căpâlna'],
  argedava: [25.95,44.35,'Argedava'], piroboridava: [27.30,46.05,'Piroboridava'],
  /* medieval si modern */
  bucuresti: [26.10,44.43,'București'], iasi: [27.60,47.16,'Iași'], suceava: [26.25,47.65,'Suceava'],
  targoviste: [25.46,44.93,'Târgoviște'], curteaArges: [24.68,45.14,'Curtea de Argeș'],
  albaIulia: [23.58,46.07,'Alba Iulia'], cluj: [23.60,46.77,'Cluj'], sibiu: [24.15,45.80,'Sibiu'],
  brasov: [25.61,45.65,'Brașov'], timisoara: [21.23,45.75,'Timișoara'], oradea: [21.92,47.07,'Oradea'],
  craiova: [23.80,44.32,'Craiova'], constanta: [28.65,44.17,'Constanța'], galatiO: [28.03,45.45,'Galați'],
  braila: [27.96,45.27,'Brăila'], giurgiu: [25.97,43.90,'Giurgiu'], turnu: [24.87,43.75,'Turnu'],
  severin: [22.66,44.63,'Severin'], chisinau: [28.86,47.01,'Chișinău'], cernauti: [25.93,48.29,'Cernăuți'],
  cetateaAlba: [30.35,46.19,'Cetatea Albă'], chiliaO: [29.27,45.45,'Chilia'], tighina: [29.47,46.83,'Tighina'],
  hotinO: [26.49,48.51,'Hotin'], ismail: [28.84,45.35,'Ismail'], akkerman: [30.35,46.19,'Akkerman'],
  ploiesti: [26.03,44.94,'Ploiești'], sighet: [23.89,47.93,'Sighet'], targuMures: [24.56,46.54,'Târgu Mureș'],
  blaj: [23.92,46.18,'Blaj'], focsani: [27.18,45.70,'Focșani'], satuMare: [22.88,47.79,'Satu Mare'],
  aradO: [21.31,46.18,'Arad'], resita: [21.89,45.30,'Reșița'], baiaMare: [23.58,47.66,'Baia Mare'],
  bacau: [26.91,46.57,'Bacău'], pitesti: [24.87,44.86,'Pitești'], sfGheorghe: [25.79,45.87,'Sf. Gheorghe'],
  miercurea: [25.80,46.36,'Miercurea Ciuc'], deva: [22.91,45.88,'Deva'], hunedoara: [22.90,45.75,'Hunedoara'],
  ramnicu: [24.37,45.10,'Râmnicu Vâlcea'], sighisoara: [24.79,46.22,'Sighișoara'], bistrita: [24.49,47.13,'Bistrița'],
  /* batalii si locuri de eveniment */
  posada: [24.70,45.30,'Posada'], rovine: [23.80,44.30,'Rovine'], nicopole: [24.89,43.71,'Nicopole'],
  varna: [27.92,43.20,'Varna'], kosovo: [21.10,42.65,'Kosovo'], belgrad: [20.45,44.82,'Belgrad'],
  vaslui: [27.73,46.64,'Podul Înalt'], razboieni: [26.42,47.05,'Valea Albă'], cosmin: [25.90,48.10,'Codrii Cosminului'],
  baia: [26.20,47.42,'Baia'], calugareni: [25.98,44.17,'Călugăreni'], selimbar: [24.15,45.75,'Șelimbăr'],
  miraslau: [23.75,46.35,'Mirăslău'], guruslau: [23.05,47.25,'Guruslău'], turda: [23.79,46.57,'Turda'],
  mohacs: [18.68,45.99,'Mohács'], stanilesti: [28.15,46.60,'Stănilești'], marasesti: [27.23,45.88,'Mărășești'],
  marasti: [26.85,45.95,'Mărăști'], oituz: [26.35,46.15,'Oituz'], turtucaiaB: [26.60,44.06,'Turtucaia'],
  plevna: [24.62,43.42,'Plevna'], grivita: [24.65,43.45,'Grivița'], smardan: [22.85,43.75,'Smârdan'],
  odesa: [30.73,46.48,'Odesa'], cotulDonului: [42.20,49.00,'Cotul Donului'], stalingrad: [44.50,48.70,'Stalingrad'],
  bobalna: [23.65,47.05,'Bobâlna'], pades: [22.85,45.05,'Padeș'], islaz: [24.74,43.75,'Islaz'],
}
