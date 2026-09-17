export interface HeaderCheck {
  header: string;
  present: boolean;
  value?: string;
  weight: number;
  ok: boolean;
  advice: string;
}

export interface WebCheckResult {
  url: string;
  finalUrl: string;
  https: boolean;
  redirectsToHttps: boolean | null;
  status: number;
  server?: string;
  poweredBy?: string;
  headers: HeaderCheck[];
  cookies: { total: number; insecure: number };
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
}

export function normalizeUrl(input: string): URL | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)) return null;
    // Blocăm adrese locale / interne.
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

export function evaluateHeaders(h: Headers): HeaderCheck[] {
  const get = (n: string) => h.get(n) ?? undefined;
  const checks: HeaderCheck[] = [];
  const hsts = get("strict-transport-security");
  checks.push({ header: "Strict-Transport-Security", present: !!hsts, value: hsts, weight: 20, ok: !!hsts && /max-age=(\d+)/.test(hsts) && Number(/max-age=(\d+)/.exec(hsts)![1]) >= 15552000, advice: "Forțează HTTPS în browser cel puțin 180 de zile (max-age=15552000; includeSubDomains)." });
  const csp = get("content-security-policy");
  checks.push({ header: "Content-Security-Policy", present: !!csp, value: csp?.slice(0, 160), weight: 20, ok: !!csp && !/unsafe-inline/.test(csp) ? true : !!csp && csp.length > 20, advice: "Limitează de unde se pot încărca scripturi; reduce impactul unui XSS." });
  const xcto = get("x-content-type-options");
  checks.push({ header: "X-Content-Type-Options", present: !!xcto, value: xcto, weight: 10, ok: xcto?.toLowerCase() === "nosniff", advice: "nosniff: browserul nu ghicește tipuri de fișiere." });
  const xfo = get("x-frame-options");
  const frameAncestors = !!csp && /frame-ancestors/.test(csp);
  checks.push({ header: "X-Frame-Options / frame-ancestors", present: !!xfo || frameAncestors, value: xfo ?? (frameAncestors ? "via CSP" : undefined), weight: 10, ok: !!xfo || frameAncestors, advice: "Previne clickjacking-ul (site-ul tău încadrat în alt site)." });
  const rp = get("referrer-policy");
  checks.push({ header: "Referrer-Policy", present: !!rp, value: rp, weight: 10, ok: !!rp, advice: "Controlează ce URL-uri trimite browserul către alte site-uri." });
  const pp = get("permissions-policy");
  checks.push({ header: "Permissions-Policy", present: !!pp, value: pp?.slice(0, 120), weight: 10, ok: !!pp, advice: "Dezactivează camera, microfonul, geolocația dacă nu le folosești." });
  const server = get("server");
  const leaks = !!server && /\d+\.\d+/.test(server);
  checks.push({ header: "Server (fără versiune)", present: !!server, value: server, weight: 10, ok: !leaks, advice: "Nu afișa versiunea serverului: le spune atacatorilor exact ce să caute." });
  const xpb = get("x-powered-by");
  checks.push({ header: "X-Powered-By (absent)", present: !!xpb, value: xpb, weight: 10, ok: !xpb, advice: "Elimină antetul X-Powered-By." });
  return checks;
}

export async function checkWebsite(input: string): Promise<WebCheckResult> {
  const url = normalizeUrl(input);
  if (!url) throw new Error("Adresă invalidă. Exemplu: firma.ro sau https://www.firma.ro");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Nucleu-WebHygiene/1.0 (+https://nucleu.ro/instrumente/web)", accept: "text/html,*/*" },
    });
  } catch {
    throw new Error("Nu am putut contacta site-ul (timeout sau conexiune refuzată).");
  } finally {
    clearTimeout(timer);
  }

  let redirectsToHttps: boolean | null = null;
  try {
    const httpUrl = new URL(url.toString());
    httpUrl.protocol = "http:";
    const c2 = new AbortController();
    const t2 = setTimeout(() => c2.abort(), 8_000);
    const r2 = await fetch(httpUrl.toString(), { method: "GET", redirect: "manual", signal: c2.signal, headers: { "user-agent": "Nucleu-WebHygiene/1.0" } });
    clearTimeout(t2);
    const loc = r2.headers.get("location") ?? "";
    redirectsToHttps = r2.status >= 300 && r2.status < 400 && loc.startsWith("https://");
  } catch {
    redirectsToHttps = null;
  }

  const headers = evaluateHeaders(res.headers);
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const insecure = setCookies.filter((c) => !/;\s*secure/i.test(c) || !/;\s*httponly/i.test(c)).length;
  const https = res.url.startsWith("https://");

  let score = 0;
  for (const c of headers) if (c.ok) score += c.weight;
  if (!https) score = Math.round(score * 0.4);
  if (redirectsToHttps === false) score = Math.max(0, score - 15);
  if (setCookies.length && insecure) score = Math.max(0, score - 10);
  score = Math.min(100, score);
  const grade: WebCheckResult["grade"] = score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : score >= 30 ? "D" : "F";
  const summary =
    !https ? "Site-ul nu e servit prin HTTPS. E prima și cea mai importantă remediere." :
    grade === "A" ? "Igienă bună. Verifică din nou după fiecare schimbare majoră de site." :
    grade === "B" ? "Bine, cu câteva antete lipsă. Fiecare e o configurare de câteva minute." :
    grade === "C" ? "Bazele există, dar site-ul e mai expus decât trebuie la atacuri din browser." :
    "Site-ul nu trimite protecțiile standard. Remedierea completă durează sub o zi.";

  return {
    url: url.toString(),
    finalUrl: res.url,
    https,
    redirectsToHttps,
    status: res.status,
    server: res.headers.get("server") ?? undefined,
    poweredBy: res.headers.get("x-powered-by") ?? undefined,
    headers,
    cookies: { total: setCookies.length, insecure },
    score,
    grade,
    summary,
  };
}
