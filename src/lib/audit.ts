import type { Layer } from "./twin/types";
import { layerLabels, layerOrder } from "./twin/risk";

/**
 * Auditul IT auto-servit: 24 de întrebări, 7 straturi, rezultat în lei.
 * Modelul e intenționat simplu și transparent: fiecare număr are o formulă vizibilă.
 */

export interface AuditOption {
  value: string;
  label: string;
  /** 0 = lipsă totală, 1 = control complet. */
  score: number;
}

export interface AuditQuestion {
  id: string;
  layer: Layer;
  text: string;
  help?: string;
  options: AuditOption[];
  /** Ce recomandăm când răspunsul nu e maxim. */
  action: string;
  /** Efort estimat pentru remediere: 1 (o zi) … 3 (un proiect). */
  effort: 1 | 2 | 3;
}

export interface AuditProfile {
  people: number;
  annualRevenue: number;
  sector: string;
  dataSensitivity: 1 | 2 | 3 | 4 | 5;
}

export type AuditAnswers = Record<string, string>;

export const auditQuestions: AuditQuestion[] = [
  // Identitate
  { id: "mfa", layer: "identity", text: "Câte dintre conturile de e-mail / cloud ale firmei au autentificare în doi pași (MFA)?", options: [
    { value: "none", label: "Niciunul sau nu știu", score: 0 },
    { value: "some", label: "Doar câteva (management, IT)", score: 0.35 },
    { value: "most", label: "Majoritatea, dar nu toate", score: 0.7 },
    { value: "all", label: "Toate, obligatoriu", score: 1 },
  ], action: "Activează MFA obligatoriu pentru toate conturile, începând cu e-mailul și administratorii.", effort: 1 },
  { id: "admin", layer: "identity", text: "Conturile de administrator sunt separate de conturile folosite zilnic?", options: [
    { value: "no", label: "Nu, aceleași conturi fac tot", score: 0 },
    { value: "partial", label: "Parțial", score: 0.5 },
    { value: "yes", label: "Da, conturi separate, folosite doar pentru administrare", score: 1 },
  ], action: "Separă conturile privilegiate și revizuiește-le trimestrial.", effort: 1 },
  { id: "offboarding", layer: "identity", text: "Când pleacă un angajat, în cât timp îi sunt închise toate accesele?", options: [
    { value: "unknown", label: "Nu există un proces; se întâmplă când își amintește cineva", score: 0 },
    { value: "days", label: "În câteva zile", score: 0.4 },
    { value: "sameday", label: "În aceeași zi", score: 0.75 },
    { value: "auto", label: "Automat, în prima oră, cu listă de verificare", score: 1 },
  ], action: "Introdu un flux de offboarding cu listă de verificare și verificare lunară a conturilor orfane.", effort: 1 },
  { id: "passwords", layer: "identity", text: "Cum sunt gestionate parolele partajate (bancă, furnizori, portaluri)?", options: [
    { value: "chat", label: "Pe e-mail / WhatsApp / într-un Excel", score: 0 },
    { value: "mixed", label: "Unii folosesc un manager de parole, alții nu", score: 0.5 },
    { value: "manager", label: "Manager de parole al firmei, cu acces pe rol", score: 1 },
  ], action: "Adoptă un manager de parole cu seifuri pe echipe și elimină parolele din chat.", effort: 1 },

  // Dispozitive
  { id: "encryption", layer: "devices", text: "Discurile laptopurilor și stațiilor sunt criptate?", options: [
    { value: "no", label: "Nu / nu știu", score: 0 },
    { value: "some", label: "Doar unele", score: 0.5 },
    { value: "all", label: "Toate, cu cheile păstrate central", score: 1 },
  ], action: "Activează criptarea discului (BitLocker/FileVault) cu chei salvate central.", effort: 1 },
  { id: "patching", layer: "devices", text: "Cât de repede ajung actualizările de securitate pe stații și servere?", options: [
    { value: "never", label: "Când vrea Windows / nu urmărește nimeni", score: 0 },
    { value: "months", label: "Din când în când, manual", score: 0.35 },
    { value: "month", label: "Într-o lună", score: 0.7 },
    { value: "twoweeks", label: "În sub 14 zile, verificat", score: 1 },
  ], action: "Patch management programat, cu raport de conformitate la 14 zile.", effort: 2 },
  { id: "edr", layer: "devices", text: "Ce protecție rulează pe stații?", options: [
    { value: "none", label: "Antivirusul din Windows, neadministrat", score: 0.2 },
    { value: "av", label: "Antivirus instalat, dar nimeni nu se uită la el", score: 0.45 },
    { value: "edr", label: "Protecție administrată central, cu alerte urmărite", score: 1 },
  ], action: "Protecție endpoint administrată central (EDR), cu răspuns la alerte.", effort: 2 },
  { id: "inventory", layer: "devices", text: "Există o listă completă a echipamentelor, cu cine le folosește și când expiră garanția?", options: [
    { value: "no", label: "Nu", score: 0 },
    { value: "partial", label: "Există, dar nu e la zi", score: 0.5 },
    { value: "yes", label: "Da, la zi, cu garanții și licențe", score: 1 },
  ], action: "Inventar automat al echipamentelor și licențelor.", effort: 1 },

  // Rețea
  { id: "segmentation", layer: "network", text: "Rețeaua e împărțită (birou, oaspeți, echipamente, servere)?", options: [
    { value: "flat", label: "Totul e în aceeași rețea, inclusiv Wi-Fi-ul oaspeților", score: 0 },
    { value: "guest", label: "Doar oaspeții sunt separați", score: 0.5 },
    { value: "segmented", label: "Da, segmentată, cu reguli între segmente", score: 1 },
  ], action: "Segmentare pe VLAN-uri cu reguli explicite între zone.", effort: 2 },
  { id: "firewall", layer: "network", text: "Regulile de firewall sunt documentate și revizuite?", options: [
    { value: "unknown", label: "Nu știm ce reguli există", score: 0 },
    { value: "some", label: "Există, dar nu le-a mai revizuit nimeni", score: 0.4 },
    { value: "yes", label: "Da, fiecare regulă are un motiv și e revizuită periodic", score: 1 },
  ], action: "Revizuirea și documentarea regulilor de firewall; eliminarea celor „temporare”.", effort: 1 },
  { id: "redundancy", layer: "network", text: "Dacă pică internetul la sediu, ce se întâmplă?", options: [
    { value: "stop", label: "Se oprește tot până revine", score: 0 },
    { value: "manual", label: "Cineva pornește un hotspot", score: 0.4 },
    { value: "auto", label: "Comută automat pe o legătură de rezervă", score: 1 },
  ], action: "Legătură de rezervă (4G/5G) cu comutare automată.", effort: 1 },

  // E-mail
  { id: "dmarc", layer: "email", text: "Domeniul de e-mail are SPF, DKIM și DMARC configurate?", help: "Poți verifica gratuit în Instrumente → Verificare e-mail.", options: [
    { value: "unknown", label: "Nu știu ce sunt", score: 0 },
    { value: "spf", label: "Doar SPF", score: 0.35 },
    { value: "spfdkim", label: "SPF și DKIM", score: 0.65 },
    { value: "all", label: "Toate trei, cu DMARC pe „reject”", score: 1 },
  ], action: "Configurează SPF, DKIM și DMARC și adu DMARC la „reject”.", effort: 1 },
  { id: "phishing", layer: "email", text: "Echipa e pregătită împotriva phishing-ului?", options: [
    { value: "no", label: "Nu s-a discutat", score: 0 },
    { value: "once", label: "S-a făcut o instruire cândva", score: 0.4 },
    { value: "regular", label: "Simulări periodice și instruire scurtă", score: 1 },
  ], action: "Simulări de phishing trimestriale, cu instruire de 10 minute.", effort: 1 },
  { id: "payments", layer: "email", text: "Ce se întâmplă când un furnizor „schimbă contul bancar” prin e-mail?", options: [
    { value: "pay", label: "Se plătește în noul cont", score: 0 },
    { value: "sometimes", label: "Depinde de cine primește e-mailul", score: 0.35 },
    { value: "verify", label: "Se verifică telefonic, la un număr cunoscut, obligatoriu", score: 1 },
  ], action: "Procedură scrisă de dublă verificare pentru orice schimbare de cont bancar.", effort: 1 },

  // Backup
  { id: "backup", layer: "backup", text: "Unde sunt copiile de siguranță ale datelor importante?", options: [
    { value: "none", label: "Nu există / doar pe același calculator", score: 0 },
    { value: "local", label: "Pe un disc extern sau NAS în același birou", score: 0.35 },
    { value: "cloud", label: "Local și într-un cloud", score: 0.7 },
    { value: "321", label: "3 copii, 2 medii, 1 în altă locație", score: 1 },
  ], action: "Lanț de backup 3-2-1, cu copie în altă locație.", effort: 2 },
  { id: "immutable", layer: "backup", text: "Poate un ransomware să șteargă sau să cripteze backup-ul?", options: [
    { value: "yes", label: "Da, e pe rețea, accesibil de oriunde", score: 0 },
    { value: "unknown", label: "Nu știu", score: 0.2 },
    { value: "no", label: "Nu, copia offsite e imutabilă / deconectată", score: 1 },
  ], action: "Copie imutabilă (nu poate fi modificată o perioadă), separată de rețeaua de birou.", effort: 2 },
  { id: "restore", layer: "backup", text: "Când a fost ultima dată când ați restaurat efectiv ceva din backup, ca test?", options: [
    { value: "never", label: "Niciodată", score: 0 },
    { value: "year", label: "Acum mai mult de un an", score: 0.3 },
    { value: "quarter", label: "În ultimele 3 luni", score: 0.7 },
    { value: "month", label: "Lunar, cu timpul măsurat și consemnat", score: 1 },
  ], action: "Restaurare demonstrată lunar, cu durata consemnată.", effort: 1 },
  { id: "saas", layer: "backup", text: "E-mailul și documentele din cloud (Microsoft 365 / Google) au un backup separat?", options: [
    { value: "no", label: "Nu, ne bazăm pe furnizor", score: 0 },
    { value: "partial", label: "Doar pentru unele conturi", score: 0.5 },
    { value: "yes", label: "Da, zilnic, cu retenție lungă", score: 1 },
  ], action: "Backup zilnic pentru Microsoft 365 / Google Workspace.", effort: 1 },

  // Monitorizare
  { id: "monitoring", layer: "monitoring", text: "Cum aflați că un server sau un serviciu are probleme?", options: [
    { value: "people", label: "De la colegi, când nu mai merge", score: 0 },
    { value: "some", label: "Avem niște alerte, dar nu le urmărește nimeni constant", score: 0.4 },
    { value: "full", label: "Monitorizare permanentă, cu alerte către cineva responsabil", score: 1 },
  ], action: "Monitorizare 24/7 a serverelor, serviciilor și legăturilor, cu alerte calibrate.", effort: 2 },
  { id: "expiry", layer: "monitoring", text: "Certificatele, domeniile, garanțiile și licențele sunt urmărite înainte să expire?", options: [
    { value: "no", label: "Aflăm când expiră", score: 0 },
    { value: "partial", label: "Parțial, într-un calendar", score: 0.5 },
    { value: "yes", label: "Da, automat, cu alerte la 90/30/7 zile", score: 1 },
  ], action: "Registru de expirări cu alerte automate.", effort: 1 },
  { id: "capacity", layer: "monitoring", text: "Știți cât de încărcate sunt serverele și cât spațiu mai e liber?", options: [
    { value: "no", label: "Nu", score: 0 },
    { value: "sometimes", label: "Verifică cineva ocazional", score: 0.5 },
    { value: "yes", label: "Da, cu prognoză pe 12 luni", score: 1 },
  ], action: "Metrici de capacitate cu prognoză și plan de înlocuire.", effort: 1 },

  // Răspuns
  { id: "plan", layer: "response", text: "Există un plan scris pentru un incident major (ransomware, server căzut)?", options: [
    { value: "no", label: "Nu", score: 0 },
    { value: "informal", label: "Știm cam ce am face", score: 0.3 },
    { value: "written", label: "Da, scris, cu responsabili", score: 0.7 },
    { value: "tested", label: "Da, scris și exersat în ultimul an", score: 1 },
  ], action: "Plan de răspuns la incident, exersat anual cu managementul.", effort: 2 },
  { id: "docs", layer: "response", text: "Dacă persoana care „știe IT-ul” dispare mâine, cât rămâne documentat?", options: [
    { value: "nothing", label: "Aproape nimic; totul e în capul ei", score: 0 },
    { value: "partial", label: "Parțial, împrăștiat", score: 0.4 },
    { value: "full", label: "Tot: parole, configurații, proceduri, diagrame, la zi", score: 1 },
  ], action: "Documentație vie: diagrame, proceduri, credențiale, într-un singur loc, exportabilă.", effort: 2 },
  { id: "reporting", layer: "response", text: "Managementul primește un raport periodic despre starea IT-ului, pe limba lui?", options: [
    { value: "no", label: "Nu", score: 0 },
    { value: "adhoc", label: "Doar când e o problemă", score: 0.4 },
    { value: "monthly", label: "Lunar: ce a mers, ce riscuri rămân, ce urmează", score: 1 },
  ], action: "Raport lunar executiv: uptime, incidente, riscuri în lei, decizii cerute.", effort: 1 },
];

