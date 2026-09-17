import { promises as dns } from "node:dns";

export interface EmailCheckResult {
  domain: string;
  mx: { ok: boolean; records: string[] };
  spf: { ok: boolean; record?: string; issues: string[] };
  dkim: { ok: boolean; selectors: string[]; note: string };
  dmarc: { ok: boolean; record?: string; policy?: string; issues: string[] };
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  recommendations: string[];
}

const dkimSelectors = ["selector1", "selector2", "google", "default", "dkim", "k1", "mail", "s1", "s2", "mailjet", "mandrill", "smtp", "zoho", "protonmail"];

async function txt(name: string): Promise<string[]> {
  try {
    const rows = await dns.resolveTxt(name);
    return rows.map((r) => r.join(""));
  } catch {
    return [];
  }
}

export function normalizeDomain(input: string): string | null {
  const raw = input.trim().toLowerCase().replace(/^mailto:/, "").replace(/^https?:\/\//, "").split("/")[0];
  const domain = raw.includes("@") ? raw.split("@").pop()! : raw;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) || domain.length > 253) return null;
  return domain;
}

export function analyzeSpf(records: string[]): EmailCheckResult["spf"] {
  const spf = records.find((r) => r.toLowerCase().startsWith("v=spf1"));
  const issues: string[] = [];
  if (!spf) return { ok: false, issues: ["Nu există înregistrare SPF: oricine poate trimite e-mail „din partea” domeniului."] };
  const count = records.filter((r) => r.toLowerCase().startsWith("v=spf1")).length;
  if (count > 1) issues.push("Există mai multe înregistrări SPF; e permisă una singură (altfel SPF e ignorat).");
  if (/\+all/.test(spf)) issues.push("Se termină cu +all: permite orice expeditor. Echivalent cu lipsa SPF.");
  else if (/\?all/.test(spf)) issues.push("Se termină cu ?all (neutru): nu protejează. Folosește -all sau ~all.");
  else if (!/[-~]all/.test(spf)) issues.push("Lipsește mecanismul final (-all sau ~all).");
  const lookups = (spf.match(/\b(include|a|mx|ptr|exists|redirect)[:=]?/g) ?? []).length;
  if (lookups > 10) issues.push(`Prea multe mecanisme cu interogare DNS (${lookups} > 10): SPF va fi ignorat de mulți destinatari.`);
  return { ok: issues.length === 0, record: spf, issues };
}

export function analyzeDmarc(records: string[]): EmailCheckResult["dmarc"] {
  const rec = records.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
  const issues: string[] = [];
  if (!rec) return { ok: false, issues: ["Nu există DMARC: destinatarii nu știu ce să facă cu e-mailurile false și nu raportează nimic."] };
  const policy = /p=([a-z]+)/i.exec(rec)?.[1]?.toLowerCase();
  if (policy === "none") issues.push("Politica e „none”: e-mailurile false sunt doar monitorizate, nu respinse. Treci la quarantine, apoi reject.");
  else if (policy === "quarantine") issues.push("Politica e „quarantine”: falsurile ajung în spam. Următorul pas: „reject”.");
  if (!/rua=/i.test(rec)) issues.push("Lipsesc rapoartele (rua=): nu vei afla cine încearcă să trimită în numele tău.");
  const pct = /pct=(\d+)/i.exec(rec)?.[1];
  if (pct && Number(pct) < 100) issues.push(`Politica se aplică doar la ${pct}% din mesaje.`);
  return { ok: policy === "reject" && issues.length === 0, record: rec, policy, issues };
}

export async function checkEmailDomain(input: string): Promise<EmailCheckResult> {
  const domain = normalizeDomain(input);
  if (!domain) throw new Error("Domeniu invalid. Exemplu: firma.ro sau nume@firma.ro");

  const [mxRecords, spfTxt, dmarcTxt] = await Promise.all([
    dns.resolveMx(domain).then((r) => r.sort((a, b) => a.priority - b.priority).map((x) => x.exchange)).catch(() => [] as string[]),
    txt(domain),
    txt(`_dmarc.${domain}`),
  ]);

  const found: string[] = [];
  await Promise.all(
    dkimSelectors.map(async (s) => {
      const rows = await txt(`${s}._domainkey.${domain}`);
      if (rows.some((r) => /v=dkim1|k=rsa|p=/i.test(r))) found.push(s);
    }),
  );

  const mx = { ok: mxRecords.length > 0, records: mxRecords };
  const spf = analyzeSpf(spfTxt);
  const dmarc = analyzeDmarc(dmarcTxt);
  const dkim = {
    ok: found.length > 0,
    selectors: found,
    note: found.length ? `Selectori găsiți: ${found.join(", ")}.` : "Nu am găsit DKIM la selectorii uzuali. Poate exista cu un selector personalizat; verifică în consola furnizorului de e-mail.",
  };

  let score = 0;
  if (mx.ok) score += 10;
  if (spf.record) score += spf.ok ? 30 : 15;
  if (dkim.ok) score += 25;
  if (dmarc.record) score += dmarc.policy === "reject" ? 35 : dmarc.policy === "quarantine" ? 25 : 10;
  const grade: EmailCheckResult["grade"] = score >= 90 ? "A" : score >= 75 ? "B" : score >= 55 ? "C" : score >= 35 ? "D" : "F";

  const recommendations: string[] = [];
  if (!spf.record) recommendations.push("Publică o înregistrare SPF cu expeditorii legitimi și -all la final.");
  else recommendations.push(...spf.issues);
  if (!dkim.ok) recommendations.push("Activează semnarea DKIM la furnizorul de e-mail (Microsoft 365, Google Workspace, etc.).");
  if (!dmarc.record) recommendations.push("Publică _dmarc cu p=none și rua= pentru rapoarte; după 30 de zile curate, treci la quarantine, apoi reject.");
  else recommendations.push(...dmarc.issues);
  if (!mx.ok) recommendations.push("Domeniul nu are MX: nu poate primi e-mail. Dacă e intenționat, publică SPF „v=spf1 -all” și DMARC reject ca să nu poată fi folosit pentru falsuri.");

  const summary =
    grade === "A" ? "Domeniul e protejat corect împotriva falsificării. Menține DMARC pe reject și urmărește rapoartele." :
    grade === "B" ? "Aproape acolo: un singur pas te desparte de protecția completă." :
    grade === "C" ? "Bazele există, dar falsurile încă pot ajunge la destinatari." :
    "Domeniul poate fi folosit ușor pentru fraudă în numele tău. Remedierea durează o zi.";

  return { domain, mx, spf, dkim, dmarc, score, grade, summary, recommendations };
}
