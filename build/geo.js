/* ===========================================================================
   ATLAS — geometria istorica a spatiului carpato-danubiano-pontic
   ---------------------------------------------------------------------------
   Contururile sunt date in coordonate reale [longitudine, latitudine] si se
   proiecteaza la randare. Fiecare hotar este definit O SINGURA DATA, ca
   segment intre doua noduri comune; regiunile si frontierele de stat se
   compun din aceleasi segmente, asa incat suprafetele se imbina exact si
   raman identice de la o harta la alta.
   =========================================================================== */

/* --- noduri: punctele in care se intalnesc trei sau mai multe hotare ------- */
const N = {
  halmeu:     [23.00, 48.10],  prislop:    [24.90, 47.79],
  satmarV:    [22.05, 47.55],  satmarE:    [23.60, 47.45],
  beba:       [20.26, 46.11],  nadlac:     [20.85, 46.17],
  zam:        [22.70, 46.10],  hateg:      [22.60, 45.45],
  orsova:     [22.42, 44.72],  turnuRosu:  [24.30, 45.55],
  turnuMag:   [24.87, 43.75],  vrancea:    [26.35, 45.68],
  galati:     [28.03, 45.45],  reni:       [28.19, 45.47],
  silistra:   [27.27, 44.11],  vamaVeche:  [28.57, 43.75],
  bucSV:      [25.50, 47.30],  herta:      [26.55, 48.28],
  horodistea: [26.70, 48.25],  hotin:      [26.60, 48.45],
  chilia:     [29.65, 45.42],  sulina:     [29.70, 45.30],
  liman:      [30.55, 46.05],  turtucaia:  [26.60, 44.06],
  bucE:       [26.20, 47.92],
  ekrene:     [28.03, 43.35],
}

