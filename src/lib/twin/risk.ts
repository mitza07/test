import type { Layer, Twin } from "./types";
import { simulateFailure, type FailureMode } from "./simulate";

export interface RiskEntry {
  id: string;
  title: string;
  layer: Layer;
  /** Scenariul din geamăn care dă impactul. */
  nodeId: string;
  mode: FailureMode;
  /** Probabilitate anuală înainte de Nucleu (la onboarding). */
  pBefore: number;
  /** Probabilitate anuală acum, cu controalele active. */
  pNow: number;
  /** Factor de impact acum față de înainte (ex.: restore testat reduce durata). */
  impactFactorBefore: number;
  /** Impact fix (lei), când scenariul nu e o cădere simulabilă (ex.: o plată deturnată). */
  fixedImpact?: number;
  controls: string[];
}

export interface RiskLine extends RiskEntry {
  impactNow: number;
  impactBefore: number;
  ealBefore: number;
  ealNow: number;
}

export interface RiskReport {
  lines: RiskLine[];
  totalBefore: number;
  totalNow: number;
  reductionPct: number;
}

export const demoRiskRegister: RiskEntry[] = [
  { id: "r-ransom", title: "Ransomware pe infrastructura on-prem", layer: "backup", nodeId: "srv-01", mode: "loss", pBefore: 0.18, pNow: 0.04, impactFactorBefore: 4.5, controls: ["EDR pe toate stațiile", "backup imutabil 3-2-1", "restore demonstrat lunar", "segmentare rețea"] },
  { id: "r-server", title: "Defectare hardware server principal", layer: "monitoring", nodeId: "srv-01", mode: "outage", pBefore: 0.12, pNow: 0.08, impactFactorBefore: 3, controls: ["monitorizare SMART/temperatură", "garanție NBD", "imagine de restaurare"] },
  { id: "r-account", title: "Cont compromis prin phishing", layer: "identity", nodeId: "id-users", mode: "loss", pBefore: 0.45, pNow: 0.09, impactFactorBefore: 2, controls: ["MFA 28/30 conturi", "acces condiționat", "simulări phishing trimestriale"] },
  { id: "r-isp-dep", title: "Pană internet la depozit", layer: "network", nodeId: "net-wan-dep", mode: "outage", pBefore: 0.9, pNow: 0.9, impactFactorBefore: 1, controls: ["(deschis) propunere failover 5G"] },
  { id: "r-isp-hq", title: "Pană regională la furnizorul de internet", layer: "network", nodeId: "vendor-isp", mode: "outage", pBefore: 0.5, pNow: 0.5, impactFactorBefore: 1.6, controls: ["failover 5G activ la sediu (depozitul rămâne expus)"] },
  { id: "r-switch", title: "Defectare switch depozit", layer: "devices", nodeId: "sw-dep", mode: "outage", pBefore: 0.15, pNow: 0.15, impactFactorBefore: 1.5, controls: ["(deschis) firmware învechit, propunere înlocuire"] },
  { id: "r-erp-db", title: "Corupere bază de date ERP", layer: "backup", nodeId: "db-erp", mode: "loss", pBefore: 0.08, pNow: 0.05, impactFactorBefore: 6, controls: ["backup la oră", "restore testat", "verificare integritate zilnică"] },
  { id: "r-m365", title: "Indisponibilitate Microsoft 365", layer: "email", nodeId: "svc-m365", mode: "outage", pBefore: 0.6, pNow: 0.6, impactFactorBefore: 1, controls: ["backup SaaS", "canal alternativ de comunicare"] },
  { id: "r-email-fraud", title: "Fraudă prin e-mail (plată deturnată)", layer: "email", nodeId: "svc-email", mode: "outage", pBefore: 0.35, pNow: 0.04, impactFactorBefore: 1, fixedImpact: 60_000, controls: ["SPF/DKIM", "DMARC quarantine (recomandat reject)", "procedură dublă verificare plăți", "simulări phishing"] },
];

