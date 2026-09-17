import { capabilities } from "@/lib/content/services";
import { principles } from "@/lib/content/principles";
import { pricingFaq, generalFaq } from "@/lib/content/faq";
import { caseStudies } from "@/lib/content/cases";
import { segments } from "@/lib/content/segments";
import { epochs, invariants } from "@/lib/content/manifest";
import { tiers, addOns, onDemandHourly } from "@/lib/pricing";
import { site } from "@/lib/content/site";

export interface KnowledgeDoc {
  id: string;
  title: string;
  url: string;
  text: string;
  keywords?: string[];
}

/** Baza de cunoștințe: construită din conținutul site-ului, ca asistentul să nu inventeze nimic. */
export function buildKnowledge(): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = [];
  docs.push({
    id: "despre",
    title: "Despre Nucleu",
    url: "/",
    text: `${site.name} este alternativa la IT-ul administrat clasic: administrăm, securizăm și demonstrăm infrastructura firmelor mici și mijlocii. Diferențe: fiecare afirmație are o dovadă verificabilă (restaurări demonstrate lunar, MFA verificat zilnic), riscul e exprimat în lei pe an (probabilitate × impact), problemele cunoscute se rezolvă automat și sunt explicate în jurnal, portalul clientului este consola noastră (cutia de sticlă), nu există contract minim (clauza de divorț: pleci oricând, cu tot exportat în 24 de ore), datele stau în UE, prețul scade 3% pe an (dividendul de automatizare). Contact: ${site.email}. Răspundem într-o zi lucrătoare. Audit IT gratuit online în 15 minute la /instrumente/audit-it.`,
    keywords: ["nucleu", "ce este", "cine sunteti", "despre", "diferit", "alternativa", "fullstack"],
  });
  docs.push({
    id: "preturi",
    title: "Prețuri",
    url: "/preturi",
    text: `Prețul este per om protejat, totul inclus, fără contract minim și fără taxă de instalare. Planuri: ${tiers.map((t) => `${t.name}: ${t.pricePerPerson} lei/om/lună (minim ${t.minimumMonthly} lei/lună), răspuns ${t.responseMinutes} min ${t.coverage}, revenire (RTO) ${t.rtoHours} h, date pierdute maxim (RPO) ${t.rpoHours} h, credit ${t.creditPct}% per garanție încălcată, restaurare demonstrată ${t.restoreDrill}`).join("; ")}. Extra-opțiuni: ${addOns.map((a) => `${a.name} ${a.price} lei ${a.unit}`).join("; ")}. Intervenții la cerere fără abonament: ${onDemandHourly} lei/oră, prima oră de diagnostic gratuită. Dividend de automatizare: prețul per om scade cu 3% pe an, 5 ani. Creditele SLA se calculează automat din jurnal și apar pe factura următoare. Calculator la /instrumente/calculator.`,
    keywords: ["pret", "preturi", "cost", "cat costa", "abonament", "lei", "plan", "tarif", "factura", "contract", "minim", "oameni", "persoane", "om", "angajati", "calculatoare"],
  });
  for (const f of [...pricingFaq, ...generalFaq]) docs.push({ id: `faq-${f.q.slice(0, 20)}`, title: f.q, url: "/preturi", text: `${f.q} ${f.a}` });
  for (const c of capabilities) docs.push({ id: `cap-${c.slug}`, title: c.name, url: `/servicii/${c.slug}`, text: `${c.name}. ${c.tagline} ${c.summary} Include: ${c.included.join("; ")}. Dovezi lunare: ${c.proofs.join("; ")}. Azi: ${c.now} În 2126: ${c.future}`, keywords: c.tags });
  for (const p of principles) docs.push({ id: `pr-${p.slug}`, title: `Principiul ${p.n}: ${p.title}`, url: `/manifest#${p.slug}`, text: `${p.title} ${p.short} ${p.body} În produs: ${p.inProduct} Inspirat de ${p.mind.name} (${p.mind.years}): ${p.mind.idea}` });
  for (const c of caseStudies) docs.push({ id: `case-${c.slug}`, title: `${c.sector}: ${c.title}`, url: `/studii-de-caz/${c.slug}`, text: `${c.sector}, ${c.size}. Problema: ${c.problem} Intervenție: ${c.intervention.join("; ")}. Rezultat: ${c.result} Risc anual: de la ${c.riskBefore} lei la ${c.riskAfter} lei în ${c.days} zile.` });
  for (const s of segments) docs.push({ id: `seg-${s.slug}`, title: `Pentru ${s.name}`, url: `/pentru/${s.slug}`, text: `${s.headline} ${s.lead} Oferte: ${s.offer.map((o) => `${o.title} ${o.price} ${o.detail}`).join("; ")}. ${s.faq.map((f) => `${f.q} ${f.a}`).join(" ")}`, keywords: [s.slug, s.name] });
  docs.push({ id: "manifest", title: "Manifest 2126", url: "/manifest", text: `Manifestul Nucleu: cum vedem IT-ul acum și peste 100 de ani. Invariante: ${invariants.map((i) => `${i.title} ${i.body}`).join(" ")} Epoci: ${epochs.map((e) => `${e.year} ${e.title}: ${e.human} ${e.system} ${e.price} ${e.proof}`).join(" ")}`, keywords: ["2126", "viitor", "100 de ani", "manifest", "viziune"] });
  docs.push({ id: "instrumente", title: "Instrumente gratuite", url: "/instrumente", text: "Instrumente gratuite, fără cont: audit IT în 15 minute cu riscul în lei (/instrumente/audit-it), simulator „ce se întâmplă dacă” pe geamănul digital (/instrumente/simulator), verificare e-mail SPF/DKIM/DMARC (/instrumente/email), igienă web (/instrumente/web), costul unei ore de nefuncționare (/instrumente/cost-downtime), riscul de backup (/instrumente/risc-backup), quiz anti-phishing (/instrumente/phishing), calculator de preț (/instrumente/calculator), test de viteză (/instrumente/viteza), verificator de parole care rulează doar în browser (/instrumente/parole).", keywords: ["instrument", "gratuit", "audit", "test", "verificare", "calculator", "simulator", "quiz", "phishing", "parola", "viteza", "spf", "dkim", "dmarc"] });
  docs.push({ id: "portal", title: "Nucleu Console (portal)", url: "/portal", text: "Portalul clientului, Nucleu Console, e inclus în toate planurile: geamăn digital, simulări, intenții și tichete, inventar, identități, backup și restaurări demonstrate, securitate pe 7 straturi, registru de risc în lei, rapoarte executive lunare, jurnal complet explicat, documente exportabile cu un buton, facturare cu credite automate. Există un portal demonstrativ cu date fictive la /portal.", keywords: ["portal", "console", "platforma", "demo", "dashboard", "hub"] });
  docs.push({ id: "garantie", title: "Garanția Nucleu", url: "/garantie", text: "Patru garanții măsurate de platformă și plătite automat: răspuns uman la incident, revenire pentru servicii critice (RTO), date pierdute maxim (RPO), restaurare demonstrată. Creditele se calculează din jurnal (vizibil clientului) și apar pe factura următoare. Excluse: pene ale terților fără măsură de rezervă recomandată și aprobată, schimbări făcute în afara jurnalului, riscuri acceptate explicit de management, forța majoră reală.", keywords: ["garantie", "sla", "credit", "rto", "rpo", "penalitate"] });
  docs.push({ id: "divort", title: "Clauza de divorț", url: "/legal/clauza-de-divort", text: "Clauza de divorț: fără durată minimă de contract, preaviz 30 de zile, tot ce am construit e al clientului, export complet în 24 de ore în formate deschise, până la 8 ore de asistență gratuită pentru noul furnizor, fără dependențe ascunse, ștergerea datelor de la noi confirmată în scris, acces la portal 90 de zile chiar dacă Nucleu dispare.", keywords: ["reziliere", "pleca", "contract", "lock-in", "divort", "iesire", "renunta"] });
  docs.push({ id: "securitate", title: "Securitate", url: "/securitate", text: "Securitate fără teatru: postură pe 7 straturi (identitate, dispozitive, rețea, e-mail, backup, monitorizare, răspuns), calculată zilnic din 20 de controale verificabile, fiecare cu dovadă și cu costul lipsei în lei. MFA obligatoriu, EDR, criptare, patch-uri sub 14 zile, segmentare, SPF/DKIM/DMARC, backup 3-2-1 imutabil cu restaurări demonstrate, plan de incident exersat.", keywords: ["securitate", "mfa", "ransomware", "phishing", "backup", "atac", "hacker", "virus"] });
  docs.push({ id: "contact", title: "Contact", url: "/contact", text: `Contact: ${site.email}, ${site.address}. Formular la /contact. Răspundem în maximum o zi lucrătoare. Apel de 20 de minute fără prezentări. Nu sunăm insistent și nu trimitem newslettere.`, keywords: ["contact", "telefon", "email", "adresa", "programare", "apel", "intalnire"] });
  return docs;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

