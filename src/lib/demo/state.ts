import { demoTwin, computeRisk, posture } from "@/lib/twin";
import { proofId } from "@/lib/format";

/** „Acum” fix pentru demonstrații, ca serverul și browserul să randeze identic. */
export const DEMO_NOW = "2026-09-17T10:20:00+03:00";

export const uptime30 = [
  99.98, 100, 100, 100, 99.97, 100, 100, 100, 100, 100, 99.99, 100, 100, 100, 100, 100, 100, 99.94, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
];

export const dayStatus30 = uptime30.map((u) => (u >= 99.99 ? "ok" : u >= 99.95 ? "warn" : "bad") as "ok" | "warn" | "bad");

export const humanHoursByMonth = { labels: ["mar", "apr", "mai", "iun", "iul", "aug", "sep"], values: [27.5, 18.2, 12.4, 8.9, 6.1, 4.4, 3.2] };
export const demoRisk = computeRisk(demoTwin);
export const demoPosture = posture();
export const riskByMonth = {
  labels: ["mar", "apr", "mai", "iun", "iul", "aug", "sep"],
  values: [0, 1, 2, 3, 4, 5, 6].map((i) => Math.round(demoRisk.totalBefore * Math.pow(demoRisk.totalNow / demoRisk.totalBefore, i / 6))),
};
export const autoActionsByWeek = [31, 28, 44, 39, 47, 52, 49, 58];

export const restoreProof = {
  id: proofId("restore", "2026-09-16", 41),
  title: "Restaurare completă ERP (mașină virtuală + bază de date)",
  value: "7 min 12 s",
  when: "16 sep 2026, 03:41",
  method: "restaurare pe mediu izolat, verificare integritate, comparare 1.240 înregistrări cu producția",
};

export const mfaProof = {
  id: proofId("mfa", "2026-09-17", 7),
  title: "Acoperire MFA",
  value: "28 / 30 conturi",
  when: "17 sep 2026, 06:00",
  method: "interogare zilnică a directorului de identități; 2 conturi cu plan de activare",
};

export const patchProof = {
  id: proofId("patch", "2026-09-17", 3),
  title: "Actualizări de securitate sub 14 zile",
  value: "21 / 22 stații",
  when: "17 sep 2026, 06:00",
  method: "raport agent endpoint; 1 stație offline de 19 zile (laptop concediu)",
};

export interface JournalEntry {
  at: string;
  actor: "auto" | "uman" | "client";
  kind: "remediere" | "dovadă" | "securitate" | "intenție" | "schimbare" | "alertă";
  title: string;
  why: string;
  duration?: string;
}

export const journal: JournalEntry[] = [
  { at: "2026-09-17T09:58:00+03:00", actor: "auto", kind: "remediere", title: "Serviciul de imprimare repornit pe SRV-01", why: "Coada de imprimare blocată de 4 minute (3 lucrări); repornirea e remedierea cunoscută, fără impact asupra altor servicii.", duration: "12 s" },
  { at: "2026-09-17T09:31:00+03:00", actor: "auto", kind: "securitate", title: "IP extern blocat după 40 de autentificări eșuate", why: "Tipar de forță brută pe VPN; blocare 24 h, notificare informativă, fără cont compromis.", duration: "1 s" },
  { at: "2026-09-17T08:40:00+03:00", actor: "client", kind: "intenție", title: "Intenție creată: „Ana Pop începe luni în vânzări”", why: "Declanșează: cont M365, licență Business Premium, grupuri Vânzări, laptop din imaginea standard, acces ERP rol agent, document HR.", duration: "în curs · 4/6 pași" },
  { at: "2026-09-17T06:00:00+03:00", actor: "auto", kind: "dovadă", title: `Postura de securitate recalculată: ${demoPosture.score}/100`, why: "20 de controale verificate; 4 parțiale (MFA 2 conturi, DMARC quarantine, failover depozit, 1 stație fără patch).", duration: "38 s" },
  { at: "2026-09-16T03:41:00+03:00", actor: "auto", kind: "dovadă", title: "Restaurare demonstrată: ERP complet, 7 min 12 s", why: "Exercițiu lunar programat; restaurare pe mediu izolat, integritate verificată, DOV-RESTORE-20260916-041.", duration: "7 min 12 s" },
  { at: "2026-09-15T14:12:00+03:00", actor: "uman", kind: "schimbare", title: "Regulă firewall adăugată: VLAN depozit → ERP (port 8443)", why: "Cerută de intenția „scannere noi”; simulată în geamăn (fără impact asupra segmentării); aprobată de client; revizuire la 90 de zile.", duration: "18 min" },
  { at: "2026-09-14T22:05:00+03:00", actor: "auto", kind: "alertă", title: "Legătura internet depozit: 2 întreruperi de 3 minute", why: "Fără legătură de rezervă la depozit; propunere deschisă în registrul de risc (≈ 7.400 lei/an risc evitat pentru 150 lei/lună).", duration: "6 min" },
  { at: "2026-09-12T11:20:00+03:00", actor: "uman", kind: "securitate", title: "Simulare de phishing trimestrială: 28 trimise, 1 clic, 0 parole introduse", why: "Instruire de 10 minute programată pentru echipa afectată; scorul echipei: 96%.", duration: "45 min" },
];

