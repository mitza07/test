import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui/Section";
import { CaseCard } from "@/components/site/CaseCard";
import { CtaBand } from "@/components/site/CtaBand";
import { caseStudies } from "@/lib/content/cases";
import { formatLei } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dovezi și scenarii — riscul înainte și după, în lei",
  description: "Tipologii anonimizate din practică: clinică, contabilitate, distribuție, producție, agenție, firmă în creștere, ransomware, fraudă. Cu riscul anual înainte și după.",
};

export default function StudiiDeCazPage() {
  const totalBefore = caseStudies.reduce((s, c) => s + c.riskBefore, 0);
  const totalAfter = caseStudies.reduce((s, c) => s + c.riskAfter, 0);
  return (
    <>
      <Section>
        <SectionHeading
          as="h1"
          eyebrow="Dovezi"
          title={<>Scenarii în care IT-ul trebuie să funcționeze, <span className="text-ink-3">cu cifrele înainte și după.</span></>}
          lead="Tipologii anonimizate din practica noastră. Nu garantăm rezultate identice; garantăm metoda, dovezile și faptul că vei ști în fiecare lună unde ești."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Risc anual cumulat, înainte</div>
            <div className="num mt-1 text-2xl font-semibold text-ink">{formatLei(totalBefore)}</div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Risc anual cumulat, după</div>
            <div className="num mt-1 text-2xl font-semibold text-ink">{formatLei(totalAfter)}</div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Reducere medie</div>
            <div className="num mt-1 text-2xl font-semibold text-good">−{Math.round((1 - totalAfter / totalBefore) * 100)}%</div>
          </div>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {caseStudies.map((c) => (
            <CaseCard key={c.slug} c={c} />
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
