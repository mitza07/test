import { describe, expect, it } from "vitest";
import { downtimeCost } from "@/lib/tools/downtime";
import { backupRisk } from "@/lib/tools/backupRisk";
import { estimatePassword } from "@/lib/tools/password";
import { phishingScenarios, phishingScore } from "@/lib/tools/phishing";
import { analyzeSpf, analyzeDmarc, normalizeDomain } from "@/lib/tools/emailCheck";
import { evaluateHeaders, normalizeUrl } from "@/lib/tools/webCheck";

describe("costul nefuncționării", () => {
  it("crește cu orele și cu oamenii", () => {
    const a = downtimeCost({ people: 10, hourlyCostPerPerson: 90, annualRevenue: 5_000_000, itDependency: 0.5, hoursPerIncident: 4, incidentsPerYear: 3 });
    const b = downtimeCost({ ...{ people: 20, hourlyCostPerPerson: 90, annualRevenue: 5_000_000, itDependency: 0.5, hoursPerIncident: 4, incidentsPerYear: 3 } });
    expect(b.perHour.total).toBeGreaterThan(a.perHour.total);
    expect(a.perYear).toBeCloseTo(a.perIncident * 3, 5);
    expect(a.hoursPerYear).toBe(12);
  });
});

describe("riscul de backup", () => {
  it("backup-ul netestat, fără offsite, e critic", () => {
    const r = backupRisk({ frequencyHours: 168, lastRestoreDays: Infinity, offsite: false, immutable: false, retentionDays: 7, people: 15, hourlyCostPerPerson: 90 });
    expect(r.verdict).toBe("critic");
    expect(r.notes.length).toBeGreaterThan(2);
  });
  it("lanțul 3-2-1 imutabil, testat lunar, e solid", () => {
    const r = backupRisk({ frequencyHours: 1, lastRestoreDays: 20, offsite: true, immutable: true, retentionDays: 90, people: 15, hourlyCostPerPerson: 90 });
    expect(r.verdict).toBe("solid");
    expect(r.expectedAnnualLoss).toBeLessThan(5000);
  });
});

describe("parole", () => {
  it("penalizează parolele comune și premiază lungimea", () => {
    expect(estimatePassword("parola123").score).toBeLessThanOrEqual(1);
    expect(estimatePassword("Ghiveci-Lanterna-Nor-Tractor-42").score).toBe(4);
    expect(estimatePassword("").entropyBits).toBe(0);
  });
});

describe("quiz phishing", () => {
  it("are 10 scenarii, cu cel puțin 3 legitime", () => {
    expect(phishingScenarios).toHaveLength(10);
    expect(phishingScenarios.filter((s) => !s.isPhishing).length).toBeGreaterThanOrEqual(3);
  });
  it("punctează corect", () => {
    const perfect = Object.fromEntries(phishingScenarios.map((s) => [s.id, s.isPhishing]));
    expect(phishingScore(perfect).pct).toBe(100);
    expect(phishingScore({}).correct).toBe(0);
  });
});

describe("verificare e-mail: analiză SPF/DMARC", () => {
  it("SPF corect trece, +all pică", () => {
    expect(analyzeSpf(["v=spf1 include:spf.protection.outlook.com -all"]).ok).toBe(true);
    expect(analyzeSpf(["v=spf1 +all"]).ok).toBe(false);
    expect(analyzeSpf([]).ok).toBe(false);
  });
  it("DMARC reject cu rapoarte e ok; none nu", () => {
    expect(analyzeDmarc(["v=DMARC1; p=reject; rua=mailto:dmarc@firma.ro"]).ok).toBe(true);
    const none = analyzeDmarc(["v=DMARC1; p=none"]);
    expect(none.ok).toBe(false);
    expect(none.policy).toBe("none");
  });
  it("normalizează domenii din adrese și URL-uri", () => {
    expect(normalizeDomain("Ana@Firma.RO")).toBe("firma.ro");
    expect(normalizeDomain("https://www.firma.ro/contact")).toBe("www.firma.ro");
    expect(normalizeDomain("nu e domeniu")).toBeNull();
  });
});

describe("igienă web", () => {
  it("evaluează antetele de securitate", () => {
    const good = new Headers({
      "strict-transport-security": "max-age=31536000; includeSubDomains",
      "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=()",
      server: "nginx",
    });
    const checks = evaluateHeaders(good);
    expect(checks.every((c) => c.ok)).toBe(true);
    const bad = evaluateHeaders(new Headers({ server: "Apache/2.4.29", "x-powered-by": "PHP/7.2" }));
    expect(bad.filter((c) => c.ok).length).toBeLessThan(3);
  });
  it("refuză adrese interne", () => {
    expect(normalizeUrl("localhost")).toBeNull();
    expect(normalizeUrl("192.168.1.1")).toBeNull();
    expect(normalizeUrl("firma.ro")?.toString()).toBe("https://firma.ro/");
  });
});