export const intents = [
  { id: "INT-2026-0412", title: "Ana Pop începe luni în vânzări", status: "în curs", steps: [
    { t: "Cont Microsoft 365 + licență", by: "auto", done: true },
    { t: "Grupuri și permisiuni (Vânzări)", by: "auto", done: true },
    { t: "Laptop din imaginea standard", by: "tehnician", done: true },
    { t: "Acces ERP: rol agent vânzări", by: "auto", done: true },
    { t: "Manager de parole: seif Vânzări", by: "auto", done: false },
    { t: "Document predare pentru HR", by: "auto", done: false },
  ] },
  { id: "INT-2026-0409", title: "8 scannere noi în depozit", status: "planificat · 21 sep", steps: [
    { t: "Simulare în geamăn: impact zero pe segmentare", by: "auto", done: true },
    { t: "Regulă firewall VLAN depozit → ERP", by: "uman", done: true },
    { t: "Profil Wi-Fi + certificate pe scannere", by: "tehnician", done: false },
    { t: "Inventar + monitorizare", by: "auto", done: false },
  ] },
  { id: "INT-2026-0401", title: "Radu M. pleacă din firmă (30 sep)", status: "programat", steps: [
    { t: "Blocare conturi la 18:00 în ultima zi", by: "auto", done: false },
    { t: "Transfer OneDrive și e-mail către manager", by: "auto", done: false },
    { t: "Revocare acces ERP, VPN, manager parole", by: "auto", done: false },
    { t: "Laptop: ștergere securizată + reimaginare", by: "tehnician", done: false },
    { t: "Confirmare: 0 accese rămase", by: "auto", done: false },
  ] },
];

export const tickets = [
  { id: "#1042", title: "Imprimantă etaj 2 offline", status: "rezolvat automat", time: "12 s", who: "auto" },
  { id: "#1041", title: "VPN lent de la sediul secundar", status: "rezolvat", time: "38 min", who: "Mihai C." },
  { id: "#1040", title: "Excel se închide la deschiderea raportului mare", status: "în lucru", time: "22 min", who: "Ioana D." },
  { id: "#1039", title: "Acces la folderul Licitații pentru 2 colegi", status: "așteaptă aprobare client", time: "—", who: "auto" },
];

export const invoice = {
  month: "septembrie 2026",
  lines: [
    { label: "Nucleu Continuu · 28 oameni protejați", qty: 28, unit: 109, total: 3052 },
    { label: "Server on-prem (SRV-01)", qty: 1, unit: 120, total: 120 },
    { label: "Locație suplimentară (Depozit Chitila)", qty: 1, unit: 90, total: 90 },
  ],
  dividend: { label: "Dividend de automatizare (an 1: −3%)", amount: -98 },
  credits: { label: "Credite SLA luna aceasta", amount: 0 },
  total: 3164,
};

export const documents = [
  { name: "Harta rețelei (generată automat)", type: "diagramă", updated: "azi 06:00", format: "SVG + Markdown" },
  { name: "Registrul de risc", type: "registru", updated: "azi 06:00", format: "CSV + PDF" },
  { name: "Proceduri: răspuns la incident v3", type: "procedură", updated: "12 iul 2026", format: "Markdown" },
  { name: "Proceduri: onboarding / offboarding", type: "procedură", updated: "3 sep 2026", format: "Markdown" },
  { name: "Configurații firewall (versionate)", type: "configurație", updated: "15 sep 2026", format: "Git" },
  { name: "Inventar echipamente și licențe", type: "inventar", updated: "azi 06:00", format: "CSV" },
  { name: "Raport executiv august 2026", type: "raport", updated: "1 sep 2026", format: "PDF" },
  { name: "Dovezi (toate DOV-…)", type: "dovezi", updated: "azi 06:00", format: "JSON semnat" },
];