/* ---------------- Scenarii de risc generice ---------------- */

interface ScenarioDef {
  id: string;
  title: string;
  layer: Layer;
  /** Probabilitate anuală de bază pentru o firmă fără controale. */
  pBase: number;
  /** Cât la sută din probabilitate pot elimina controalele (niciodată 100%). */
  maxPReduction: number;
  /** Întrebările care reduc probabilitatea, cu ponderi. */
  pControls: Array<[string, number]>;
  /** Întrebările care reduc impactul (recuperare), cu ponderi. */
  impactControls: Array<[string, number]>;
  maxImpactReduction: number;
  impact: (p: AuditProfile) => number;
  assumption: string;
}

const hourlyCost = 90; // lei/oră/persoană, cost complet cu angajatul (ipoteză explicită)

const revenuePerHour = (p: AuditProfile) => p.annualRevenue / 2000;

export const auditScenarios: ScenarioDef[] = [
  {
    id: "ransomware",
    title: "Ransomware: tot ce e pe rețea e criptat",
    layer: "backup",
    pBase: 0.22,
    maxPReduction: 0.8,
    pControls: [["edr", 3], ["patching", 2], ["segmentation", 2], ["phishing", 1], ["mfa", 1]],
    impactControls: [["backup", 3], ["immutable", 3], ["restore", 3], ["plan", 1]],
    maxImpactReduction: 0.85,
    impact: (p) => p.people * hourlyCost * 0.7 * 72 + revenuePerHour(p) * 0.5 * 72 * 0.35 + p.people * hourlyCost * 48 + 15_000 + 3_000 * p.dataSensitivity,
    assumption: "Fără backup restaurabil: 3 zile de oprire, 2 zile de muncă pierdută pentru reintroducerea datelor, costuri de intervenție.",
  },
  {
    id: "hardware",
    title: "Serverul principal se defectează",
    layer: "monitoring",
    pBase: 0.15,
    maxPReduction: 0.5,
    pControls: [["monitoring", 2], ["capacity", 1], ["inventory", 1]],
    impactControls: [["backup", 2], ["restore", 3], ["docs", 1]],
    maxImpactReduction: 0.85,
    impact: (p) => p.people * hourlyCost * 0.7 * 24 + revenuePerHour(p) * 0.5 * 24 * 0.35 + p.people * hourlyCost * 8 + 4_000,
    assumption: "Fără plan de restaurare: o zi de oprire plus o zi de date reintroduse.",
  },
  {
    id: "account",
    title: "Cont de e-mail compromis",
    layer: "identity",
    pBase: 0.5,
    maxPReduction: 0.85,
    pControls: [["mfa", 4], ["phishing", 2], ["passwords", 1], ["admin", 1]],
    impactControls: [["offboarding", 1], ["plan", 1], ["saas", 1]],
    maxImpactReduction: 0.5,
    impact: (p) => 6 * hourlyCost * 8 + 3_500 + 2_000 * p.dataSensitivity,
    assumption: "Investigație, resetări, notificări, timp pierdut de echipă; expunere de date proporțională cu sensibilitatea.",
  },
  {
    id: "bec",
    title: "Fraudă cu factură falsă (cont bancar schimbat)",
    layer: "email",
    pBase: 0.3,
    maxPReduction: 0.9,
    pControls: [["payments", 4], ["dmarc", 2], ["phishing", 2], ["mfa", 1]],
    impactControls: [],
    maxImpactReduction: 0,
    impact: (p) => Math.min(250_000, Math.max(15_000, p.annualRevenue * 0.012)),
    assumption: "O plată medie către furnizor deturnată: ~1,2% din venitul anual, între 15.000 și 250.000 lei.",
  },
  {
    id: "internet",
    title: "Pană de internet la sediu",
    layer: "network",
    pBase: 1.5,
    maxPReduction: 0.95,
    pControls: [["redundancy", 4]],
    impactControls: [],
    maxImpactReduction: 0,
    impact: (p) => p.people * hourlyCost * 0.7 * 4 + revenuePerHour(p) * 0.5 * 4 * 0.35,
    assumption: "1,5 pene pe an, în medie 4 ore fiecare.",
  },
  {
    id: "device",
    title: "Laptop pierdut sau furat",
    layer: "devices",
    pBase: 0.35,
    maxPReduction: 0.3,
    pControls: [["inventory", 1]],
    impactControls: [["encryption", 4], ["mfa", 1], ["offboarding", 1]],
    maxImpactReduction: 0.85,
    impact: (p) => 8_000 + 4_000 * p.dataSensitivity + hourlyCost * 16,
    assumption: "Fără criptare: notificări, expunere de date, reconfigurare; cu criptare rămâne doar costul echipamentului.",
  },
  {
    id: "orphan",
    title: "Fost angajat cu acces încă activ",
    layer: "identity",
    pBase: 0.4,
    maxPReduction: 0.9,
    pControls: [["offboarding", 4], ["passwords", 2], ["inventory", 1]],
    impactControls: [["docs", 1]],
    maxImpactReduction: 0.3,
    impact: (p) => 6_000 + 1_500 * p.dataSensitivity + revenuePerHour(p) * 2,
    assumption: "Date comerciale copiate sau modificate; timp de investigație.",
  },
  {
    id: "knowledge",
    title: "Omul care „știe IT-ul” pleacă",
    layer: "response",
    pBase: 0.25,
    maxPReduction: 0.2,
    pControls: [],
    impactControls: [["docs", 4], ["inventory", 1], ["reporting", 1]],
    maxImpactReduction: 0.9,
    impact: (p) => 12_000 + p.people * hourlyCost * 6,
    assumption: "Reconstituirea configurațiilor, parolelor și procedurilor de la zero.",
  },
];

