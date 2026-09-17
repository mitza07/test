/* ===========================================================================
   Cautare extinsa: parcurge arborele de categorii Commons pe doua niveluri si
   strange tot ce trece verificarea de licenta. Tinta este un fond de cateva
   mii de candidati, din care se aleg cele peste doua sute de ilustratii ale
   volumului.
   =========================================================================== */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { json, dinCategorie, dinCautare } from './cauta.mjs'

const RAD = new URL('./', import.meta.url).pathname

/* subcategoriile unei categorii */
function subcategorii(cat, lim = 40) {
  const r = json({ action: 'query', generator: 'categorymembers', gcmtitle: 'Category:' + cat,
    gcmtype: 'subcat', gcmlimit: String(lim) })
  return (r?.query?.pages || []).map((p) => p.title.replace(/^Category:/, ''))
}

/* ---------------------------------------------------------------------------
   Fondurile: categorii-radacina din care se coboara un nivel.
   Cele cartografice si cele de arta veche sunt aproape integral in domeniul
   public, deci acolo se sapa cel mai adanc.
   --------------------------------------------------------------------------- */
const FONDURI = [
  /* ---- cartografie, fondul cel mai bogat si integral color ---- */
  { grup: 'harti', adanc: 2, cat: [
    '15th-century maps of Romania', '16th-century maps of Romania', '17th-century maps of Romania',
    '18th-century maps of Romania', '19th-century maps of Romania', '20th-century maps of Romania',
    'Old maps of Transylvania', 'Old maps of Wallachia', 'Old maps of Moldavia',
    'Old maps of the Ottoman Empire', 'Old maps of Hungary', 'Old maps of Bulgaria',
    'Maps of the history of Romania', 'Ethnographic maps of Europe',
    'Maps by Abraham Ortelius', 'Maps by Gerard Mercator', 'Maps by Joan Blaeu',
    'Maps by Johann Baptist Homann', 'Maps by Guillaume Delisle', 'Maps by Nicolas Sanson',
    'Tabula Peutingeriana', 'Maps of the Austro-Hungarian Empire', 'Maps of the Treaty of Trianon',
  ] },
  /* ---- arta si obiecte de pana la 1800 ---- */
  { grup: 'antichitate', adanc: 2, cat: [
    "Trajan's Column", 'Dacian artifacts', 'Dacian bracelets', 'Coins of Dacia',
    'Sarmizegetusa Regia', 'Tropaeum Traiani', 'Ulpia Traiana Sarmizegetusa',
    'Roman Dacia', 'Histria (Romania)', 'Archaeological finds in Romania',
    'Pietroasele Treasure', 'Thracian treasures', 'Agighiol treasure',
    'National Museum of Romanian History',
  ] },
  { grup: 'medieval', adanc: 2, cat: [
    'Chronicon Pictum', 'Voroneț Monastery', 'Sucevița Monastery', 'Moldovița Monastery',
    'Humor Monastery', 'Probota Monastery', 'Arbore church', 'Pătrăuți Church',
    'Painted churches of northern Moldavia', 'Curtea de Argeș Cathedral',
    'Cozia Monastery', 'Putna Monastery', 'Neamț Monastery', 'Bistrița Monastery (Neamț)',
    'Fortified churches in Transylvania', 'Biertan fortified church', 'Prejmer fortified church',
    'Viscri', 'Corvin Castle', 'Râșnov Citadel', 'Rupea Citadel', 'Suceava Fortress',
    'Densus Church', 'Black Church (Brașov)', 'Saint Michael’s Church, Cluj-Napoca',
  ] },
  { grup: 'brancovenesc', adanc: 2, cat: [
    'Horezu Monastery', 'Mogoșoaia Palace', 'Brâncovenesc style', 'Antim Monastery',
    'Stavropoleos Monastery', 'Cotroceni Palace',
  ] },
  /* ---- portrete, stampe, carti vechi ---- */
  { grup: 'portrete', adanc: 2, cat: [
    'Rulers of Wallachia', 'Rulers of Moldavia', 'Princes of Transylvania',
    'Michael the Brave', 'Stephen III of Moldavia', 'Vlad the Impaler', 'John Hunyadi',
    'Constantin Brâncoveanu', 'Dimitrie Cantemir', 'Alexandru Ioan Cuza',
    'Carol I of Romania', 'Ferdinand I of Romania', 'Marie of Edinburgh',
    'Carol II of Romania', 'Michael I of Romania', 'Mihai Eminescu',
  ] },
  { grup: 'tiparituri', adanc: 2, cat: [
    'Old Romanian books', 'Manuscripts in Romania', 'Romanian Cyrillic alphabet',
    'Incunabula', 'Books of Romania',
  ] },
  /* ---- secolul XIX ---- */
  { grup: 'sec19', adanc: 2, cat: [
    'Nicolae Grigorescu', 'Theodor Aman', 'Ion Andreescu', 'Ștefan Luchian',
    'Romanian War of Independence', 'Romanian Revolution of 1848',
    'Principality of Romania', 'Kingdom of Romania', 'Peleș Castle',
    'Costumes of Romania', 'Romania in the 19th century',
  ] },
  { grup: 'orase-vechi', adanc: 2, cat: [
    'Old Bucharest', 'History of Bucharest', 'Old photographs of Romania',
    'Historic centre of Sighișoara', 'History of Sibiu', 'History of Brașov',
    'History of Cluj-Napoca', 'History of Iași', 'History of Timișoara',
    'History of Constanța', 'Postcards of Romania',
  ] },
  /* ---- secolul XX ---- */
  { grup: 'sec20', adanc: 2, cat: [
    'Romania in World War I', 'Great Union of 1918', 'Coronation of Ferdinand I of Romania',
    'Treaty of Trianon', 'Romania in World War II', 'Second Vienna Award',
    'Holocaust in Romania', 'Communist Romania', 'Nicolae Ceaușescu',
    'Romanian Revolution of 1989', 'Palace of the Parliament',
    'Constantin Brâncuși', 'George Enescu',
  ] },
  /* ---- etnografie, patrimoniu, peisaj ---- */
  { grup: 'etnografie', adanc: 2, cat: [
    'Folk costumes of Romania', 'Romanian folk art', 'Wooden churches in Maramureș',
    'Merry Cemetery', 'Traditional houses in Romania', 'Romanian pottery',
    'Village Museum (Bucharest)', 'Astra Museum',
  ] },
  { grup: 'peisaj', adanc: 1, cat: [
    'Danube Delta', 'Carpathian Mountains in Romania', 'Retezat National Park',
    'Iron Gates', 'Transfăgărășan', 'Bicaz Gorge', 'Black Sea coast of Romania',
    'Salt mines in Romania', 'Roșia Montană',
  ] },
  /* ---- valul al doilea: temele adaugate volumului ---- */
  { grup: 'preistorie', adanc: 2, cat: [
    'Cucuteni-Trypillia culture', 'Cucuteni culture', 'Hamangia culture', 'Gumelnița culture',
    'Neolithic Romania', 'Bronze Age Romania', 'Tărtăria tablets', 'Vinča culture',
    'Prehistoric Romania', 'Neolithic Europe', 'Bronze Age hoards', 'Megalithic Europe',
  ] },
  { grup: 'aromani', adanc: 2, cat: [
    'Aromanians', 'Vlachs', 'Megleno-Romanians', 'Istro-Romanians', 'Pindus',
    'Moscopole', 'Aromanian people', 'Balkan costumes',
  ] },
  { grup: 'basarabia', adanc: 2, cat: [
    'History of Moldova', 'Bessarabia', 'Moldavian Soviet Socialist Republic',
    'History of Chișinău', 'Bessarabia Governorate', 'Moldavian Democratic Republic',
    'Transnistria', 'Old maps of Moldova', 'Tighina', 'Cetatea Albă',
  ] },
  { grup: 'femei', adanc: 2, cat: [
    'Women of Romania', 'Romanian women', 'Elena Cuza', 'Elisabeth of Wied',
    'Marie of Edinburgh', 'Ecaterina Teodoroiu', 'Women in World War I',
    'Women of the Austro-Hungarian Empire', 'Nurses in World War I', 'Feminism in Romania',
  ] },
  { grup: 'sport', adanc: 2, cat: [
    'Sport in Romania', 'Nadia Comăneci', 'Romania at the Olympics',
    'Football in Romania', 'Gymnastics in Romania', 'Iolanda Balaș',
    '1984 Summer Olympics', 'Sport in the Kingdom of Romania',
  ] },
  { grup: 'hrana', adanc: 2, cat: [
    'Agriculture in Romania', 'Romanian cuisine', 'Peasants of Romania',
    'Markets in Romania', 'Wheat', 'Mills in Romania', 'Wine of Romania',
    'Agriculture in Austria-Hungary', 'Harvest in art',
  ] },
  { grup: 'medicina', adanc: 2, cat: [
    'Carol Davila', 'Victor Babeș', 'Ion Cantacuzino', 'Hospitals in Romania',
    'History of medicine', 'Cholera', 'Typhus', 'Pellagra', 'Public health',
    'Medicine in the Ottoman Empire',
  ] },
  { grup: 'industrie', adanc: 2, cat: [
    'Oil industry in Romania', 'History of Ploiești', 'Rail transport in Romania',
    'Industry of Romania', 'Danube–Black Sea Canal', 'Bridges over the Danube',
    'Anghel Saligny', 'Steam locomotives of Romania', 'Salt mines in Romania',
  ] },
  { grup: 'stiinta', adanc: 2, cat: [
    'Romanian scientists', 'Traian Vuia', 'Aurel Vlaicu', 'Henri Coandă',
    'Emil Racoviță', 'Nicolae Paulescu', 'Spiru Haret', 'George Emil Palade',
    'Romanian Academy', 'Universities in Romania', 'Astronomical instruments',
  ] },
  { grup: 'mediu', adanc: 1, cat: [
    'Deforestation', 'Danube Delta', 'Floods in Romania', 'Pollution in Romania',
    'Copșa Mică', 'Roșia Montană', 'Forests of Romania', 'Systematization (Romania)',
  ] },
  { grup: 'comunism', adanc: 2, cat: [
    'Communist Romania', 'Collectivization in Romania', 'Propaganda of Romania',
    'Romanian Revolution of 1989', 'Gheorghe Gheorghiu-Dej', 'Securitate',
    'Socialist realism', 'Political posters', 'Cult of personality',
    'Pitești Prison', 'Sighet Memorial',
  ] },
  /* ---- valul al treilea: fondul vechi, care e in domeniu public ----
     Fotografia moderna de pe Commons e aproape toata share-alike, deci
     inutilizabila intr-o carte vanduta; gravura si litografia de secol XIX nu. */
  { grup: 'etnografie', adanc: 2, cat: [
    'Traditional clothing of Romania', 'Bear guiding (rite)',
    'Historical images of Romanian people', 'Paintings by Theodor Aman',
    'Paintings by Nicolae Grigorescu', 'Paintings by Ion Andreescu',
    'Paintings by Ștefan Luchian', 'Paintings by Octav Băncilă',
    'Amedeo Preziosi', 'Carol Popp de Szathmári', 'Auguste Raffet',
    'Costumes of the Ottoman Empire', 'Ethnographic illustrations',
  ] },
  { grup: 'brancovenesc', adanc: 2, cat: [
    'Brâncovenesc architecture', 'Brâncovenesc art', 'Mogoșoaia Palace',
    'Cozia Monastery', 'Stavropoleos Monastery', 'Antim Monastery',
    'Romanian Orthodox icons', 'Icons of Romania', 'Byzantine art in Romania',
  ] },
  /* ---- valul al treilea: capitolele care au ramas fara nicio ilustratie ----
     Masurat pe paginile tiparite, doua capitole n-aveau nicio figura si sase
     aveau una singura la peste doua mii de cuvinte. Fondurile de mai jos merg
     tocmai dupa ele. Secolul XX romanesc e greu: fotografia de dupa 1945 e
     aproape toata sub drept de autor, iar ce trece de poarta de licenta vine
     mai ales din arhive publice straine si din fotografii de monumente. */
  { grup: 'revolutie', adanc: 2, cat: [
    'Romanian Revolution of 1989', 'Romanian Revolution of 1989 in Bucharest',
    'Romanian Revolution of 1989 in Timișoara', 'Trial of Nicolae and Elena Ceaușescu',
    'Revolution Square, Bucharest', 'Monuments to the Romanian Revolution of 1989',
    'Memorials of the Romanian Revolution of 1989', 'Piața Victoriei, Timișoara',
  ] },
  { grup: 'tranzitie', adanc: 2, cat: [
    'Mineriad', 'Ion Iliescu', 'Emil Constantinescu', 'Traian Băsescu',
    '1990s in Romania', '2000s in Romania', 'University Square, Bucharest',
    'Romania and the European Union', 'Romania and NATO', 'Accession of Romania to the European Union',
  ] },
  { grup: 'comunism2', adanc: 2, cat: [
    'Socialist Republic of Romania', 'Gheorghe Gheorghiu-Dej', 'Danube–Black Sea Canal',
    'Sighet Memorial', 'Securitate', 'Collectivization in Romania',
    'Systematization (Romania)', 'Pitești Prison', 'Propaganda of the Socialist Republic of Romania',
    'Nicolae Ceaușescu', 'Elena Ceaușescu', 'Palace of the Parliament',
  ] },
  { grup: 'antic2', adanc: 2, cat: [
    'Getae', 'Thracian treasures', 'Histria (Romania)', 'Callatis', 'Tomis',
    'Scythian art', 'Pietroasele Treasure', 'Nagyszentmiklós Treasure',
    'Migration Period', 'Gepids', 'Ancient Greek coins of Thrace', 'Dacian coins',
    'Apahida necropolis', 'Sânnicolau Mare',
  ] },
  { grup: 'stiinta2', adanc: 2, cat: [
    'Henri Coandă', 'Traian Vuia', 'Aurel Vlaicu', 'Nicolae Paulescu',
    'George Emil Palade', 'Anghel Saligny', 'Cernavodă Bridge', 'Romanian Academy',
    'Romanian inventors', 'Spiru Haret', 'Emil Racoviță',
  ] },
  { grup: 'limba2', adanc: 2, cat: [
    'Romanian Cyrillic alphabet', 'Old Romanian books', 'Coresi',
    'Biblia de la București', 'Cazania lui Varlaam', 'Psaltirea Scheiană',
    'Manuscripts in Romanian', 'Romanian language',
  ] },
  { grup: 'cultura2', adanc: 2, cat: [
    'Constantin Brâncuși', 'George Enescu', 'Romanian Athenaeum', 'Mihai Eminescu',
    'Ion Luca Caragiale', 'Nicolae Tonitza', 'Theodor Pallady', 'Ion Creangă',
    'Romanian National Theatre', 'Romanian sculpture', 'Romanian literature',
  ] },
  { grup: 'medicina2', adanc: 2, cat: [
    'Victor Babeș', 'Ion Cantacuzino', 'Hospitals in Romania', 'Medicine in Romania',
    'Colțea Hospital', 'Pharmacies in Romania', 'Nurses of Romania',
  ] },
  { grup: 'sport2', adanc: 2, cat: [
    'Nadia Comăneci', 'Gymnastics in Romania', 'Football in Romania',
    'Romania at the Summer Olympics', 'Iolanda Balaș', 'Athletics in Romania',
    'Romanian sportspeople',
  ] },
  { grup: 'romi2', adanc: 2, cat: [
    'Romani people in Romania', 'Romani slavery', 'Romani people in art',
    'Romani people in the Holocaust', 'Romani people in Europe',
  ] },

  { grup: 'vederi', adanc: 2, cat: [
    'Historical images of Bucharest', 'Engravings of Romania',
    'Lithographs of Romania', 'Drawings of Romania', 'Watercolors of Romania',
    'Romania in art', 'Views of the Danube', 'Travel books about Romania',
    'Le Tour du Monde', 'The Illustrated London News',
  ] },
]

