/**
 * Prețuri Nucleu: per om protejat, totul inclus, garanții cu credite automate.
 * Nu există „pachete” cu funcții scoase: diferă doar garanția și cât de aproape stăm.
 */

export type TierId = "baza" | "continuu" | "suveran";

export interface Tier {
  id: TierId;
  name: string;
  audience: string;
  pricePerPerson: number;
  minimumMonthly: number;
  coverage: string;
  responseMinutes: number;
  rtoHours: number;
  rpoHours: number;
  /** Credit automat (% din factura lunară) pentru fiecare garanție încălcată. */
  creditPct: number;
  /** Plafon lunar al creditelor. */
  creditCapPct: number;
  restoreDrill: string;
  humanReview: string;
  highlights: string[];
  recommended?: boolean;
}

export const tiers: Tier[] = [
  {
    id: "baza",
    name: "Nucleu Bază",
    audience: "Firme de 3–15 oameni care vor ordine, dovezi și un preț fix.",
    pricePerPerson: 69,
    minimumMonthly: 390,
    coverage: "Luni–Vineri 08–18",
    responseMinutes: 240,
    rtoHours: 24,
    rpoHours: 24,
    creditPct: 10,
    creditCapPct: 30,
    restoreDrill: "trimestrial",
    humanReview: "revizuire trimestrială, 30 min",
    highlights: ["Toată platforma, fără funcții scoase", "Backup 3-2-1 cu restaurare demonstrată trimestrial", "Raport lunar în lei", "Credit automat 10% la garanție încălcată"],
  },
  {
    id: "continuu",
    name: "Nucleu Continuu",
    audience: "Firme de 10–60 de oameni care nu-și permit o zi fără sisteme.",
    pricePerPerson: 109,
    minimumMonthly: 790,
    coverage: "24/7",
    responseMinutes: 60,
    rtoHours: 4,
    rpoHours: 1,
    creditPct: 25,
    creditCapPct: 50,
    restoreDrill: "lunar",
    humanReview: "revizuire lunară cu managementul, 45 min",
    highlights: ["Răspuns în 60 de minute, 24/7", "Revenire în 4 ore, date pierdute sub 1 oră — garantat", "Restaurare demonstrată lunar", "Exercițiu de incident trimestrial", "Credit automat 25% la garanție încălcată"],
    recommended: true,
  },
  {
    id: "suveran",
    name: "Nucleu Suveran",
    audience: "Clinici, firme reglementate, producție continuă: control total, chei proprii.",
    pricePerPerson: 169,
    minimumMonthly: 2490,
    coverage: "24/7 + arhitect dedicat",
    responseMinutes: 15,
    rtoHours: 1,
    rpoHours: 0.25,
    creditPct: 50,
    creditCapPct: 100,
    restoreDrill: "lunar + exercițiu complet semestrial",
    humanReview: "arhitect dedicat, revizuire lunară",
    highlights: ["Răspuns în 15 minute", "Revenire în 1 oră, date pierdute sub 15 minute", "Cheile de criptare sunt ale tale (BYOK), a doua regiune UE", "Prezență fizică programată", "Credit automat 50%, până la factura întreagă"],
  },
];

export interface AddOn {
  id: string;
  name: string;
  unit: string;
  price: number;
  description: string;
}

export const addOns: AddOn[] = [
  { id: "server", name: "Server / hypervisor on-prem", unit: "per server / lună", price: 120, description: "Monitorizare hardware, patch-uri, imagine de restaurare, capacitate." },
  { id: "site", name: "Locație suplimentară", unit: "per locație / lună", price: 90, description: "Rețea, firewall, Wi-Fi și legătură de rezervă administrate." },
  { id: "efactura", name: "Monitorizare e-Factura / SPV", unit: "per firmă / lună", price: 35, description: "Transmiteri urmărite, erori rezolvate, certificat reînnoit la timp." },
  { id: "app", name: "Operare aplicație internă (Laravel/Node)", unit: "de la / lună", price: 490, description: "Deploy, backup, monitorizare, actualizări de securitate pentru aplicația ta." },
];

export const onDemandHourly = 190;
export const onboardingFee = 0;
/** Dividendul de automatizare: prețul per persoană scade anual, 5 ani la rând. */
export const automationDividendPerYear = 0.03;
export const automationDividendYears = 5;

export interface QuoteInput {
  people: number;
  tier: TierId;
  servers?: number;
  extraSites?: number;
  efacturaFirms?: number;
  apps?: number;
}

