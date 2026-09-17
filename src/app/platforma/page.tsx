import type { Metadata } from "next";
import { ArrowRight, GitBranch, Wand2, ListChecks, Boxes, Users, DatabaseBackup, ShieldCheck, FileText, ScrollText, FolderOpen, Receipt, Clock } from "lucide-react";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ConsolePreview } from "@/components/site/ConsolePreview";
import { CtaBand } from "@/components/site/CtaBand";

export const metadata: Metadata = {
  title: "Nucleu Console — portalul tău este consola noastră",
  description: "Geamăn digital, simulări, intenții, inventar, identități, backup cu dovezi, postură pe 7 straturi, jurnal explicat, documente exportabile, factură cu credite automate. Totul într-un singur portal, la zi.",
};

const modules = [
  { icon: GitBranch, title: "Geamăn digital", body: "Graful viu al IT-ului tău: noduri, dependențe, sănătate. Click pe orice nod: ce depinde de el, ce îl protejează." },
  { icon: Wand2, title: "Simulări", body: "„Ce se întâmplă dacă…” pentru orice nod: oameni afectați, durată, pierdere în lei, măsuri cu economie și cost." },
  { icon: ListChecks, title: "Intenții & tichete", body: "Angajări, plecări, echipamente, accese: fluxuri cu pași automați și umani, vizibili. Tichete doar pentru ce e nou." },
  { icon: Boxes, title: "Inventar", body: "Echipamente, garanții, licențe, firmware, criptare, patch-uri. Descoperit automat, validat fizic." },
  { icon: Users, title: "Identități", body: "Conturi, MFA, privilegii, conturi orfane, licențe. Comparat zilnic cu HR." },
  { icon: DatabaseBackup, title: "Backup & restaurări", body: "Lanțul 3-2-1, copia imutabilă, RPO efectiv și jurnalul restaurărilor demonstrate, cu durate." },
  { icon: ShieldCheck, title: "Securitate", body: "Postura pe 7 straturi, fiecare control cu dovadă, dată, metodă și cost dacă lipsește." },
  { icon: FileText, title: "Rapoarte", body: "Raportul executiv lunar: uptime, incidente, risc în lei, ore umane, decizii cerute. Pe o pagină." },
  { icon: ScrollText, title: "Jurnal", body: "Fiecare acțiune, automată sau umană, cu motivul ei în limbaj clar. Nimic ascuns." },
  { icon: FolderOpen, title: "Documente", body: "Harta rețelei, proceduri, configurații versionate, dovezi. Buton „Exportă tot”, oricând." },
  { icon: Receipt, title: "Facturare", body: "Factura lunară cu dividendul de automatizare și creditele SLA calculate automat." },
  { icon: Clock, title: "Orizont 2026 → 2126", body: "Un comutator care arată cum arată același portal când infrastructura devine complet autonomă." },
];

export default function PlatformaPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <Container wide className="relative py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <Eyebrow className="mb-4">Platformă · Nucleu Console</Eyebrow>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
                Cutia de sticlă. <span className="text-accent-ink">Portalul tău este consola noastră.</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-ink-2">
                Nu există un ecran pe care îl vedem noi și tu nu. Aceleași date, aceleași jurnale, aceleași dovezi. Inclus în toate
                planurile, fără licențe separate, activat la onboarding, cu acces individual și date izolate pe firmă.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/portal" size="lg">Intră în portalul demo <ArrowRight className="size-4" /></Button>
                <Button href="/preturi" size="lg" variant="secondary">Inclus în toate planurile</Button>
              </div>
            </div>
            <ConsolePreview />
          </div>
        </Container>
      </section>

      <Section>
        <SectionHeading eyebrow="Module" title="Douăsprezece module, un singur adevăr." lead="Toate citesc din geamănul digital și din jurnal. Nu există două versiuni ale realității: una pentru noi, una pentru tine." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div key={m.title} className="rounded-2xl border border-line bg-surface p-5">
              <m.icon className="size-5 text-accent-ink" aria-hidden />
              <h3 className="mt-4 text-base font-semibold text-ink">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{m.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-lg font-semibold text-ink">Acces</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">Conturi individuale cu MFA, roluri (management, IT intern, contabil extern), jurnal de acces. Cabinetul de contabilitate poate primi acces doar la rapoarte.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-lg font-semibold text-ink">Export</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">Tot ce e în portal se exportă cu un buton, în formate deschise (Markdown, CSV, JSON, SVG, Git). Fără aprobare, fără întârziere. E Clauza de divorț, ca funcție.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-lg font-semibold text-ink">API</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">Datele tale sunt disponibile prin API pentru sistemele tale: inventar în ERP, dovezi în portalul de audit, status în intranet. Documentat, versionat.</p>
          </div>
        </div>
      </Section>
      <CtaBand title="Vezi portalul cu date reale (fictive)." lead="Portalul demo e complet funcțional: simulează căderi, creează intenții, citește jurnalul, exportă documente. Fără cont." primary={{ href: "/portal", label: "Deschide portalul demo" }} secondary={{ href: "/contact", label: "Cere o prezentare" }} />
    </>
  );
}
