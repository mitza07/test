import type { MetadataRoute } from "next";
import { site } from "@/lib/content/site";
import { capabilities } from "@/lib/content/services";
import { caseStudies } from "@/lib/content/cases";
import { segments } from "@/lib/content/segments";

const tools = ["audit-it", "simulator", "email", "web", "cost-downtime", "risc-backup", "phishing", "calculator", "viteza", "parole"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  const now = new Date();
  const statics = ["", "/manifest", "/servicii", "/platforma", "/securitate", "/infrastructura", "/studii-de-caz", "/instrumente", "/preturi", "/garantie", "/status", "/contact", "/legal/clauza-de-divort", "/legal/termeni", "/legal/confidentialitate", "/legal/cookies"];
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.7 })),
    ...capabilities.map((c) => ({ url: `${base}/servicii/${c.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...caseStudies.map((c) => ({ url: `${base}/studii-de-caz/${c.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...segments.map((s) => ({ url: `${base}/pentru/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...tools.map((t) => ({ url: `${base}/instrumente/${t}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