export interface QuoteLine {
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  tier: Tier;
  lines: QuoteLine[];
  base: number;
  minimumApplied: boolean;
  monthly: number;
  yearly: number;
  perPerson: number;
  /** Proiecție pe 5 ani, cu dividendul de automatizare aplicat anual. */
  fiveYear: number[];
  fiveYearTotal: number;
  fiveYearSavedByDividend: number;
  /** Estimare orientativă pentru un furnizor clasic (per calculator + ore). */
  classicEstimate: { low: number; high: number };
}

export function quote(input: QuoteInput): Quote {
  const tier = tiers.find((t) => t.id === input.tier) ?? tiers[1];
  const people = Math.max(1, Math.round(input.people));
  const lines: QuoteLine[] = [];
  const base = people * tier.pricePerPerson;
  lines.push({ label: `${tier.name} · ${people} oameni protejați`, quantity: people, unitPrice: tier.pricePerPerson, total: base });
  const minimumApplied = base < tier.minimumMonthly;
  let monthly = Math.max(base, tier.minimumMonthly);
  if (minimumApplied) lines.push({ label: "Minim lunar", quantity: 1, unitPrice: tier.minimumMonthly - base, total: tier.minimumMonthly - base });

  const add = (id: string, qty?: number) => {
    if (!qty) return;
    const a = addOns.find((x) => x.id === id)!;
    const total = a.price * qty;
    lines.push({ label: a.name, quantity: qty, unitPrice: a.price, total });
    monthly += total;
  };
  add("server", input.servers);
  add("site", input.extraSites);
  add("efactura", input.efacturaFirms);
  add("app", input.apps);

  const fiveYear: number[] = [];
  let m = monthly;
  for (let y = 0; y < automationDividendYears; y++) {
    fiveYear.push(Math.round(m * 12));
    m = m * (1 - automationDividendPerYear);
  }
  const fiveYearTotal = fiveYear.reduce((s, v) => s + v, 0);
  const fiveYearSavedByDividend = monthly * 12 * automationDividendYears - fiveYearTotal;

  // Furnizor clasic: ~80–120 lei / calculator / lună + intervenții la oră (ipoteză orientativă).
  const classicEstimate = {
    low: Math.round(people * 80 + (input.servers ?? 0) * 150),
    high: Math.round(people * 120 + (input.servers ?? 0) * 250 + people * 0.5 * 175),
  };

  return {
    tier,
    lines,
    base,
    minimumApplied,
    monthly: Math.round(monthly),
    yearly: Math.round(monthly * 12),
    perPerson: Math.round(monthly / people),
    fiveYear,
    fiveYearTotal,
    fiveYearSavedByDividend: Math.round(fiveYearSavedByDividend),
    classicEstimate,
  };
}

export interface SlaMonth {
  monthlyInvoice: number;
  /** Incidente în care răspunsul a depășit timpul garantat. */
  responseBreaches: number;
  /** Incidente în care revenirea a depășit RTO. */
  rtoBreaches: number;
  /** Incidente cu date pierdute peste RPO. */
  rpoBreaches: number;
  /** Restaurarea demonstrată a lipsit luna aceasta (pentru planurile cu drill lunar). */
  missedRestoreDrill: boolean;
}

export interface SlaCredit {
  breaches: Array<{ kind: string; count: number; pct: number }>;
  totalPct: number;
  capped: boolean;
  credit: number;
}

/** Creditul se calculează automat și se scade din factura următoare. Nu trebuie cerut. */
export function slaCredit(tierId: TierId, month: SlaMonth): SlaCredit {
  const tier = tiers.find((t) => t.id === tierId) ?? tiers[1];
  const breaches: SlaCredit["breaches"] = [];
  const push = (kind: string, count: number) => {
    if (count > 0) breaches.push({ kind, count, pct: count * tier.creditPct });
  };
  push("răspuns întârziat", month.responseBreaches);
  push("revenire peste RTO", month.rtoBreaches);
  push("date pierdute peste RPO", month.rpoBreaches);
  if (month.missedRestoreDrill && tier.restoreDrill.startsWith("lunar")) push("restaurare nedemonstrată", 1);
  const raw = breaches.reduce((s, b) => s + b.pct, 0);
  const capped = raw > tier.creditCapPct;
  const totalPct = Math.min(raw, tier.creditCapPct);
  return { breaches, totalPct, capped, credit: Math.round((month.monthlyInvoice * totalPct) / 100) };
}
