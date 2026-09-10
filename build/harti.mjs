/* ===========================================================================
   Cele unsprezece harti ale volumului. Fiecare este o singura afirmatie
   vizuala: ce stapaneste cine, la un moment dat, si ce se schimba fata de
   harta precedenta.
   =========================================================================== */
import { harta } from './atlas.js'
import { REGIUNI, FRONTIERE, ZONE, L } from './geo.js'

const V   = [19.7, 42.6, 31.3, 49.0]   /* cadrul standard, folosit de aproape toate hartile */
const VL  = [18.9, 41.2, 32.4, 49.3]   /* cadru largit, pentru antichitate si migratii */

const ton = (lista, t) => Object.fromEntries(lista.map((k) => [k, t]))
const T_AZI = ['maramures','crisana','banat','transilvania','bucovinaSud','moldova','muntenia','oltenia','dobrogea']
const T_MARE = ['maramures','crisana','banat','transilvania','bucovina','moldova','basarabia','muntenia','oltenia','dobrogea','cadrilater']

/* eticheta de regiune, cu doua marimi */
const et  = (p, text, o = {}) => ({ p, text, clasa: 'm-et-reg', ...o })
const etm = (p, text, o = {}) => ({ p, text, clasa: 'm-et-mic', ...o })
const eta = (p, text, o = {}) => ({ p, text, clasa: 'm-et-apa', ...o })

