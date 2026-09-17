export interface Epoch {
  year: string;
  title: string;
  human: string;
  system: string;
  price: string;
  proof: string;
  /** Ce construim deja azi în direcția asta. */
  today: string;
}

export const epochs: Epoch[] = [
  {
    year: "2026",
    title: "Operare autonomă de nivel 1",
    human: "Oamenii verifică, decid și explică. Repetiția a dispărut.",
    system: "Problemele cunoscute se rezolvă singure; fiecare acțiune are un jurnal în limbaj clar. Riscul e exprimat în lei.",
    price: "Per om protejat, totul inclus, credite automate la garanții încălcate.",
    proof: "Restaurare demonstrată lunar; postura măsurată zilnic; jurnal complet vizibil clientului.",
    today: "Este produsul de azi: Nucleu Console, geamănul digital, simulatorul, auditul în lei.",
  },
  {
    year: "2030",
    title: "Infrastructură din intenție",
    human: "Descrii firma: câți oameni, ce aplicații, ce nu ai voie să pierzi. Sistemul o construiește și o întreține.",
    system: "Configurația e generată din politici, nu scrisă de mână. Fiecare schimbare e simulată în geamăn înainte de aplicare.",
    price: "Prețul scade cu fiecare an de automatizare: dividendul devine regulă de piață.",
    proof: "Atestare continuă: un terț independent poate verifica oricând că sistemul e ce spune că e.",
    today: "Intențiile din portal și configurațiile versionate ca cod sunt primii pași.",
  },
  {
    year: "2040",
    title: "Sisteme care își asumă riscul",
    human: "Managementul stabilește apetitul de risc în lei; restul e delegat.",
    system: "Agenții negociază cu furnizorii, mută sarcini între regiuni, repară înainte de defectare pe baza semnalelor.",
    price: "Prima de risc: plătești proporțional cu ce ar costa un incident, iar furnizorul poartă pierderea.",
    proof: "Garanțiile devin asigurări: fiecare oră de nefuncționare e plătită automat, fără discuții.",
    today: "Creditele SLA automate și registrul de risc în lei sunt embrionul acestui model.",
  },
  {
    year: "2060",
    title: "După dispozitive",
    human: "Identitatea și datele sunt singurele active. Hardware-ul e o utilitate, ca electricitatea.",
    system: "Nimic nu mai e „instalat”: mediul de lucru se materializează în jurul persoanei, oriunde, verificat criptografic.",
    price: "Se plătește protecția identității și a datelor, nu numărul de calculatoare.",
    proof: "Fiecare acces lasă o dovadă imposibil de falsificat; auditul e instantaneu, nu anual.",
    today: "De aceea prețul Nucleu e per om, nu per calculator, încă din 2026.",
  },
  {
    year: "2126",
    title: "Notarii realității digitale",
    human: "Oamenii stabilesc valori și limite. Sistemele le respectă și pot dovedi că le respectă.",
    system: "Infrastructura e invizibilă și rezilientă ca un organism: se vindecă, evoluează, își limitează singură rapiditatea când dăunează.",
    price: "Ce rămâne de plătit: încrederea verificată. Cineva trebuie să poată jura că ce crezi despre sistemele tale e adevărat.",
    proof: "Dovada devine produsul. Furnizorul de IT devine notar: entitatea care atestă, independent, starea reală a lucrurilor.",
    today: "Nucleu începe de aici: dovezi în loc de promisiuni, ca principiu de proiectare, nu ca funcție.",
  },
];

export const invariants = [
  { title: "Încrederea trebuie dovedită.", body: "Nici în 2126 nu va exista „ai încredere în noi”. Va exista „verifică”. Construim pentru verificare din prima zi." },
  { title: "Riscul trebuie măsurat în ceva ce poți compara.", body: "Banii sunt limbajul comun al deciziilor. Orice altceva (culori, scoruri, adjective) e o traducere cu pierderi." },
  { title: "Oamenii trebuie să poată pleca.", body: "Un sistem din care nu poți ieși nu e un serviciu, e o capcană. Clauza de divorț e o valoare, nu o clauză." },
  { title: "Ora umană rămâne cea mai scumpă.", body: "Orice tehnologie care crește orele de muncă umană pentru același rezultat e o regresie, indiferent cât e de nouă." },
  { title: "Ce nu e explicat nu e terminat.", body: "O acțiune fără o explicație pe înțelesul celui afectat e o datorie. Sistemele bune vorbesc limba oamenilor." },
];
