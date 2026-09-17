import { describe, expect, it } from "vitest";
import { auditQuestions, scoreAudit, type AuditAnswers, type AuditProfile } from "@/lib/audit";

const profile: AuditProfile = { people: 20, annualRevenue: 8_000_000, sector: "servicii", dataSensitivity: 3 };

function answersWith(pick: (q: (typeof auditQuestions)[number]) => string): AuditAnswers {
  return Object.fromEntries(auditQuestions.map((q) => [q.id, pick(q)]));
}

describe("audit IT auto-servit", () => {
  it("are 24 de întrebări pe 7 straturi", () => {
    expect(auditQuestions).toHaveLength(24);
    expect(new Set(auditQuestions.map((q) => q.layer)).size).toBe(7);
    for (const q of auditQuestions) {
      expect(q.options.some((o) => o.score === 1)).toBe(true);
      expect(new Set(q.options.map((o) => o.value)).size).toBe(q.options.length);
    }
  });

  it("răspunsurile cele mai bune dau scor 100 și riscul minim", () => {
    const best = scoreAudit(answersWith((q) => q.options.find((o) => o.score === 1)!.value), profile);
    const worst = scoreAudit(answersWith((q) => q.options[0].value), profile);
    expect(best.overall).toBe(100);
    expect(worst.overall).toBeLessThan(25);
    expect(best.totalEal).toBeLessThan(worst.totalEal);
    expect(best.actions).toHaveLength(0);
    expect(worst.actions.length).toBeGreaterThan(10);
    expect(best.totalEal).toBeCloseTo(best.totalEalIfFixed, 0);
  });

  it("întrebările fără răspuns sunt tratate pesimist", () => {
    const none = scoreAudit({}, profile);
    expect(none.answeredCount).toBe(0);
    expect(none.overall).toBe(0);
    expect(none.maturity.label).toBe("Expus");
  });

  it("riscul crește cu numărul de oameni și venitul", () => {
    const a = scoreAudit({}, profile);
    const b = scoreAudit({}, { ...profile, people: 60, annualRevenue: 30_000_000 });
    expect(b.totalEal).toBeGreaterThan(a.totalEal);
  });

  it("acțiunile sunt ordonate după economie raportată la efort", () => {
    const r = scoreAudit({ mfa: "some", backup: "local" }, profile);
    for (let i = 1; i < r.actions.length; i++) {
      const prev = r.actions[i - 1];
      const cur = r.actions[i];
      expect(prev.savedPerYear / prev.effort).toBeGreaterThanOrEqual(cur.savedPerYear / cur.effort - 1e-6);
    }
  });
});