/* --- segmente de hotar: fiecare porneste si se incheie intr-un nod --------- */
const S = {
  /* frontiera de nord, pe Tisa: Halmeu -> Prislop */
  tisa: [N.halmeu, [23.35,48.08],[23.63,47.99],[23.90,47.94],[24.20,47.94],[24.60,47.93], N.prislop],

  /* frontiera de nord-vest, cu Ungaria: Beba Veche -> Halmeu, cu doua opriri */
  ungV1: [N.beba, [20.75,46.30], N.nadlac],
  ungV2: [N.nadlac, [21.05,46.55],[21.25,46.75],[21.32,46.98],[21.50,47.20],[21.75,47.42], N.satmarV],
  ungV3: [N.satmarV, [22.35,47.75],[22.65,47.87],[22.90,48.02], N.halmeu],

  /* frontiera de vest, cu Serbia: Dunare la Orsova -> Beba Veche */
  serb1: [N.orsova, [21.95,44.68],[21.66,44.73],[21.50,44.88],[21.42,45.20]],
  serb2: [[21.42,45.20],[21.10,45.30],[20.90,45.42],[20.78,45.75],[20.55,45.95], N.beba],

  /* Dunarea de sud, frontiera cu Bulgaria: Orsova -> Turnu Magurele -> Silistra */
  dunS1: [N.orsova, [22.55,44.55],[22.70,44.25],[22.95,43.99],[23.30,43.87],[23.80,43.80],[24.35,43.72], N.turnuMag],
  dunS2: [N.turnuMag, [25.36,43.66],[25.97,43.90],[26.10,43.95], N.turtucaia],
  dunS3: [N.turtucaia, [26.90,44.10], N.silistra],

  /* Dunarea dobrogeana: Silistra -> Galati -> gura Prutului */
  dunD: [N.silistra, [27.33,44.20],[27.85,44.28],[27.95,44.69],[28.00,44.95],[27.96,45.27], N.galati],

  /* bratul Chilia: gura Prutului -> gura Chiliei -> Sulina */
  chiliaS0: [N.reni, [28.50,45.38],[28.90,45.35],[29.30,45.35], N.chilia],
  chiliaCS: [N.chilia, N.sulina],

  /* Dunarea intre Galati si gura Prutului */
  dunGR: [N.galati, N.reni],

  /* litoralul Marii Negre: Sulina -> Vama Veche -> Ekrene */
  coastaN: [N.sulina, [29.68,45.16],[29.10,44.85],[28.80,44.60],[28.65,44.17],[28.58,43.82], N.vamaVeche],
  coastaC: [N.vamaVeche, [28.40,43.55],[28.15,43.42], N.ekrene],

  /* litoralul Bugeacului: limanul Nistrului -> gura Chiliei */
  coastaB: [N.liman, [30.20,45.80],[29.85,45.55], N.chilia],

  /* frontiera de sud a Cadrilaterului, 1913-1940: Ekrene -> Turtucaia */
  cadrS: [N.ekrene, [27.50,43.45],[27.00,43.62],[26.72,43.88], N.turtucaia],

  /* frontiera de sud a Dobrogei, din 1878: Silistra -> Vama Veche */
  dobS: [N.silistra, [27.60,44.05],[27.95,43.95],[28.20,43.80], N.vamaVeche],

  /* Prutul: Horodistea -> gura Prutului */
  prut: [N.horodistea, [26.85,48.10],[27.05,47.85],[27.25,47.60],[27.55,47.35],[27.75,47.10],
         [28.00,46.90],[28.15,46.60],[28.25,46.30],[28.20,46.00],[28.10,45.75], N.reni],

  /* Nistrul: Hotin -> liman */
  nistru: [N.hotin, [27.10,48.48],[27.60,48.42],[28.10,48.30],[28.50,48.15],[29.00,47.75],
           [29.30,47.45],[29.55,47.10],[29.85,46.80],[29.60,46.50],[29.95,46.30],[30.40,46.20], N.liman],

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

  /* Oltul: Turnu Rosu -> Turnu Magurele */
  olt: [N.turnuRosu, [24.35,45.20],[24.45,44.85],[24.55,44.50],[24.70,44.15], N.turnuMag],

  /* Cerna si Mehedinti: Hateg -> Orsova */
  cerna: [N.hateg, [22.60,45.30],[22.52,45.00], N.orsova],

  /* Milcovul si Siretul: Vrancea -> Galati */
  milcov: [N.vrancea, [26.65,45.80],[26.95,45.78],[27.20,45.72],[27.50,45.62],[27.80,45.52], N.galati],

  /* marginea Apusenilor: Hateg -> Zam -> Satmar est -> Prislop */
  apus1: [N.hateg, [22.72,45.75], N.zam],
  apus2: [N.zam, [22.85,46.40],[23.00,46.70],[23.20,47.00],[23.35,47.28], N.satmarE],
  apus3: [N.satmarE, [24.10,47.60],[24.60,47.70], N.prislop],

  /* Muresul, hotarul de nord al Banatului: Beba Veche -> Nadlac -> Zam */
  mures1: [N.beba, N.nadlac],
  mures2: [N.nadlac, [21.32,46.15],[21.90,46.10], N.zam],

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

/* --- suprafete istorice care nu urmeaza hotarele regionale ---------------- */
export const ZONE = {
  /* stapanirea lui Burebista la apogeu, c. 60-44 i.Hr. (aproximativa) */
  daciaBurebista: [[20.30,45.10],[20.10,45.90],[20.60,46.60],[21.40,47.20],[22.30,47.80],[23.30,48.30],
    [24.40,48.60],[25.60,48.80],[27.00,48.80],[28.40,48.50],[29.60,47.90],[30.60,47.10],[31.60,46.70],
    [32.00,46.30],[31.20,46.00],[30.30,45.80],[29.60,45.35],[28.90,44.60],[28.55,43.90],[28.20,43.40],
    [27.60,43.20],[26.80,43.15],[26.00,43.25],[25.20,43.35],[24.40,43.45],[23.60,43.60],[22.90,43.85],
    [22.20,44.10],[21.40,44.50],[20.70,44.80]],

  /* nucleul regatului dac: Muntii Orastiei */
  muntiiOrastiei: [[22.90,45.85],[23.60,45.95],[23.90,45.70],[23.60,45.40],[23.00,45.35],[22.70,45.60]],

  /* provincia Dacia romana, cu limes-ul de vest si Limes Transalutanus */
  daciaRomana: [[21.30,46.15],[21.60,46.55],[22.00,46.95],[22.60,47.25],[23.15,47.18],[23.70,47.30],
    [24.30,47.25],[24.80,47.05],[25.30,46.75],[25.70,46.35],[26.00,45.95],[26.30,45.60],[25.90,45.45],
    [25.50,45.45],[25.10,45.40],[25.10,45.00],[25.20,44.50],[25.30,44.00],[25.32,43.70],[24.87,43.75],
    [24.35,43.72],[23.80,43.80],[23.30,43.87],[22.95,43.99],[22.70,44.25],[22.55,44.55],[22.42,44.72],
    [21.95,44.68],[21.66,44.73],[21.50,44.88],[21.42,45.20],[21.30,45.55],[21.20,45.90]],

  /* Moesia Inferior si Scythia Minor, sud de Dunare */
  moesia: [[22.95,43.99],[23.30,43.87],[23.80,43.80],[24.35,43.72],[24.87,43.75],[25.36,43.66],
    [25.97,43.90],[26.60,44.06],[27.27,44.11],[27.60,44.05],[27.95,43.95],[28.20,43.80],[28.57,43.75],
    [28.40,43.55],[28.15,43.42],[28.05,43.25],[27.92,43.20],[27.50,43.10],[26.80,43.00],[26.00,43.00],
    [25.20,43.05],[24.40,43.10],[23.60,43.20],[23.00,43.40],[22.80,43.70]],

  /* sudul Basarabiei retrocedat Moldovei intre 1856 si 1878 */
  bugeacSud: [[28.22,46.20],[28.60,46.10],[29.20,45.95],[29.60,45.85],[29.95,45.68],[29.65,45.42],
    [29.30,45.35],[28.90,45.35],[28.50,45.38],[28.19,45.47],[28.10,45.75],[28.20,46.00]],

  /* Transnistria sub administratie romaneasca, 1941-1944 */
  transnistria: [[26.60,48.45],[27.10,48.48],[27.60,48.42],[28.10,48.30],[28.50,48.15],[29.00,47.75],
    [29.30,47.45],[29.55,47.10],[29.85,46.80],[29.60,46.50],[29.95,46.30],[30.40,46.20],[30.55,46.05],
    [30.90,46.30],[31.60,46.60],[32.20,47.00],[31.80,47.60],[30.90,48.00],[29.80,48.40],[28.60,48.60],[27.50,48.60]],

  /* nord-vestul Transilvaniei, cedat Ungariei prin Dictatul de la Viena */
  vienaNV: [[21.60,46.72],[22.10,46.68],[22.60,46.72],[23.10,46.72],[23.50,46.70],[23.72,46.65],
    [24.10,46.55],[24.45,46.50],[24.75,46.40],[25.05,46.30],[25.30,46.10],[25.55,45.95],[25.80,45.83],
    [26.05,45.85],[26.25,45.75],[26.40,45.80],[26.25,46.05],[26.10,46.40],[25.95,46.70],[25.75,47.00],
    [25.50,47.30],[25.20,47.55],[24.90,47.79],[24.60,47.93],[24.20,47.94],[23.90,47.94],[23.63,47.99],
    [23.35,48.08],[23.00,48.10],[22.90,48.02],[22.65,47.87],[22.35,47.75],[22.05,47.55],[21.75,47.42],
    [21.50,47.20],[21.32,46.98],[21.25,46.75]],
}

/* --- ape ------------------------------------------------------------------ */
export const APE = {
  marea: ring(S.coastaN, S.coastaC,
    [[28.05,43.25],[27.92,43.20],[27.90,42.70],[27.47,42.50],[27.70,42.42],[28.03,41.98],[28.50,41.50],[29.00,41.20]],
    [[33.60,41.00],[33.60,46.60],[31.40,46.35],[30.90,46.18]], [N.liman], rev(S.coastaB)),

  dunare: ring([[18.90,45.75],[19.60,45.25],[20.10,45.00],[20.45,44.85],[21.00,44.80],[21.42,45.20]],
    rev(S.serb1), S.dunS1, S.dunS2, S.dunS3, S.dunD, S.dunGR, S.chiliaS0, S.chiliaCS),

  prut: ring([[25.20,48.55],[25.80,48.40],[26.30,48.35]], S.hertaE.slice(1), S.prut),
  nistru: ring([[25.60,49.00],[26.20,48.70]], S.nistru, [[30.90,45.95]]),
  siret: [[25.35,47.95],[25.80,47.65],[26.20,47.20],[26.60,46.60],[27.00,46.00],[27.20,45.72],[27.80,45.52],[28.03,45.45]],
  mures: [[25.60,46.55],[25.00,46.45],[24.40,46.35],[23.80,46.15],[23.20,46.10],[22.70,46.10],[21.90,46.10],[21.32,46.15],[20.85,46.17],[20.30,46.20]],
  olt: [[25.75,46.10],[25.60,45.85],[25.30,45.65],[24.90,45.70],[24.55,45.65],[24.30,45.55],[24.35,45.20],[24.45,44.85],[24.55,44.50],[24.70,44.15],[24.87,43.75]],
  tisa: [[22.90,48.05],[22.20,48.15],[21.40,48.00],[20.90,47.50],[20.30,46.90],[20.15,46.25],[20.10,45.60],[20.30,45.10],[20.45,44.85]],
  nipru: [[31.60,47.30],[31.20,46.90],[31.40,46.55],[31.60,46.40]],
}

/* --- frontiere ale vecinilor, pentru context ------------------------------ */
export const VECINI = {
  ungariaSerbia: [[20.26,46.11],[19.60,46.17],[19.10,46.15],[18.85,45.90]],
  serbiaBulgaria: [[22.70,44.25],[22.55,43.80],[22.45,43.40],[22.55,43.00],[22.35,42.75],[22.35,42.30]],
  bulgariaTurcia: [[28.03,41.98],[27.50,41.95],[26.95,41.72],[26.35,41.72],[26.05,41.35]],
  bulgariaGrecia: [[26.05,41.35],[25.20,41.30],[24.50,41.40],[23.80,41.40],[23.00,41.35],[22.35,42.30]],
  ungariaUcraina: [[22.90,48.02],[22.20,48.15],[21.40,48.00],[20.90,48.55]],
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