export interface AuditRiskLine {
  id: string;
  title: string;
  layer: Layer;
  probability: number;
  impact: number;
  eal: number;
  /** Cât ar rămâne dacă toate controalele relevante ar fi complete. */
  ealIfFixed: number;
  assumption: string;
}

export interface AuditAction {
  questionId: string;
  layer: Layer;
  title: string;
  effort: 1 | 2 | 3;
  savedPerYear: number;
}

export interface AuditResult {
  overall: number;
  maturity: { label: string; description: string };
  layers: Array<{ layer: Layer; name: string; score: number; answered: number; total: number }>;
  risks: AuditRiskLine[];
  totalEal: number;
  totalEalIfFixed: number;
  actions: AuditAction[];
  answeredCount: number;
  questionCount: number;
}

function optionScore(q: AuditQuestion, answers: AuditAnswers): number | null {
  const v = answers[q.id];
  if (v === undefined) return null;
  const o = q.options.find((x) => x.value === v);
  return o ? o.score : null;
}

function weightedReduction(controls: Array<[string, number]>, scores: Record<string, number>): number {
  const totalW = controls.reduce((s, [, w]) => s + w, 0);
  if (totalW === 0) return 0;
  return controls.reduce((s, [id, w]) => s + w * (scores[id] ?? 0), 0) / totalW;
}