const stop = new Set(["si", "sau", "de", "la", "in", "pe", "cu", "un", "o", "ce", "care", "este", "e", "sunt", "pentru", "ca", "sa", "se", "va", "voi", "imi", "mi", "ma", "as", "vrea", "vreau", "despre", "cum", "cat", "cand", "unde", "aveti", "avem", "am", "ai", "are", "din", "al", "a", "ale", "ai", "lui", "ei", "lor", "nu", "da", "mai", "the", "is", "what"]);

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stop.has(t) && !(/^\d+$/.test(t) && t.length < 4));
}

export interface Hit {
  doc: KnowledgeDoc;
  score: number;
}

export function search(query: string, docs: KnowledgeDoc[], limit = 4): Hit[] {
  const q = tokenize(query);
  if (q.length === 0) return [];
  const hits: Hit[] = docs.map((doc) => {
    const text = normalize(`${doc.title} ${doc.text}`);
    const kw = (doc.keywords ?? []).map(normalize);
    // Normalizare după lungime: documentele lungi nu câștigă doar pentru că au multe cuvinte.
    const lengthPenalty = 1 / Math.sqrt(Math.max(1, text.length / 600));
    let score = 0;
    for (const term of q) {
      const stem = term.slice(0, Math.max(4, term.length - 2));
      const occurrences = text.split(stem).length - 1;
      if (occurrences > 0) score += (1 + Math.min(3, occurrences) * 0.3) * lengthPenalty;
      if (kw.some((k) => k.includes(stem) || (k.length >= 4 && stem.includes(k)))) score += 2.5;
      if (normalize(doc.title).includes(stem)) score += 1.5;
    }
    return { doc, score };
  });
  return hits.filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Răspuns local, fără model de limbaj: citează pasajele relevante și trimite la pagină. */
export function localAnswer(query: string, docs: KnowledgeDoc[]): { text: string; sources: { title: string; url: string }[] } {
  const hits = search(query, docs, 3);
  if (hits.length === 0) {
    return {
      text: "Nu am găsit ceva potrivit în conținutul site-ului. Pot răspunde despre prețuri, planuri, garanții, capabilități, securitate, portal, instrumente gratuite sau manifestul 2126. Pentru orice altceva, scrie-ne la " + site.email + " și răspundem într-o zi lucrătoare.",
      sources: [{ title: "Contact", url: "/contact" }],
    };
  }
  const q = tokenize(query);
  const parts = hits.map((h) => {
    const sentences = h.doc.text.split(/(?<=[.!?])\s+/);
    const best = sentences
      .map((s) => ({ s, k: q.filter((t) => normalize(s).includes(t.slice(0, Math.max(4, t.length - 2)))).length }))
      .sort((a, b) => b.k - a.k)
      .slice(0, 2)
      .map((x) => x.s)
      .join(" ");
    return `**${h.doc.title}** — ${best || h.doc.text.slice(0, 220)}`;
  });
  return { text: parts.join("\n\n"), sources: hits.map((h) => ({ title: h.doc.title, url: h.doc.url })) };
}
