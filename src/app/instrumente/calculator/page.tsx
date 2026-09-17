import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/site/CtaBand";
import { ToolHero } from "@/components/tools/ToolHero";
import { ToolNotes } from "@/components/tools/ToolNotes";
import { PricingCalculator } from "@/components/tools/PricingCalculator";
import { automationDividendPerYear, automationDividendYears, tiers } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Calculator de preț Nucleu — factura exactă, per om protejat",
  description:
    "Calculează prețul Nucleu pentru firma ta: per om protejat, totul inclus, cu servere, locații și e-Factura. Cifra e finală și scade 3% pe an, cinci ani la rând.",
};

export default function CalculatorPage() {
  const dividendPct = Math.round(automationDividendPerYear * 100);
  return (
    <>
      <ToolHero
        category="Prețuri"
        title={<>Cât ar costa exact, <span className="text-accent-ink">pentru firma ta.</span></>}
        lead="Mută cursorul, alege planul, adaugă serverele și locațiile. Cifra e finală: nu există „ofertă după audit”, taxă de instalare sau contract minim. Ce vezi aici e ce vei vedea pe factură."
      />
      <Section>
        <PricingCalculator />
      </Section>
      <ToolNotes
        title="Cum se formează prețul"
        items={[
          {
            title: "Per om protejat, nu per calculator",
            body: `Plătești pentru fiecare om cu cont: ${tiers.map((t) => `${t.name.replace("Nucleu ", "")} ${t.pricePerPerson} lei`).join(", ")} pe lună. Nu contează câte dispozitive are, iar toate funcțiile platformei sunt incluse în orice plan. Planurile diferă doar prin garanții (răspuns, RTO, RPO) și prin cât de aproape stăm de management.`,
          },
          {
            title: "Dividendul de automatizare",
            body: `Pe măsură ce mai multe probleme se rezolvă automat, costul nostru scade și îl împărțim cu tine: prețul per om scade cu ${dividendPct}% în fiecare an, ${automationDividendYears} ani la rând, fără să ceri. Un furnizor clasic, plătit la oră, are stimulentul invers.`,
          },
          {
            title: "Extra-opțiunile",
            body: "Servere on-prem, locații suplimentare, monitorizare e-Factura pe firmă și operarea aplicațiilor interne au prețuri fixe, afișate lângă fiecare câmp. Nimic altceva nu apare pe factură; intervențiile în afara abonamentului nu există în planurile Continuu și Suveran.",
          },
          {
            title: "Garanția încălcată se plătește singură",
            body: "Răspuns întârziat, revenire peste RTO, date pierdute peste RPO sau restaurare nedemonstrată generează credite automate pe factura următoare, calculate din jurnalul platformei, vizibil ție.",
          },
        ]}
      />
      <Section>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">Vrei detaliile fiecărui plan și întrebările despre bani?</h2>
            <p className="mt-1 text-sm text-ink-2">Garanții, credite, clauza de divorț, ce se întâmplă când pleci.</p>
          </div>
          <Link href="/preturi" className="inline-flex items-center gap-1 text-sm font-medium text-accent-ink">
            Pagina de prețuri <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Section>
      <CtaBand
        title="Nu știi ce plan ți se potrivește?"
        lead="Auditul gratuit îți spune ce risc ai și ce garanție merită. Sau vorbim 20 de minute, fără prezentare de vânzări."
        primary={{ href: "/instrumente/audit-it", label: "Audit gratuit" }}
        secondary={{ href: "/contact", label: "Programează 20 de minute" }}
      />
    </>
  );
}