export function scoreMap(answers: AuditAnswers): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const q of auditQuestions) {
    const s = optionScore(q, answers);
    // Întrebările fără răspuns sunt tratate pesimist (0), ca să nu ascundem risc.
    scores[q.id] = s ?? 0;
  }
  return scores;
}

export function evaluateScenarios(scores: Record<string, number>, profile: AuditProfile): AuditRiskLine[] {
  const full: Record<string, number> = Object.fromEntries(auditQuestions.map((q) => [q.id, 1]));
  return auditScenarios.map((s) => {
    const pRed = weightedReduction(s.pControls, scores) * s.maxPReduction;
    const iRed = weightedReduction(s.impactControls, scores) * s.maxImpactReduction;
    const probability = s.pBase * (1 - pRed);
    const impact = s.impact(profile) * (1 - iRed);
    const pFixed = s.pBase * (1 - weightedReduction(s.pControls, full) * s.maxPReduction);
    const iFixed = s.impact(profile) * (1 - weightedReduction(s.impactControls, full) * s.maxImpactReduction);
    return {
      id: s.id,
      title: s.title,
      layer: s.layer,
      probability,
      impact,
      eal: probability * impact,
      ealIfFixed: pFixed * iFixed,
      assumption: s.assumption,
    };
  });
}