export function computeRisk(twin: Twin, register: RiskEntry[] = demoRiskRegister): RiskReport {
  const lines: RiskLine[] = register.map((r) => {
    const impactNow = r.fixedImpact ?? simulateFailure(twin, r.nodeId, r.mode).loss.total;
    const impactBefore = impactNow * r.impactFactorBefore;
    return {
      ...r,
      impactNow,
      impactBefore,
      ealBefore: impactBefore * r.pBefore,
      ealNow: impactNow * r.pNow,
    };
  });
  const totalBefore = lines.reduce((s, l) => s + l.ealBefore, 0);
  const totalNow = lines.reduce((s, l) => s + l.ealNow, 0);
  return {
    lines: lines.sort((a, b) => b.ealNow - a.ealNow),
    totalBefore,
    totalNow,
    reductionPct: totalBefore > 0 ? (1 - totalNow / totalBefore) * 100 : 0,
  };
}

/* ---------------- Postura de securitate (7 straturi) ---------------- */

export type ControlStatus = "done" | "partial" | "missing";

export interface Control {
  id: string;
  layer: Layer;
  title: string;
  weight: number; // 1..3
  status: ControlStatus;
  evidence?: string;
  /** Ce se întâmplă dacă lipsește (pe limba managementului). */
  why: string;
}

export const layerLabels: Record<Layer, { name: string; short: string; description: string }> = {
  identity: { name: "Identitate", short: "ID", description: "Cine are acces la ce: MFA, roluri, conturi privilegiate separate, plecări curate." },
  devices: { name: "Dispozitive", short: "DEV", description: "Stații criptate, actualizate, cu protecție activă și inventar la zi." },
  network: { name: "Rețea", short: "NET", description: "Segmentare, reguli de firewall documentate, VPN, Wi-Fi separat pentru oaspeți." },
  email: { name: "E-mail", short: "MAIL", description: "SPF, DKIM, DMARC, filtrare și proceduri împotriva fraudei." },
  backup: { name: "Backup", short: "BK", description: "Lanț 3-2-1 imutabil, cu restaurări demonstrate, nu doar programate." },
  monitoring: { name: "Monitorizare", short: "MON", description: "Semnal, nu zgomot: alerte calibrate pe servere, servicii, certificate, backup." },
  response: { name: "Răspuns", short: "IR", description: "Proceduri, responsabili și timpi măsurați pentru când ceva chiar se întâmplă." },
};

export const layerOrder: Layer[] = ["identity", "devices", "network", "email", "backup", "monitoring", "response"];

