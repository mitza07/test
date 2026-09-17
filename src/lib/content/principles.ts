export interface Principle {
  n: number;
  slug: string;
  title: string;
  short: string;
  body: string;
  /** Cum se vede concret în produs. */
  inProduct: string;
  /** De la cine am „furat” ideea. */
  mind: { name: string; years: string; idea: string };
}

export const principles: Principle[] = [
  {
    n: 1,
    slug: "dovada",
    title: "Dovada, nu promisiunea.",
    short: "Orice afirmație despre IT-ul tău vine cu un artefact verificabil: când, cum, cine.",
    body: "„Avem backup” nu înseamnă nimic. „Am restaurat ERP-ul complet ieri la 03:41, în 7 minute și 12 secunde, iată jurnalul” înseamnă tot. Nucleu produce dovezi, nu rapoarte de activitate: fiecare garanție are un test programat, iar rezultatul testului e vizibil în portal înainte să îl ceri.",
    inProduct: "Fiecare control din postura de securitate are un ID de dovadă (DOV-…), un moment și o metodă. Restaurările sunt demonstrate lunar, cu durata consemnată.",
    mind: { name: "W. Edwards Deming", years: "1900–1993", idea: "„În Dumnezeu avem încredere; toți ceilalți să aducă date.”" },
  },
  {
    n: 2,
    slug: "riscul-in-lei",
    title: "Riscul în lei, nu în culori.",
    short: "Roșu, galben, verde nu ajută pe nimeni să decidă. O sumă anuală, cu ipotezele la vedere, da.",
    body: "Un manager nu poate compara „risc mediu” cu „risc ridicat”. Poate compara 61.000 lei/an cu 4.200 lei/an. Nucleu exprimă fiecare risc ca pierdere anuală așteptată (probabilitate × impact), cu formula la vedere, ca să poți spune „nu” unei recomandări în cunoștință de cauză.",
    inProduct: "Registrul de risc din portal, simulatorul „ce se întâmplă dacă” și auditul gratuit vorbesc toate în lei/an, cu ipotezele editabile.",
    mind: { name: "Daniel Kahneman", years: "1934–2024", idea: "Oamenii decid prost sub incertitudine vagă și rezonabil când riscul e exprimat concret." },
  },
  {
    n: 3,
    slug: "intentie",
    title: "Intenție, nu tichete.",
    short: "Tu spui ce vrei să se întâmple. Sistemul orchestrează pașii și îți arată unde e.",
    body: "„Ana începe luni în vânzări” e o intenție. Contul, licența, grupurile, laptopul din imaginea standard, accesul la ERP și documentul pentru HR sunt pași pe care nu trebuie să îi ceri pe rând. Tichetele rămân pentru ce e cu adevărat nou; restul se întâmplă.",
    inProduct: "Modulul Intenții din portal: fluxuri pentru angajare, plecare, echipament nou, acces la o aplicație, cu fiecare pas marcat automat/uman.",
    mind: { name: "Grace Hopper", years: "1906–1992", idea: "„Cea mai periculoasă frază este: așa am făcut întotdeauna.”" },
  },
  {
    n: 4,
    slug: "auto-vindecare",
    title: "Auto-vindecare înainte de alertă.",
    short: "Problemele cunoscute se rezolvă singure, în minute. Oamenii intervin la ce e nou.",
    body: "Un serviciu care se oprește, un disc care se umple, un certificat care expiră: toate au o rezolvare cunoscută. Nucleu o aplică automat, o consemnează și îți spune ce a făcut și de ce. Timpul uman se cheltuiește pe judecată, nu pe repetiție.",
    inProduct: "Jurnalul din portal arată fiecare acțiune automată cu explicația ei; indicatorul „ore umane luna aceasta” scade de la o lună la alta.",
    mind: { name: "Norbert Wiener", years: "1894–1964", idea: "Cibernetica: un sistem stabil e unul cu bucle de feedback, nu unul supravegheat permanent." },
  },
  {
    n: 5,
    slug: "geaman-digital",
    title: "Simulează înainte să se întâmple.",
    short: "Geamănul digital al firmei tale răspunde la „ce se întâmplă dacă…” înainte de incident.",
    body: "IT-ul tău e un graf: oameni care folosesc servicii care rulează pe servere care depind de rețele și furnizori. Când graful e explicit, poți întreba: dacă moare switch-ul din depozit, cine nu mai lucrează, cât timp, cât costă? Iar răspunsul îți spune ce merită reparat înainte.",
    inProduct: "Geamănul digital și simulatorul din portal; același motor e disponibil public, gratuit, în Instrumente.",
    mind: { name: "Claude Shannon", years: "1916–2001", idea: "Un model bun separă semnalul de zgomot: nu vrei toate datele, vrei cele care schimbă decizia." },
  },
  {
    n: 6,
    slug: "cutia-de-sticla",
    title: "Cutia de sticlă: vezi tot ce vedem.",
    short: "Nicio consolă ascunsă. Aceleași ecrane, aceleași jurnale, aceleași dovezi pentru tine și pentru noi.",
    body: "Modelul clasic ține clientul în întuneric și îi trimite o factură. Nucleu inversează: portalul tău este consola noastră de lucru. Fiecare acțiune, umană sau automată, e vizibilă cu motivul ei, în limbaj clar. Încrederea nu se cere; se verifică.",
    inProduct: "Jurnalul complet, documentația vie, diagramele de rețea și toate credențialele stau în portalul tău, nu în fișierele noastre.",
    mind: { name: "Richard Feynman", years: "1918–1988", idea: "„Ce nu pot crea, nu înțeleg.” Dacă nu poți explica ce faci, nu ai terminat." },
  },
  {
    n: 7,
    slug: "ora-umana",
    title: "Ora umană e cea mai scumpă resursă. O raportăm.",
    short: "Scopul nu e să lucrăm mult la tine, ci din ce în ce mai puțin, pentru același rezultat.",
    body: "Furnizorii clasici sunt plătiți pentru ore, deci orele cresc. Nucleu raportează lunar câte ore umane a consumat infrastructura ta, ale noastre și ale tale, și își propune să le scadă. De aceea prețul scade anual: automatizarea noastră lucrează pentru tine.",
    inProduct: "Indicatorul „ore umane” în fiecare raport lunar și dividendul de automatizare: −3% pe an, 5 ani la rând.",
    mind: { name: "Buckminster Fuller", years: "1895–1983", idea: "Efemeralizarea: să faci din ce în ce mai mult cu din ce în ce mai puțin." },
  },
  {
    n: 8,
    slug: "clauza-de-divort",
    title: "Clauza de divorț: pleci oricând, cu tot.",
    short: "Fără contract minim. Tot ce am construit e al tău și îl primești exportat în 24 de ore.",
    body: "Un furnizor bun nu are nevoie de lacăte. Documentația, configurațiile, parolele, diagramele, jurnalele: toate sunt ale tale, exportabile oricând, în formate deschise. Dacă vrei să pleci, te ajutăm să pleci curat. Rămâi pentru că merită, nu pentru că nu poți.",
    inProduct: "Butonul „Exportă tot” în portal, oricând, fără aprobare. Clauza e scrisă în contract și publicată pe site.",
    mind: { name: "Elinor Ostrom", years: "1933–2012", idea: "Sistemele de încredere durabile au reguli clare, transparente și dreptul de a ieși." },
  },
  {
    n: 9,
    slug: "suveranitate",
    title: "Datele tale, cheile tale, în UE.",
    short: "Backup-uri în Uniunea Europeană, criptate cu chei pe care le poți deține tu.",
    body: "Suveranitatea nu e un slogan geopolitic, e o întrebare simplă: cine poate citi datele tale fără tine? Răspunsul corect e „nimeni”. Copiile stau în regiuni UE, criptate, cu opțiunea ca tu să deții cheile. Iar în limbă: tot ce primești e în română, fără jargon.",
    inProduct: "Backup offsite în regiuni UE, imutabil; BYOK în planul Suveran; rapoarte și portal în română.",
    mind: { name: "Hipocrate", years: "c. 460–370 î.Hr.", idea: "„În primul rând, să nu faci rău.” Orice schimbare are un drum înapoi." },
  },
  {
    n: 10,
    slug: "100-de-ani",
    title: "Construit pentru 100 de ani.",
    short: "Standarde deschise, fără dependență de un furnizor, documentație care supraviețuiește oamenilor.",
    body: "Tehnologiile se schimbă la 5 ani; principiile nu. Nucleu e construit pe formate deschise, protocoale standard și pe ideea că orice om poate fi înlocuit, inclusiv noi, fără ca firma ta să piardă ceva. Ce facem azi trebuie să aibă sens și în 2126.",
    inProduct: "Toată documentația e Markdown și diagrame deschise; configurațiile sunt cod versionat; nimic proprietar între tine și infrastructura ta.",
    mind: { name: "Nassim Nicholas Taleb", years: "1960–", idea: "Antifragilitatea: sistemele bune ies mai puternice din stres. Exercițiile de incident sunt vaccinul." },
  },
];

export const council = principles.map((p) => p.mind);