export function maturityFor(score: number): { label: string; description: string } {
  if (score >= 85) return { label: "Controlat", description: "IT-ul e măsurat și demonstrabil. Rămâne de întreținut și de exersat." };
  if (score >= 65) return { label: "Ordonat", description: "Bazele sunt puse. Câteva controale lipsă concentrează majoritatea riscului." };
  if (score >= 40) return { label: "Fragil", description: "Funcționează cât timp nu se întâmplă nimic. Un incident mediu ar fi scump." };
  return { label: "Expus", description: "Riscul e mare și nevăzut. Primele 30 de zile de remediere aduc cea mai mare reducere." };
}

export function scoreAudit(answers: AuditAnswers, profile: AuditProfile): AuditResult {
  const scores = scoreMap(answers);
  const layers = layerOrder.map((layer) => {
    const qs = auditQuestions.filter((q) => q.layer === layer);
    const answered = qs.filter((q) => answers[q.id] !== undefined).length;
    const avg = qs.reduce((s, q) => s + scores[q.id], 0) / qs.length;
    return { layer, name: layerLabels[layer].name, score: Math.round(avg * 100), answered, total: qs.length };
  });
  const overall = Math.round(layers.reduce((s, l) => s + l.score, 0) / layers.length);
  const risks = evaluateScenarios(scores, profile).sort((a, b) => b.eal - a.eal);
  const totalEal = risks.reduce((s, r) => s + r.eal, 0);
  const totalEalIfFixed = risks.reduce((s, r) => s + r.ealIfFixed, 0);

  const actions: AuditAction[] = auditQuestions
    .filter((q) => scores[q.id] < 1)
    .map((q) => {
      const improved = { ...scores, [q.id]: 1 };
      const ealImproved = evaluateScenarios(improved, profile).reduce((s, r) => s + r.eal, 0);
      return { questionId: q.id, layer: q.layer, title: q.action, effort: q.effort, savedPerYear: Math.max(0, totalEal - ealImproved) };
    })
    .sort((a, b) => b.savedPerYear / b.effort - a.savedPerYear / a.effort);

  return {
    overall,
    maturity: maturityFor(overall),
    layers,
    risks,
    totalEal,
    totalEalIfFixed,
    actions,
    answeredCount: Object.keys(answers).filter((k) => auditQuestions.some((q) => q.id === k)).length,
    questionCount: auditQuestions.length,
  };
}
