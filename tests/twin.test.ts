import { describe, expect, it } from "vitest";
import { demoTwin, propagate, simulateFailure, demoScenarios, computeRisk, posture, layerScore, demoControls } from "@/lib/twin";

describe("geamănul digital: propagare", () => {
  it("căderea fibrei de la depozit oprește tot depozitul, dar nu sediul", () => {
    const { affected } = propagate(demoTwin, "net-wan-dep");
    const ids = affected.map((n) => n.id);
    expect(ids).toContain("fw-dep");
    expect(ids).toContain("scan-dep");
    expect(ids).toContain("ppl-dep");
    expect(ids).not.toContain("srv-01");
    expect(ids).not.toContain("ppl-fin");
  });

  it("propagarea se oprește la nodurile redundante", () => {
    const { affected, stoppedBy } = propagate(demoTwin, "vendor-isp");
    expect(stoppedBy.map((n) => n.id)).toContain("net-wan-hq");
    expect(affected.map((n) => n.id)).not.toContain("fw-hq");
    expect(affected.map((n) => n.id)).toContain("net-wan-dep");
  });

  it("serverul principal afectează ERP-ul, fișierele și oamenii care le folosesc", () => {
    const { affected } = propagate(demoTwin, "srv-01");
    const ids = affected.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(["vm-erp", "vm-files", "vm-ad", "ppl-vanzari", "ppl-fin", "ppl-dep", "svc-efactura"]));
  });

  it("aruncă eroare pentru noduri necunoscute", () => {
    expect(() => propagate(demoTwin, "nu-exista")).toThrow();
  });
});

describe("simulare: pierderi în lei", () => {
  it("ransomware pe server e mai scump decât o pană de internet la depozit", () => {
    const ransom = simulateFailure(demoTwin, "srv-01", "loss");
    const isp = simulateFailure(demoTwin, "net-wan-dep", "outage");
    expect(ransom.loss.total).toBeGreaterThan(isp.loss.total);
    expect(ransom.loss.data).toBeGreaterThan(0);
    expect(isp.loss.data).toBe(0);
  });

  it("un nod redundant căzut nu afectează pe nimeni", () => {
    const r = simulateFailure(demoTwin, "net-wan-hq", "outage");
    expect(r.affectedPeople).toBe(0);
    expect(r.loss.total).toBeLessThan(1000);
  });

  it("oamenii afectați nu depășesc totalul firmei", () => {
    for (const s of demoScenarios) {
      const r = simulateFailure(demoTwin, s.nodeId, s.mode);
      expect(r.affectedPeople).toBeLessThanOrEqual(demoTwin.business.people);
      expect(r.loss.total).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(r.loss.total)).toBe(true);
    }
  });

  it("măsurile propuse reduc pierderea și sunt ordonate după economie", () => {
    const r = simulateFailure(demoTwin, "net-wan-dep", "outage");
    expect(r.mitigations.length).toBeGreaterThan(0);
    for (const m of r.mitigations) expect(m.lossAfter).toBeLessThanOrEqual(r.loss.total);
    for (let i = 1; i < r.mitigations.length; i++) expect(r.mitigations[i - 1].saved).toBeGreaterThanOrEqual(r.mitigations[i].saved);
  });

  it("suprascrierea duratei schimbă pierderea proporțional", () => {
    const a = simulateFailure(demoTwin, "sw-dep", "outage", { outageHours: 2 });
    const b = simulateFailure(demoTwin, "sw-dep", "outage", { outageHours: 4 });
    expect(b.loss.productivity).toBeCloseTo(a.loss.productivity * 2, 5);
  });
});

describe("registrul de risc și postura", () => {
  it("riscul rezidual e mai mic decât cel inițial", () => {
    const r = computeRisk(demoTwin);
    expect(r.totalNow).toBeLessThan(r.totalBefore);
    expect(r.reductionPct).toBeGreaterThan(50);
    expect(r.lines[0].ealNow).toBeGreaterThanOrEqual(r.lines[r.lines.length - 1].ealNow);
  });

  it("postura are 7 straturi cu scoruri între 0 și 100", () => {
    const p = posture();
    expect(p.layers).toHaveLength(7);
    for (const l of p.layers) {
      expect(l.score).toBeGreaterThanOrEqual(0);
      expect(l.score).toBeLessThanOrEqual(100);
    }
    expect(p.score).toBeGreaterThan(70);
  });

  it("un control lipsă scade scorul stratului", () => {
    const base = layerScore(demoControls, "backup");
    const worse = demoControls.map((c) => (c.id === "c-restore" ? { ...c, status: "missing" as const } : c));
    expect(layerScore(worse, "backup")).toBeLessThan(base);
  });
});
