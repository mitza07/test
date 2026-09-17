export interface CaseStudy {
  slug: string;
  sector: string;
  title: string;
  size: string;
  problem: string;
  intervention: string[];
  result: string;
  riskBefore: number;
  riskAfter: number;
  days: number;
  proof: { title: string; value: string; method: string };
  quote?: { text: string; role: string };
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "clinica",
    sector: "Clinică medicală",
    title: "Programări care nu mai depind de un cablu",
    size: "14 oameni · 2 cabinete",
    problem: "Programările se blocau când cădea rețeaua; datele pacienților stăteau pe stații necriptate; recepția folosea un cont partajat, fără MFA.",
    intervention: ["Segmentare rețea (recepție, cabinete, echipamente medicale, oaspeți) și legătură de rezervă 5G", "Criptare pe toate stațiile, chei păstrate central", "Backup 3-2-1 pentru aplicația de programări, cu restaurare demonstrată lunar", "Conturi individuale cu MFA; acces pe rol"],
    result: "Zero întreruperi de program din cauze IT în 9 luni; restaurare completă a aplicației de programări demonstrată în 6 minute; postură de la 31 la 88.",
    riskBefore: 184_000,
    riskAfter: 9_400,
    days: 90,
    proof: { title: "Restaurare aplicație programări", value: "6 min 04 s", method: "restaurare completă pe mediu izolat, verificată de manager" },
    quote: { text: "Prima dată când cineva mi-a spus cât ne costă riscul, în lei, și apoi mi-a arătat cum scade lună de lună.", role: "Administrator clinică" },
  },
  {
    slug: "contabilitate",
    sector: "Firmă de contabilitate",
    title: "Sezonul de raportări fără speranță ca strategie",
    size: "9 oameni · 140 de firme în portofoliu",
    problem: "În luna de raportări, un server plin sau un ransomware ar fi oprit tot biroul. Backup-ul exista, dar nu fusese restaurat niciodată. Certificatul SPV expirase o dată exact în ziua de depunere.",
    intervention: ["Monitorizare capacitate și hardware, cu prognoză", "Backup 3-2-1 imutabil, restaurare demonstrată lunar", "Registru de expirări (SPV, certificate, domenii) cu alerte la 90/30/7 zile", "E-mail cu DMARC pe reject și procedură de dublă verificare la plăți"],
    result: "Două sezoane de raportări fără incidente; restaurare demonstrată în 14 minute; 0 expirări surpriză în 18 luni.",
    riskBefore: 96_000,
    riskAfter: 6_100,
    days: 45,
    proof: { title: "Restaurare server fișiere + baza contabilă", value: "14 min", method: "exercițiu lunar, durata consemnată în jurnal" },
  },
  {
    slug: "distributie",
    sector: "Companie de distribuție",
    title: "Scannerele care cădeau zilnic aveau o cauză: rețeaua plată",
    size: "28 oameni · sediu + depozit",
    problem: "Depozitul și birourile în aceeași rețea; scannerele picau zilnic și nimeni nu știa de ce; o pană de internet la depozit oprea încărcările.",
    intervention: ["Wi-Fi enterprise proiectat pe zone, cu roaming", "VLAN-uri separate: birou, servere, echipamente depozit, oaspeți", "Geamăn digital: simularea căderii switch-ului și a fibrei, cu impact în lei", "Legătură de rezervă la depozit (în curs, pe baza simulării)"],
    result: "Scannere stabile din prima săptămână; incidente de rețea −87%; hartă de rețea generată automat; managementul a aprobat legătura de rezervă pe baza unei cifre: 7.400 lei/an risc evitat, pentru 150 lei/lună.",
    riskBefore: 85_600,
    riskAfter: 21_000,
    days: 60,
    proof: { title: "Incidente de rețea (90 de zile)", value: "31 → 4", method: "jurnal de alerte, comparat înainte / după" },
    quote: { text: "Am văzut pe ecran ce se oprește dacă moare un switch. A fost prima dată când am înțeles de ce cerea IT-ul bani.", role: "Director general" },
  },
  {
    slug: "productie",
    sector: "Producție / depozit",
    title: "Utilaje conectate, în sfârșit cu nume și proprietar",
    size: "46 oameni · hală + birouri",
    problem: "Utilaje conectate la rețea, dar fără evidență: cine, ce, unde. La un incident, nimeni nu știa ce a fost atins. Un PLC era accesibil din Wi-Fi-ul oaspeților.",
    intervention: ["Inventar complet, automat, al tuturor echipamentelor", "Segmentare pentru echipamentele industriale, cu acces controlat și jurnalizat", "Monitorizare pe echipamente critice, cu alerte calibrate", "Plan de răspuns la incident exersat cu șeful de producție"],
    result: "Fiecare echipament identificat și monitorizat; timp de identificare a cauzei la incident: de la „zile” la „minute”; audit al clientului principal trecut fără observații.",
    riskBefore: 228_000,
    riskAfter: 18_700,
    days: 120,
    proof: { title: "Echipamente inventariate automat", value: "131 / 131", method: "descoperire de rețea + validare fizică" },
  },
  {
    slug: "agentie",
    sector: "Birou profesional / agenție",
    title: "Cont nou funcțional în prima oră, cont vechi închis în prima oră",
    size: "22 oameni · hibrid",
    problem: "Onboarding-ul dura zile; plecările lăsau conturi active luni de zile; parolele partajate circulau pe chat.",
    intervention: ["Intenții automate de onboarding / offboarding", "Microsoft 365 administrat, MFA peste tot, acces condiționat", "Manager de parole al firmei", "Backup pentru Microsoft 365"],
    result: "Cont nou funcțional în prima oră (măsurat: 41 min mediană); 0 conturi orfane, verificat zilnic; 100% MFA.",
    riskBefore: 71_000,
    riskAfter: 4_300,
    days: 30,
    proof: { title: "Conturi orfane", value: "0", method: "comparare zilnică HR ↔ directorul de identități" },
  },
  {
    slug: "crestere",
    sector: "Firmă în creștere",
    title: "De la 8 la 30 de oameni fără ca IT-ul să devină haos",
    size: "8 → 30 oameni în 14 luni",
    problem: "IT-ul ad-hoc care mergea la 8 oameni a devenit haos la 30: conturi create divers, echipamente neinventariate, licențe plătite dublu, nimeni responsabil.",
    intervention: ["Imagine standard pentru stații; instalare în sub o oră", "Onboarding automat, inventar și licențe centralizate", "Plan IT pe 12 luni, cu buget în lei", "Raport lunar pentru fondatori"],
    result: "Creștere predictibilă: fiecare om nou costă exact 109 lei/lună în plus, nu o zi de haos; licențe −23%; prețul per om scade anual.",
    riskBefore: 58_000,
    riskAfter: 5_200,
    days: 60,
    proof: { title: "Timp de la angajare la cont funcțional", value: "41 min", method: "măsurat automat în fluxul de onboarding" },
  },
  {
    slug: "ransomware",
    sector: "Comerț cu ridicata",
    title: "Ransomware-ul a venit. Luni la 9, firma lucra.",
    size: "35 oameni · 1 sediu",
    problem: "Vineri seara un atașament a criptat serverul principal și mașinile virtuale. Clientul era la Nucleu de 5 luni.",
    intervention: ["EDR-ul a izolat stația-sursă în 40 de secunde; propagarea s-a oprit la segmentul de birou", "Copia offsite imutabilă era intactă", "Restaurare completă din imaginea de duminică 02:00, începută sâmbătă 08:10", "Comunicare cu managementul la fiecare 2 ore, cu timp estimat"],
    result: "Sistemele au revenit duminică 13:40 (RTO efectiv 29 h, sub garanția de 4 h doar pentru serviciile critice: ERP a fost repornit în 3 h 50 min pe replică). Date pierdute: 55 de minute. Cost total: 0 lei răscumpărare, 3.100 lei ore suplimentare.",
    riskBefore: 310_000,
    riskAfter: 21_000,
    days: 150,
    proof: { title: "Restaurare ERP pe replică", value: "3 h 50 min", method: "jurnal de incident, cu timpi și responsabili" },
    quote: { text: "Am aflat de atac dintr-un mesaj care spunea ce s-a întâmplat, ce s-a oprit și la ce oră revenim. Apoi s-a întâmplat exact așa.", role: "Administrator" },
  },
  {
    slug: "frauda",
    sector: "Servicii B2B",
    title: "Factura falsă de 87.000 lei care nu s-a plătit",
    size: "17 oameni",
    problem: "Un furnizor real a fost compromis; de pe contul lui a venit o „schimbare de cont bancar” pentru o factură reală de 87.000 lei.",
    intervention: ["Procedura de dublă verificare (instruită cu 2 luni înainte) a cerut confirmare telefonică la numărul cunoscut", "DMARC pe reject pe domeniul propriu, ca să nu poată fi folosit invers", "Simulare de phishing trimestrială, care includea exact acest tipar"],
    result: "Plata nu s-a făcut; furnizorul a fost anunțat că are contul compromis. Costul procedurii: 20 de minute de instruire. Costul evitat: 87.000 lei.",
    riskBefore: 89_000,
    riskAfter: 7_800,
    days: 60,
    proof: { title: "Plată deturnată evitată", value: "87.000 lei", method: "e-mailul fraudulos și confirmarea telefonică, în jurnal" },
  },
];

export function getCase(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
