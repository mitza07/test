import { describe, expect, it } from "vitest";
import { buildKnowledge, search, localAnswer, tokenize } from "@/lib/assistant/knowledge";

const docs = buildKnowledge();

describe("asistentul Vega · bază de cunoștințe locală", () => {
  it("construiește documente din conținutul site-ului", () => {
    expect(docs.length).toBeGreaterThan(30);
    expect(docs.every((d) => d.url.startsWith("/") && d.text.length > 40)).toBe(true);
  });

  it("tokenizarea ignoră diacriticele și cuvintele de legătură", () => {
    expect(tokenize("Cât costă un abonament și există contract minim?")).toEqual(expect.arrayContaining(["costa", "abonament", "contract", "minim"]));
    expect(tokenize("și sau de la")).toHaveLength(0);
  });

  it("găsește pagina de prețuri pentru întrebări despre cost", () => {
    const hits = search("cat costa pentru 12 oameni", docs);
    expect(hits[0].doc.id).toBe("preturi");
  });

  it("găsește clauza de divorț și garanția", () => {
    expect(search("pot sa plec din contract oricand?", docs).some((h) => h.doc.id === "divort")).toBe(true);
    expect(search("ce credite primesc daca incalcati SLA", docs)[0].doc.id).toBe("garantie");
  });

  it("răspunsul local citează surse și nu inventează", () => {
    const a = localAnswer("cum demonstrati backup-ul?", docs);
    expect(a.sources.length).toBeGreaterThan(0);
    expect(a.text).toMatch(/restaur/i);
    const none = localAnswer("xyzzy plugh", docs);
    expect(none.sources[0].url).toBe("/contact");
  });
});