export const demoControls: Control[] = [
  { id: "c-mfa", layer: "identity", title: "MFA pe toate conturile", weight: 3, status: "partial", evidence: "28/30 conturi · 2 rămase (recepție, cont partajat)", why: "Un cont fără MFA e o ușă cu o singură cheie, iar cheia e o parolă." },
  { id: "c-priv", layer: "identity", title: "Conturi privilegiate separate și revizuite", weight: 2, status: "done", evidence: "3 conturi admin · revizuite 02.09", why: "Administratorii nu citesc e-mail cu contul de admin." },
  { id: "c-offboard", layer: "identity", title: "Offboarding automat (0 conturi orfane)", weight: 2, status: "done", evidence: "verificat zilnic · 0 orfane", why: "Foștii angajați nu mai au acces la nimic, în prima oră." },
  { id: "c-enc", layer: "devices", title: "Criptare disc pe toate stațiile", weight: 3, status: "done", evidence: "22/22 · chei escrow", why: "Un laptop pierdut e un laptop, nu o breșă de date." },
  { id: "c-patch", layer: "devices", title: "Patch-uri aplicate în 14 zile", weight: 2, status: "partial", evidence: "21/22 · 1 stație offline de 19 zile", why: "Majoritatea atacurilor folosesc vulnerabilități deja reparate." },
  { id: "c-edr", layer: "devices", title: "Protecție endpoint (EDR) activă", weight: 3, status: "done", evidence: "22/22 · ultima detecție blocată: 11.09", why: "Ransomware-ul e oprit înainte să cripteze, nu descoperit după." },
  { id: "c-inv", layer: "devices", title: "Inventar complet, cu garanții", weight: 1, status: "done", evidence: "37 echipamente · 2 garanții expiră în 90 zile", why: "Nu poți proteja ce nu știi că ai." },
  { id: "c-seg", layer: "network", title: "Segmentare (birou / depozit / oaspeți / echipamente)", weight: 3, status: "done", evidence: "4 VLAN-uri · reguli documentate", why: "Un scanner compromis nu ajunge la contabilitate." },
  { id: "c-fw", layer: "network", title: "Reguli de firewall justificate", weight: 2, status: "done", evidence: "60 reguli · fiecare cu motiv și proprietar", why: "Regulile „temporare” din 2021 sunt uși permanente." },
  { id: "c-failover", layer: "network", title: "Legătură de rezervă la fiecare locație", weight: 2, status: "partial", evidence: "sediu: da · depozit: propunere deschisă", why: "Fără internet, depozitul nu poate încărca nicio comandă." },
  { id: "c-spf", layer: "email", title: "SPF + DKIM configurate", weight: 2, status: "done", evidence: "verificat zilnic", why: "Nimeni nu poate trimite e-mail „din partea” firmei fără să fie marcat." },
  { id: "c-dmarc", layer: "email", title: "DMARC în mod „reject”", weight: 2, status: "partial", evidence: "p=quarantine · rapoarte curate 45 zile · trecere la reject propusă", why: "Falsurile perfecte sunt respinse, nu doar puse în spam." },
  { id: "c-pay", layer: "email", title: "Procedură de dublă verificare la schimbarea conturilor bancare", weight: 3, status: "done", evidence: "procedură semnată · testată 08.2026", why: "Frauda cu factura falsă e cel mai scump atac pentru o firmă mică." },
  { id: "c-321", layer: "backup", title: "Backup 3-2-1, copie offsite imutabilă", weight: 3, status: "done", evidence: "NAS local + offsite UE · imutabil 90 zile", why: "Ransomware-ul nu poate cripta ce nu poate modifica." },
  { id: "c-restore", layer: "backup", title: "Restaurare demonstrată lunar", weight: 3, status: "done", evidence: "16.09 · 7 min 12 s · ERP complet", why: "Un backup nerestaurat e o speranță, nu o procedură." },
  { id: "c-saas", layer: "backup", title: "Backup pentru Microsoft 365", weight: 2, status: "done", evidence: "zilnic · 640 GB", why: "Microsoft nu îți restaurează un e-mail șters acum 6 luni." },
  { id: "c-mon", layer: "monitoring", title: "Monitorizare servere, servicii și certificate", weight: 3, status: "done", evidence: "37 senzori · 0 alerte critice", why: "Afli că discul se umple înainte să se umple." },
  { id: "c-alert", layer: "monitoring", title: "Alerte calibrate (zgomot sub 5%)", weight: 2, status: "done", evidence: "luna aceasta: 14 alerte · 13 relevante", why: "Alertele ignorate sunt mai rele decât lipsa lor." },
  { id: "c-ir", layer: "response", title: "Plan de răspuns la incident, cu responsabili", weight: 3, status: "done", evidence: "v3 · exercițiu pe hârtie 07.2026", why: "La 3 dimineața nu e momentul să inventezi cine sună pe cine." },
  { id: "c-drill", layer: "response", title: "Exercițiu de incident cu managementul (trimestrial)", weight: 2, status: "partial", evidence: "următorul: 14.10", why: "Un plan neexersat e un document, nu o capacitate." },
];

export function layerScore(controls: Control[], layer: Layer): number {
  const items = controls.filter((c) => c.layer === layer);
  const max = items.reduce((s, c) => s + c.weight, 0);
  if (max === 0) return 0;
  const got = items.reduce((s, c) => s + c.weight * (c.status === "done" ? 1 : c.status === "partial" ? 0.5 : 0), 0);
  return Math.round((got / max) * 100);
}

export function postureScore(controls: Control[]): number {
  const layers = layerOrder.map((l) => layerScore(controls, l));
  return Math.round(layers.reduce((s, v) => s + v, 0) / layers.length);
}

export function posture(controls: Control[] = demoControls) {
  return {
    score: postureScore(controls),
    layers: layerOrder.map((l) => ({
      layer: l,
      ...layerLabels[l],
      score: layerScore(controls, l),
      controls: controls.filter((c) => c.layer === l),
    })),
  };
}
