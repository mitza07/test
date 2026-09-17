import { describe, expect, it } from "vitest";
import { quote, slaCredit, tiers, automationDividendYears } from "@/lib/pricing";

describe("prețuri per om protejat", () => {
  it("aplică minimul lunar pentru firmele foarte mici", () => {
    const q = quote({ people: 3, tier: "baza" });
    expect(q.minimumApplied).toBe(true);
    expect(q.monthly).toBe(tiers[0].minimumMonthly);
  });

  it("scalează liniar peste minim și adaugă extra-opțiunile", () => {
    const q = quote({ people: 20, tier: "continuu", servers: 1, extraSites: 1 });
    expect(q.minimumApplied).toBe(false);
    expect(q.monthly).toBe(20 * 109 + 120 + 90);
    expect(q.perPerson).toBe(Math.round(q.monthly / 20));
  });

  it("dividendul de automatizare scade prețul în fiecare an", () => {
    const q = quote({ people: 15, tier: "continuu" });
    expect(q.fiveYear).toHaveLength(automationDividendYears);
    for (let i = 1; i < q.fiveYear.length; i++) expect(q.fiveYear[i]).toBeLessThan(q.fiveYear[i - 1]);
    expect(q.fiveYearSavedByDividend).toBeGreaterThan(0);
  });

  it("creditul SLA se calculează automat și e plafonat", () => {
    const c = slaCredit("continuu", { monthlyInvoice: 2000, responseBreaches: 1, rtoBreaches: 0, rpoBreaches: 0, missedRestoreDrill: false });
    expect(c.totalPct).toBe(25);
    expect(c.credit).toBe(500);
    const capped = slaCredit("continuu", { monthlyInvoice: 2000, responseBreaches: 3, rtoBreaches: 1, rpoBreaches: 0, missedRestoreDrill: true });
    expect(capped.capped).toBe(true);
    expect(capped.totalPct).toBe(50);
    const none = slaCredit("baza", { monthlyInvoice: 500, responseBreaches: 0, rtoBreaches: 0, rpoBreaches: 0, missedRestoreDrill: true });
    expect(none.credit).toBe(0);
  });
});