export const HARTI = {

/* ------------------------------------------------------------------ 1 --- */
daciaBurebista: {
  titlu: 'Stăpânirea lui Burebista la apogeu, c. 60–44 î.Hr.',
  legenda: [['b','Aria de dominație a lui Burebista'], ['e','Nucleul regatului: Munții Orăștiei'], ['sit','Cetate dacică'], ['oras','Colonie grecească']],
  jos: 'Întinderea este reconstituită din Strabon, din decretul lui Acornion de la Dionysopolis și din răspândirea cetăților și a tezaurelor; hotarele nu au fost niciodată liniare, iar controlul asupra marginilor a fost intermitent. Nucleul real al puterii — cele șase cetăți din Munții Orăștiei — ocupă mai puțin de o sutime din suprafața hașurată.',
  spec: () => harta({ id: 'h1', view: VL, scaraKm: 200,
    zone: [{ ring: ZONE.daciaBurebista, ton: 'b', opac: .82 }, { ring: ZONE.muntiiOrastiei, ton: 'e' }],
    locuri: [
      { p: L.sarmizegetusa, tip: 'sit', anc: 'middle', sus: 1 },
      { p: L.argedava, tip: 'sit' }, { p: L.piroboridava, tip: 'sit' },
      { p: L.histria }, { p: L.tomis }, { p: L.callatis, anc: 'end' },
      { p: L.dionysopolis, anc: 'end' }, { p: L.olbia, anc: 'end' },
      { p: L.singidunum, anc: 'end' }, { p: L.cetateaAlba, anc: 'end' },
    ],
    note: [ et([25.4, 46.4], 'DACIA'), etm([24.6, 48.05], 'M U N Ț I I    C A R P A Ț I', { rot: -14 }),
      etm([30.9, 48.5], 'Sciți'), etm([20.4, 44.0], 'Iliri'), etm([25.6, 42.4], 'Tracii sudici'),
      etm([23.35, 45.28], 'Munții Orăștiei', { anc: 'middle' }),
      eta([26.4, 43.6], 'D u n ă r e a', { rot: 6 }), eta([30.9, 44.4], 'PONTUL EUXIN') ] }) },

/* ------------------------------------------------------------------ 2 --- */
daciaRomana: {
  titlu: 'Provincia Dacia și limesul, 106–271 d.Hr.',
  legenda: [['c','Dacia romană'], ['d','Moesia Inferior și Scythia Minor'], ['b','Dacii liberi (carpi, costoboci)'], ['sit','Oraș roman']],
  jos: 'Provincia a cuprins Transilvania, Banatul, Oltenia și o fâșie din vestul Munteniei — nu și Moldova, Maramureșul sau Crișana de nord, rămase în afara stăpânirii romane. Această geografie parțială este miezul controversei asupra continuității: romanizarea a fost intensă pe un teritoriu care nu coincide cu România de azi.',
  spec: () => harta({ id: 'h2', view: V, scaraKm: 150,
    zone: [
      { ring: ZONE.moesia, ton: 'd' },
      { ring: ZONE.daciaRomana, ton: 'c' },
      { ring: REGIUNI.dobrogea.ring, ton: 'd' },
      { ring: REGIUNI.moldova.ring, ton: 'b', opac: .55 },
      { ring: REGIUNI.maramures.ring, ton: 'b', opac: .55 },
      { ring: REGIUNI.crisana.ring, ton: 'b', opac: .35 },
    ],
    locuri: [
      { p: L.porolissum, tip: 'sit', sus: 1 }, { p: L.napoca, tip: 'sit' },
      { p: L.potaissa, tip: 'sit', anc: 'end' }, { p: L.apulum, tip: 'sit', anc: 'end' },
      { p: L.ulpia, tip: 'sit', anc: 'end' }, { p: L.tibiscum, tip: 'sit', anc: 'end' },
      { p: L.drobeta, tip: 'sit', anc: 'end' }, { p: L.romula, tip: 'sit' },
      { p: L.sucidava, tip: 'sit', anc: 'end', sus: 1 }, { p: L.adamclisi, tip: 'sit', anc: 'end' },
      { p: L.tomis }, { p: L.histria }, { p: L.durostorum, tip: 'sit', anc: 'end' }, { p: L.novae, tip: 'sit', anc: 'end' },
    ],
    note: [ et([23.3, 46.2], 'D A C I A'), etm([25.4, 43.2], 'MOESIA INFERIOR'),
      etm([28.5, 44.9], 'SCYTHIA\nMINOR'), etm([27.3, 46.9], 'Carpi'), etm([23.6, 48.1], 'Costoboci'),
      etm([29.6, 47.4], 'Sarmați\nroxolani'), etm([20.7, 46.9], 'Sarmați\niazigi'),
      eta([26.2, 43.75], 'D u n ă r e a', { rot: 5 }) ] }) },

/* ------------------------------------------------------------------ 3 --- */
migratii: {
  titlu: 'Valurile migratoare și retragerea în munți, sec. III–XIII',
  legenda: [['campanie','Direcția principală a unui val migrator'], ['a','Aria de continuitate romanică presupusă']],
  jos: 'Fiecare val a folosit același culoar de stepă dintre Nistru și Dunăre, iar Câmpia Română și cea de Vest au fost drumuri, nu adăposturi. Arcul carpatic, podișul Transilvaniei și zonele împădurite sunt spațiile unde izvoarele semnalează cel mai devreme populația romanică.',
  spec: () => harta({ id: 'h3', view: VL, scaraKm: 200,
    zone: [{ ring: FRONTIERE.principatTransilvania, ton: 'a', opac: .5 }],
    linii: [
      { pts: [[32.2,48.6],[29.5,47.6],[26.5,46.6],[23.5,46.4]], stil: 'campanie', sageata: 1 },
      { pts: [[32.2,46.4],[29.0,45.6],[26.0,44.6],[22.6,44.4]], stil: 'campanie', sageata: 1 },
      { pts: [[32.0,50.0],[28.5,49.2],[25.0,48.6],[21.6,47.8]], stil: 'campanie', sageata: 1 },
      { pts: [[19.2,47.2],[21.0,47.0],[22.6,46.9]], stil: 'campanie', sageata: 1 },
    ],
    note: [
      etm([30.4, 48.2], 'Goți · huni · avari', { rot: -12 }),
      etm([29.6, 45.9], 'Pecenegi · uzi · cumani', { rot: -14 }),
      etm([28.0, 49.6], 'Slavi', { rot: -9 }),
      etm([20.0, 47.5], 'Maghiari'),
      et([23.9, 46.5], 'ARCUL\nCARPATIC'),
      eta([26.2, 43.7], 'D u n ă r e a', { rot: 5 }) ] }) },

/* ------------------------------------------------------------------ 4 --- */
treiTari: {
  titlu: 'Cele trei țări române și puterile din jur, c. 1500',
  legenda: [['a','Transilvania (voievodat sub coroana Ungariei)'], ['b','Țara Românească'], ['c','Moldova'], ['e','Stăpânire otomană directă (raiale, Dobrogea)']],
  jos: 'Cele trei state au hotare care urmăresc relieful aproape fără excepție: Carpații despart Transilvania de celelalte două, Milcovul și Siretul despart Moldova de Țara Românească, Oltul, Dunărea și Nistrul închid restul. Raialele — Chilia, Cetatea Albă, Turnu, Giurgiu, Brăila — sunt capete de pod otomane tăiate din trupul principatelor.',
  spec: () => harta({ id: 'h4', view: V, scaraKm: 150,
    tonuri: { ...ton(['transilvania','crisana','maramures','banat'], 'a'),
              ...ton(['muntenia','oltenia'], 'b'),
              ...ton(['moldova','bucovina','basarabia'], 'c'),
              dobrogea: 'e', cadrilater: 'e' },
    conturZone: [FRONTIERE.principatTransilvania, FRONTIERE.taraRomaneasca, FRONTIERE.moldovaMedievala],
    locuri: [
      { p: L.suceava, tip: 'capitala' }, { p: L.targoviste, tip: 'capitala', anc: 'end' },
      { p: L.albaIulia, tip: 'capitala', anc: 'end' },
      { p: L.chiliaO, anc: 'end' }, { p: L.cetateaAlba, anc: 'end' }, { p: L.hotinO, anc: 'end' },
      { p: L.braila }, { p: L.giurgiu, anc: 'end' }, { p: L.turnu, anc: 'end' },
      { p: L.brasov }, { p: L.sibiu, anc: 'end' }, { p: L.severin, anc: 'end' },
    ],
    note: [ et([23.9, 46.9], 'TRANSILVANIA'), et([25.2, 44.5], 'ȚARA ROMÂNEASCĂ'),
      et([27.4, 47.2], 'MOLDOVA'), etm([28.5, 44.4], 'DOBROGEA'),
      etm([21.2, 48.4], 'REGATUL\nUNGARIEI'), etm([25.0, 42.6], 'IMPERIUL OTOMAN'),
      etm([30.4, 48.4], 'Hanatul\nCrimeii'), eta([26.2, 43.7], 'D u n ă r e a', { rot: 5 }) ] }) },

/* ------------------------------------------------------------------ 5 --- */
mihai1600: {
  titlu: 'Cele trei țări sub Mihai Viteazul, mai–septembrie 1600',
  legenda: [['b','Teritorii aflate simultan sub autoritatea lui Mihai'], ['batalie','Bătălie']],
  jos: 'Unirea a durat mai puțin de patru luni și a fost o stăpânire militară personală, nu o uniune de state: Mihai a domnit în Țara Românească, a fost principe al Transilvaniei și, din mai 1600, stăpân al Moldovei. Semnificația ei politică a fost construită abia în secolul al XIX-lea, de generația pașoptistă.',
  spec: () => harta({ id: 'h5', view: V, scaraKm: 150,
    tonuri: ton([...T_MARE.filter((k) => k !== 'cadrilater'), 'bucovinaSud'], 'b'),
    conturZone: [FRONTIERE.principatTransilvania, FRONTIERE.taraRomaneasca, FRONTIERE.moldovaMedievala],
    locuri: [
      { p: L.calugareni, tip: 'batalie', anc: 'end' }, { p: L.selimbar, tip: 'batalie', anc: 'end' },
      { p: L.miraslau, tip: 'batalie' }, { p: L.guruslau, tip: 'batalie', anc: 'end' },
      { p: L.turda, tip: 'batalie' }, { p: L.targoviste, tip: 'capitala', anc: 'end', sus: 1 },
      { p: L.albaIulia, tip: 'capitala', anc: 'end' }, { p: L.suceava, tip: 'capitala' },
    ],
    note: [ et([23.9, 46.95], 'TRANSILVANIA'), et([25.0, 44.45], 'ȚARA ROMÂNEASCĂ'),
      et([27.5, 47.3], 'MOLDOVA'), etm([25.0, 42.6], 'IMPERIUL OTOMAN'),
      etm([20.9, 48.5], 'HABSBURGI') ] }) },

/* ------------------------------------------------------------------ 6 --- */
pierderi1775: {
  titlu: 'Amputările imperiale: Bucovina 1775, Basarabia 1812',
  legenda: [['c','Moldova și Țara Românească'], ['e','Bucovina, anexată de Austria (1775)'], ['f','Basarabia, anexată de Rusia (1812)'], ['a','Transilvania sub Habsburgi (din 1699)']],
  jos: 'În mai puțin de patruzeci de ani Moldova pierde nordul în favoarea Austriei și jumătatea răsăriteană în favoarea Rusiei — aproape jumătate din suprafața ei. Ambele cesiuni se fac prin tratate între imperii, fără participarea domnilor; Grigore al III-lea Ghica, care a protestat împotriva răpirii Bucovinei, a fost mazilit și ucis în 1777.',
  spec: () => harta({ id: 'h6', view: V, scaraKm: 150,
    tonuri: { ...ton(['transilvania','crisana','maramures','banat'], 'a'),
              ...ton(['muntenia','oltenia','moldova'], 'c'),
              bucovina: 'e', basarabia: 'f', dobrogea: 'g', cadrilater: 'g' },
    has: ['bucovina', 'basarabia'],
    conturZone: [FRONTIERE.moldovaVest, FRONTIERE.taraRomaneasca],
    linii: [{ pts: [[26.60,48.45],[26.55,48.28],[26.70,48.25]], stil: 'fina' }],
    locuri: [ { p: L.cernauti, anc: 'end' }, { p: L.chisinau }, { p: L.iasi, anc: 'end' },
      { p: L.bucuresti, tip: 'capitala', anc: 'end' }, { p: L.sibiu, anc: 'end' } ],
    note: [ etm([25.55, 48.25], 'BUCOVINA\n1775'), et([28.95, 47.0], 'BASARABIA\n1812'),
      et([23.9, 46.6], 'TRANSILVANIA'), et([27.0, 46.7], 'MOLDOVA'), et([25.2, 44.5], 'ȚARA ROMÂNEASCĂ'),
      etm([30.2, 48.6], 'IMPERIUL RUS'), etm([21.0, 48.5], 'IMPERIUL\nHABSBURGIC'),
      etm([25.6, 42.7], 'IMPERIUL OTOMAN') ] }) },

/* ------------------------------------------------------------------ 7 --- */
unirea1859: {
  titlu: 'Principatele Unite după dubla alegere, 1859',
  legenda: [['b','Principatele Unite ale Moldovei și Țării Românești'], ['f','Sudul Basarabiei, revenit Moldovei în 1856'], ['g','Teritorii românești sub stăpânire străină']],
  jos: 'Unirea din 1859 a fost obținută prin exploatarea unei omisiuni: Convenția de la Paris prevedea două tronuri, dar nu interzicea explicit ca aceeași persoană să fie aleasă în ambele. Statul rezultat avea circa 122.000 km² și nu atingea nici Marea Neagră, nici Carpații de vest.',
  spec: () => harta({ id: 'h7', view: V, scaraKm: 150,
    tonuri: { ...ton(['muntenia','oltenia','moldova'], 'b'),
              ...ton(['transilvania','crisana','maramures','banat','bucovina','basarabia','dobrogea','cadrilater'], 'g') },
    zone: [{ ring: ZONE.bugeacSud, ton: 'f' }],
    conturZone: [FRONTIERE.principate1859],
    locuri: [ { p: L.bucuresti, tip: 'capitala', anc: 'end' }, { p: L.iasi, tip: 'capitala' },
      { p: L.galatiO }, { p: L.braila, anc: 'end' }, { p: L.ismail, anc: 'end' } ],
    note: [ et([26.0, 45.3], 'PRINCIPATELE\nUNITE'), etm([23.9, 46.6], 'Transilvania\n(Austria)'),
      etm([25.6, 48.2], 'Bucovina\n(Austria)'), etm([29.0, 47.1], 'Basarabia\n(Rusia)'),
      etm([28.4, 44.3], 'Dobrogea\n(Imperiul Otoman)') ] }) },

/* ------------------------------------------------------------------ 8 --- */
regat1878: {
  titlu: 'Regatul României după Congresul de la Berlin, 1878–1913',
  legenda: [['b','Regatul României'], ['d','Dobrogea, dobândită în 1878'], ['e','Cadrilaterul, anexat în 1913'], ['f','Sudul Basarabiei, cedat Rusiei în 1878']],
  jos: 'Independența a fost recunoscută la Berlin cu două condiții: modificarea articolului 7 din Constituție privind cetățenia evreilor și un schimb teritorial pe care România l-a refuzat până în ultimul moment — sudul Basarabiei, luat de Rusia, contra Dobrogei, luată de la Imperiul Otoman. Statul câștiga ieșirea la mare și pierdea o provincie românească.',
  spec: () => harta({ id: 'h8', view: V, scaraKm: 150,
    tonuri: { ...ton(['muntenia','oltenia','moldova'], 'b'), dobrogea: 'd',
              ...ton(['transilvania','crisana','maramures','banat','bucovina','basarabia'], 'g'), cadrilater: 'e' },
    zone: [{ ring: ZONE.bugeacSud, ton: 'f', has: 1 }],
    conturZone: [FRONTIERE.regat1878],
    linii: [{ pts: [[26.60,44.06],[26.72,43.88],[27.00,43.62],[27.50,43.45],[28.03,43.35]], stil: 'ceda' }],
    locuri: [ { p: L.bucuresti, tip: 'capitala', anc: 'end' }, { p: L.iasi },
      { p: L.constanta }, { p: L.plevna, tip: 'batalie', anc: 'end' }, { p: L.grivita, tip: 'batalie', anc: 'end', sus: 1 } ],
    note: [ et([25.6, 45.0], 'ROMÂNIA'), etm([28.45, 44.5], 'DOBROGEA\n1878'),
      etm([27.5, 43.8], 'Cadrilaterul 1913'), etm([28.9, 45.9], 'cedat\n1878'),
      etm([23.9, 46.6], 'Transilvania\n(Austro-Ungaria)'), etm([29.0, 47.2], 'Basarabia\n(Rusia)') ] }) },

/* ------------------------------------------------------------------ 9 --- */
romaniaMare: {
  titlu: 'România Mare, 1920–1940',
  legenda: [['b','Vechiul Regat'], ['a','Transilvania, Banatul, Crișana, Maramureșul'], ['c','Bucovina'], ['d','Basarabia'], ['e','Cadrilaterul']],
  jos: 'În doi ani statul român își dublează suprafața — de la 138.000 la 295.000 km² — și trece de la 7,7 la circa 16 milioane de locuitori. Sfertul de populație minoritară care intră odată cu teritoriile (maghiari, germani, evrei, ucraineni, bulgari) devine problema politică centrală a perioadei interbelice.',
  spec: () => harta({ id: 'h9', view: V, scaraKm: 150,
    tonuri: { ...ton(['muntenia','oltenia','moldova','dobrogea'], 'b'),
              ...ton(['transilvania','crisana','maramures','banat'], 'a'),
              bucovina: 'c', basarabia: 'd', cadrilater: 'e' },
    conturZone: [FRONTIERE.romaniaMare],
    locuri: [ { p: L.bucuresti, tip: 'capitala', anc: 'end' }, { p: L.cluj }, { p: L.iasi },
      { p: L.chisinau }, { p: L.cernauti, anc: 'end' }, { p: L.timisoara, anc: 'end' },
      { p: L.constanta }, { p: L.cetateaAlba, anc: 'end' }, { p: L.albaIulia, anc: 'end', sus: 1 } ],
    note: [ et([23.7, 46.5], 'TRANSILVANIA'), et([28.9, 47.0], 'BASARABIA'),
      etm([25.5, 48.3], 'BUCOVINA'), etm([27.2, 46.6], 'MOLDOVA'), etm([25.6, 44.6], 'MUNTENIA'),
      etm([23.5, 44.5], 'OLTENIA'), etm([21.3, 45.5], 'BANAT'), etm([28.4, 44.8], 'DOBROGEA'),
      etm([27.7, 43.85], 'CADRILATER') ] }) },

/* ----------------------------------------------------------------- 10 --- */
anul1940: {
  titlu: 'Anul 1940: trei amputări în zece săptămâni',
  legenda: [['b','Teritoriul rămas României'], ['hasu','Teritorii pierdute între 26 iunie și 7 septembrie 1940'], ['ceda','Linia Dictatului de la Viena, 30 august 1940']],
  jos: 'URSS ia Basarabia, nordul Bucovinei și ținutul Herța (28 iunie); Germania și Italia atribuie Ungariei nord-vestul Transilvaniei (30 august); Bulgaria primește Cadrilaterul (7 septembrie). În total 99.738 km² și circa 6,8 milioane de locuitori — o treime din țară. Regele Carol al II-lea abdică la 6 septembrie.',
  spec: () => harta({ id: 'h10', view: V, scaraKm: 150,
    tonuri: { ...ton(['muntenia','oltenia','moldova','dobrogea','bucovinaSud'], 'b'),
              ...ton(['transilvania','banat','crisana','maramures'], 'b'),
              basarabia: 'f', bucovinaNord: 'f', cadrilater: 'f' },
    zone: [{ ring: ZONE.vienaNV, ton: 'e', has: 1 }],
    has: ['basarabia', 'bucovinaNord', 'cadrilater'],
    conturZone: [FRONTIERE.romaniaMare],
    linii: [{ pts: ZONE.vienaNV.slice(0, 15), stil: 'ceda' }],
    locuri: [ { p: L.bucuresti, tip: 'capitala', anc: 'end' }, { p: L.cluj, anc: 'end' },
      { p: L.chisinau }, { p: L.cernauti, anc: 'end' }, { p: L.brasov }, { p: L.sibiu, anc: 'end' } ],
    note: [ etm([24.0, 47.3], 'CĂTRE UNGARIA\n30 august · 43.492 km²'),
      etm([28.9, 46.9], 'CĂTRE URSS\n28 iunie · 50.762 km²'),
      etm([27.6, 43.85], 'CĂTRE BULGARIA\n7 sept. · 7.412 km²'),
      et([25.3, 44.7], 'ROMÂNIA') ] }) },

/* ----------------------------------------------------------------- 11 --- */
razboi1941: {
  titlu: 'Frontul de Est și Transnistria sub administrație românească, 1941–1944',
  legenda: [['b','România, septembrie 1940'], ['d','Basarabia și nordul Bucovinei, recuperate în iulie 1941'], ['c','Transnistria, sub administrație românească 1941–1944'], ['e','Nord-vestul Transilvaniei, sub administrație maghiară']],
  jos: 'Decizia de a trece Nistrul, după recuperarea teritoriilor luate în 1940, a transformat un război de revizuire într-un război de cucerire. În Transnistria, guvernarea românească a organizat deportarea și uciderea a zeci de mii de evrei și romi; Comisia Internațională Wiesel a stabilit un bilanț de 280.000–380.000 de evrei omorâți în teritoriile aflate sub autoritate românească.',
  spec: () => harta({ id: 'h11', view: [19.7, 42.6, 32.6, 49.2], scaraKm: 200,
    tonuri: { ...ton(['muntenia','oltenia','moldova','dobrogea','bucovinaSud','transilvania','banat','crisana','maramures'], 'b'),
              basarabia: 'd', bucovinaNord: 'd', cadrilater: 'g' },
    zone: [{ ring: ZONE.transnistria, ton: 'c' }, { ring: ZONE.vienaNV, ton: 'e' }],
    conturZone: [FRONTIERE.romaniaMare],
    locuri: [ { p: L.bucuresti, tip: 'capitala', anc: 'end' }, { p: L.chisinau },
      { p: L.odesa }, { p: L.iasi, anc: 'end' }, { p: L.tighina, anc: 'end' }, { p: L.cluj, anc: 'end' } ],
    note: [ etm([30.6, 47.6], 'TRANSNISTRIA'), etm([28.9, 46.9], 'BASARABIA'),
      etm([24.0, 47.3], 'sub administrație\nmaghiară'), et([25.3, 44.7], 'ROMÂNIA'),
      eta([31.2, 45.6], 'MAREA NEAGRĂ') ] }) },

/* ----------------------------------------------------------------- 12 --- */
azi: {
  titlu: 'România contemporană',
  legenda: [['a','Teritoriul actual, 238.397 km²'], ['capitala','Capitala'], ['oras','Oraș peste 250.000 de locuitori']],
  jos: 'Frontierele de azi sunt cele fixate prin Tratatul de Pace de la Paris din 1947: nordul Transilvaniei revine României, Basarabia și nordul Bucovinei rămân la Uniunea Sovietică, Cadrilaterul la Bulgaria. Este singura configurație teritorială pe care statul român a păstrat-o mai mult de o generație.',
  spec: () => harta({ id: 'h12', view: V, scaraKm: 150,
    tonuri: ton(T_AZI, 'a'),
    conturZone: [FRONTIERE.romaniaAzi],
    locuri: [
      { p: L.bucuresti, tip: 'capitala', anc: 'end' }, { p: L.cluj }, { p: L.timisoara, anc: 'end' },
      { p: L.iasi }, { p: L.constanta }, { p: L.craiova, anc: 'end' }, { p: L.brasov },
      { p: L.galatiO }, { p: L.ploiesti }, { p: L.oradea, anc: 'end' }, { p: L.braila, anc: 'end', sus: 1 },
    ],
    note: [ etm([23.9, 46.6], 'TRANSILVANIA'), etm([27.0, 46.7], 'MOLDOVA'),
      etm([25.6, 44.6], 'MUNTENIA'), etm([23.5, 44.55], 'OLTENIA'), etm([21.3, 45.5], 'BANAT'),
      etm([28.4, 44.85], 'DOBROGEA'), etm([21.9, 46.85], 'CRIȘANA'), etm([23.4, 47.8], 'MARAMUREȘ'),
      etm([25.6, 47.6], 'BUCOVINA'),
      etm([21.0, 47.6], 'UNGARIA'), etm([21.0, 44.6], 'SERBIA'), etm([25.4, 43.2], 'BULGARIA'),
      etm([28.8, 48.3], 'UCRAINA'), etm([28.9, 46.9], 'REP.\nMOLDOVA'),
      eta([30.4, 44.4], 'MAREA\nNEAGRĂ') ] }) },
}