/* ========================================================================== */
if (process.argv[1]?.endsWith('cauta-mare.mjs')) {
  mkdirSync(RAD + 'ilustratii', { recursive: true })
  const doar = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const fonduri = doar.length ? FONDURI.filter((f) => doar.includes(f.grup)) : FONDURI
  const acumulat = existsSync(RAD + 'ilustratii/fond.json')
    ? JSON.parse(readFileSync(RAD + 'ilustratii/fond.json', 'utf8')) : {}

  for (const f of fonduri) {
    const vazut = new Set(Object.keys(acumulat[f.grup] || {}))
    const cutie = acumulat[f.grup] = acumulat[f.grup] || {}
    const cozi = [...f.cat]
    if (f.adanc >= 2) for (const c of f.cat) for (const s of subcategorii(c, 25)) cozi.push(s)
    let nou = 0
    for (const c of cozi) {
      for (const x of dinCategorie(c, { lim: 120, minLat: 900 })) {
        if (vazut.has(x.fisier)) continue
        vazut.add(x.fisier); cutie[x.fisier] = x; nou++
      }
    }
    console.log(`${f.grup.padEnd(14)} ${String(cozi.length).padStart(3)} categorii → ` +
      `${String(Object.keys(cutie).length).padStart(4)} fișiere (${nou} noi, ` +
      `${Object.values(cutie).filter((x) => /domeniu public/.test(x.tipLicenta)).length} PD)`)
    writeFileSync(RAD + 'ilustratii/fond.json', JSON.stringify(acumulat, null, 1))
  }
  const tot = Object.values(acumulat).reduce((n, g) => n + Object.keys(g).length, 0)
  console.log(`\nfond total: ${tot} fișiere verificate de licență`)
}
