export interface Segment {
  slug: string;
  name: string;
  headline: string;
  lead: string;
  pains: { title: string; body: string }[];
  answers: { title: string; body: string }[];
  offer: { title: string; price: string; detail: string }[];
  steps: string[];
  faq: { q: string; a: string }[];
  caseSlug?: string;
}

export const segments: Segment[] = [
  {
    slug: "contabili",
    name: "Cabinete de contabilitate",
    headline: "IT-ul în ordine pentru firmele din portofoliul tău. Și pentru tine.",
    lead: "Clienții te sună pe tine când nu merge calculatorul, când nu pleacă e-Factura, când a dispărut backup-ul. Nucleu devine partenerul IT pe care îl recomanzi cu numele tău, cu prețuri publicate și rapoarte pe care le primești și tu.",
    pains: [
      { title: "Ești suport IT fără să vrei", body: "Fiecare client cu un calculator lent sau un e-Factura blocat te sună pe tine, în luna de raportări." },
      { title: "Certificatul SPV expiră în ziua depunerii", body: "Nimeni nu urmărește valabilitatea; se descoperă când nu mai merge." },
      { title: "Backup-ul clientului e o speranță", body: "Când un client pierde datele, pierde și încrederea în tine, deși nu e vina ta." },
    ],
    answers: [
      { title: "Un singur partener IT pentru tot portofoliul", body: "Recomanzi Nucleu; noi preluăm relația, tu primești raportul lunar al fiecărei firme. Zero costuri pentru cabinet." },
      { title: "e-Factura / SPV monitorizate", body: "Certificat urmărit cu alerte la 90/30/7 zile, transmiteri verificate, erori tratate înainte de termen." },
      { title: "Rapoarte în lei, nu în jargon", body: "Fiecare firmă primește lunar: ce a mers, ce riscuri rămân, în lei. Tu primești sumarul portofoliului." },
    ],
    offer: [
      { title: "Nucleu Bază pentru firme mici", price: "de la 390 lei/lună", detail: "3–15 oameni: platformă completă, backup demonstrat trimestrial, raport lunar." },
      { title: "Monitorizare e-Factura / SPV", price: "35 lei / firmă / lună", detail: "Pentru tot portofoliul cabinetului; configurare inițială 990 lei, o singură dată." },
      { title: "Intervenții la cerere", price: "190 lei / oră", detail: "Prima oră de diagnostic e gratuită; estimare înainte de orice lucrare." },
    ],
    steps: ["Un apel de 20 de minute cu tine", "Audit gratuit (online, 15 minute, în lei) la fiecare firmă recomandată", "Facturare lunară, din prima zi a lunii, fără contract minim"],
    faq: [
      { q: "Cabinetul are vreo obligație?", a: "Niciuna. Relația contractuală e între Nucleu și fiecare firmă. Cabinetul primește rapoartele dacă firma alege asta." },
      { q: "Ce include monitorizarea e-Factura?", a: "Valabilitatea certificatului SPV, verificarea transmiterilor, alerte la erori, intervenție pentru remediere, raport lunar per firmă." },
      { q: "Prețurile sunt finale?", a: "Prețul per om e public. Extra-opțiunile (servere, locații) sunt publice. Nu există „ofertă după audit” cu surprize." },
    ],
    caseSlug: "contabilitate",
  },
  {
    slug: "clinici",
    name: "Clinici și cabinete medicale",
    headline: "Programul nu se oprește, datele pacienților nu pleacă.",
    lead: "O clinică nu poate „reveni mai târziu”: pacienții sunt în sala de așteptare. Nucleu proiectează IT-ul unei clinici ca pe un sistem care nu are voie să se oprească și care poate dovedi oricând cine a avut acces la ce.",
    pains: [
      { title: "Rețeaua cade, programările se blochează", body: "Un singur router, o singură legătură, zero rezervă." },
      { title: "Date medicale pe stații necriptate", body: "Un laptop pierdut devine o notificare la ANSPDCP." },
      { title: "Conturi partajate la recepție", body: "Nimeni nu poate spune cine a deschis o fișă." },
    ],
    answers: [
      { title: "Continuitate proiectată", body: "Legătură de rezervă comutată automat, echipamente de rezervă, restaurarea aplicației de programări demonstrată lunar." },
      { title: "Criptare și acces pe rol", body: "Toate stațiile criptate; conturi individuale cu MFA; jurnal de acces la datele pacienților." },
      { title: "Dovezi pentru audit", body: "Registru de controale mapat pe GDPR și cerințele DSP, exportabil oricând." },
    ],
    offer: [
      { title: "Nucleu Continuu", price: "109 lei / om / lună", detail: "Răspuns în 60 de minute, 24/7; revenire în 4 ore garantată." },
      { title: "Nucleu Suveran", price: "169 lei / om / lună", detail: "Revenire în 1 oră, chei proprii, prezență fizică programată." },
    ],
    steps: ["Audit gratuit pe loc, cu geamănul digital al clinicii", "Stabilizare în 30 de zile: rezervă, criptare, conturi", "Restaurare demonstrată în fața managerului, apoi lunar"],
    faq: [
      { q: "Lucrați cu aplicațiile medicale existente?", a: "Da. Nu schimbăm aplicația de programări sau de fișe; o protejăm: backup demonstrat, acces controlat, continuitate." },
      { q: "Ce se întâmplă la un incident cu date personale?", a: "Planul de răspuns include notificarea în 72 de ore, cu dovezile necesare deja pregătite din jurnale." },
    ],
    caseSlug: "clinica",
  },
  {
    slug: "distributie",
    name: "Distribuție și logistică",
    headline: "Depozitul lucrează chiar dacă se taie fibra.",
    lead: "În distribuție, IT-ul care cade înseamnă camioane care așteaptă. Nucleu modelează depozitul și sediul ca pe un singur sistem cu dependențe explicite și pune drumuri de rezervă exact acolo unde simularea arată că dor.",
    pains: [
      { title: "Scannerele cad și nimeni nu știe de ce", body: "Wi-Fi proiectat pentru birou, folosit într-o hală de 4.000 m²." },
      { title: "Depozitul și birourile în aceeași rețea", body: "Un scanner compromis ajunge la contabilitate." },
      { title: "O pană la depozit oprește încărcările", body: "Legătura unică, fără rezervă, fără cine să răspundă la 6 dimineața." },
    ],
    answers: [
      { title: "Wi-Fi proiectat pe zone", body: "Măsurători în hală, roaming, canale planificate; scannerele nu se mai deconectează." },
      { title: "Simulare înainte de buget", body: "Geamănul digital arată cât costă o oră fără ERP la depozit; decizia de rezervă se ia pe cifre." },
      { title: "Răspuns 24/7", body: "Când încarcă camioanele la 6, cineva răspunde în 60 de minute, garantat." },
    ],
    offer: [
      { title: "Nucleu Continuu", price: "109 lei / om / lună", detail: "+ 90 lei/lună pentru fiecare locație suplimentară." },
    ],
    steps: ["Audit cu măsurători Wi-Fi în hală", "Segmentare și rezervă în 30 de zile", "Simulare lunară cu managementul: ce s-a schimbat, ce riscuri rămân"],
    faq: [
      { q: "Lucrați cu WMS-ul / ERP-ul nostru?", a: "Da. Îl monitorizăm, îi facem backup demonstrat și îi proiectăm rețeaua. Nu îl înlocuim." },
    ],
    caseSlug: "distributie",
  },
  {
    slug: "agentii",
    name: "Agenții, birouri și echipe hibride",
    headline: "Oameni noi luni la 9, conturi vechi închise vineri la 18.",
    lead: "Într-o echipă care crește și lucrează de oriunde, IT-ul e mai ales identitate: cine are acces la ce, de pe ce dispozitiv. Nucleu automatizează intrările și ieșirile și protejează ce contează: datele din cloud.",
    pains: [
      { title: "Onboarding-ul durează zile", body: "Cont, licență, grupuri, laptop: fiecare cerut separat, de la altcineva." },
      { title: "Conturi orfane", body: "Foștii colaboratori încă văd documentele clienților." },
      { title: "E-mailul șters e șters definitiv", body: "Nimeni nu face backup la Microsoft 365 sau Google Workspace." },
    ],
    answers: [
      { title: "Intenții, nu tichete", body: "„Ana începe luni” declanșează tot: cont, licență, acces, laptop din imaginea standard, document pentru HR." },
      { title: "Zero conturi orfane, verificat zilnic", body: "Comparație automată între HR și directorul de identități." },
      { title: "Backup pentru cloud", body: "E-mail, Teams, SharePoint, Drive: salvate zilnic, cu retenție lungă." },
    ],
    offer: [
      { title: "Nucleu Bază", price: "69 lei / om / lună", detail: "Pentru echipe de 3–15 oameni, cu prețul care scade anual." },
      { title: "Nucleu Continuu", price: "109 lei / om / lună", detail: "Pentru echipe care nu-și permit o zi fără e-mail și documente." },
    ],
    steps: ["Audit online în 15 minute", "Identitate și backup cloud în 14 zile", "Raport lunar cu ore economisite"],
    faq: [
      { q: "Avem deja pe cineva care „se ocupă”?", a: "Perfect. Nucleu nu înlocuiește oamenii buni; le ia repetiția și le lasă judecata. Persoana voastră primește acces complet la portal." },
    ],
    caseSlug: "agentie",
  },
  {
    slug: "productie",
    name: "Producție",
    headline: "Utilajele conectate au nume, proprietar și un zid între ele și internet.",
    lead: "Producția nu are toleranță pentru „reinstalăm”. Nucleu inventariază tot ce e conectat, izolează echipamentele industriale de rețeaua de birou și pune monitorizare acolo unde o oprire costă cel mai mult.",
    pains: [
      { title: "Nimeni nu știe ce e conectat", body: "PLC-uri, panouri, imprimante de etichete: toate în rețea, niciuna în inventar." },
      { title: "Un laptop de birou poate atinge linia de producție", body: "Rețea plată, fără reguli." },
      { title: "Auditul clientului cere dovezi", body: "„Politici” care nu există și jurnale care nu se păstrează." },
    ],
    answers: [
      { title: "Inventar automat + validare fizică", body: "Fiecare echipament: ce e, unde e, cine răspunde, când a fost actualizat." },
      { title: "Segmentare industrială", body: "Zonă separată pentru echipamente, acces controlat și jurnalizat, monitorizare pe cele critice." },
      { title: "Dovezi exportabile", body: "Registrul de controale și jurnalele acoperă cerințele auditurilor de client și NIS2." },
    ],
    offer: [
      { title: "Nucleu Continuu", price: "109 lei / om / lună", detail: "Răspuns în 60 de minute, 24/7." },
      { title: "Nucleu Suveran", price: "169 lei / om / lună", detail: "Arhitect dedicat, prezență fizică programată, chei proprii." },
    ],
    steps: ["Descoperire de rețea și inventar în hală", "Segmentare fără oprirea producției (ferestre planificate)", "Exercițiu de incident cu șeful de producție"],
    faq: [
      { q: "Se oprește producția în timpul segmentării?", a: "Nu. Planificăm în ferestre de mentenanță existente și testăm fiecare pas în geamănul digital înainte." },
    ],
    caseSlug: "productie",
  },
];

export function getSegment(slug: string): Segment | undefined {
  return segments.find((s) => s.slug === slug);
}
