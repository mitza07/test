import type { Metadata } from "next";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { TierCards } from "@/components/site/TierCards";
import { FaqList } from "@/components/site/FaqList";
import { CtaBand } from "@/components/site/CtaBand";
import { PricingCalculator } from "@/components/tools/PricingCalculator";
import { addOns, onDemandHourly, tiers, slaCredit } from "@/lib/pricing";
import { pricingFaq } from "@/lib/content/faq";
import { formatLei } from "@/lib/format";
import type { TierId } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Prețuri — per om protejat, totul inclus, scade în fiecare an",
  description: "Nucleu Bază 69 lei, Continuu 109 lei, Suveran 169 lei per om pe lună. Fără contract minim, fără taxă de instalare, credite automate la garanții încălcate, −3% pe an.",
};

export default async function PreturiPage({ searchParams }: PageProps<"/preturi">) {
  const sp = await searchParams;
  const planParam = typeof sp.plan === "string" ? sp.plan : "continuu";
  const initialTier: TierId = tiers.some((t) => t.id === planParam) ? (planParam as TierId) : "continuu";
  const example = slaCredit("continuu", { monthlyInvoice: 3164, responseBreaches: 1, rtoBreaches: 0, rpoBreaches: 0, missedRestoreDrill: false });

  return (
    <>
      <section className="border-b border-line bg-surface-2/60">
        <Container className="py-16 sm:py-24">
          <Eyebrow className="mb-4">Prețuri</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Per om protejat. Totul inclus. <span className="text-accent-ink">Prețul scade în fiecare an.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
            Fără pachete cu funcții scoase, fără contract minim, fără taxă de instalare, fără „ofertă după audit” cu surprize.
            Planurile diferă doar prin garanții și prin cât de aproape stăm de management. Garanțiile încălcate generează credite
            automat, pe factura următoare.
          </p>
        </Container>
      </section>

      <Section>
        <TierCards />
      </Section>

      <Section tone="muted" id="calculator">
        <SectionHeading eyebrow="Calculator" title="Cât ar costa exact pentru firma ta." lead="Mută cursorul, alege planul, adaugă serverele și locațiile. Cifra e finală: e ce vei vedea pe factură." />
        <div className="mt-10">
          <PricingCalculator initialTier={initialTier} />
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Extra-opțiuni" title="Ce se adaugă, transparent." />
            <ul className="mt-8 divide-y divide-line rounded-2xl border border-line bg-surface">
              {addOns.map((a) => (
                <li key={a.id} className="grid gap-1 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="text-sm font-medium text-ink">{a.name}</div>
                    <div className="text-sm text-ink-2">{a.description}</div>
                  </div>
                  <div className="num text-sm text-ink">{formatLei(a.price)} <span className="text-ink-3">{a.unit}</span></div>
                </li>
              ))}
              <li className="grid gap-1 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="text-sm font-medium text-ink">Intervenții la cerere, fără abonament</div>
                  <div className="text-sm text-ink-2">Prima oră de diagnostic e gratuită; estimare în scris înainte de orice lucrare.</div>
                </div>
                <div className="num text-sm text-ink">{formatLei(onDemandHourly)} <span className="text-ink-3">/ oră</span></div>
              </li>
            </ul>
          </div>
          <div>
            <SectionHeading eyebrow="Credite automate" title="Când greșim, plătim. Fără să ceri." />
            <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
              <p className="text-sm leading-relaxed text-ink-2">
                Exemplu, plan Continuu, factură de {formatLei(3164)}: un singur răspuns întârziat peste 60 de minute generează un credit de{" "}
                <span className="num font-medium text-ink">{example.totalPct}%</span>, adică{" "}
                <span className="num font-medium text-ink">{formatLei(example.credit)}</span>, scăzut automat din factura următoare.
              </p>
              <table className="num mt-4 w-full text-left text-xs">
                <thead className="text-ink-3">
                  <tr>
                    <th className="py-1.5 font-medium">Plan</th>
                    <th className="py-1.5 font-medium">credit / încălcare</th>
                    <th className="py-1.5 font-medium">plafon lunar</th>
                  </tr>
                </thead>
                <tbody className="text-ink">
                  {tiers.map((t) => (
                    <tr key={t.id} className="border-t border-line">
                      <td className="py-1.5 font-sans">{t.name}</td>
                      <td className="py-1.5">{t.creditPct}%</td>
                      <td className="py-1.5">{t.creditCapPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-xs text-ink-3">Încălcări: răspuns întârziat, revenire peste RTO, date pierdute peste RPO, restaurare nedemonstrată (planuri cu drill lunar). Calculate din jurnalul platformei, vizibil ție.</p>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading eyebrow="Întrebări frecvente" title="Despre bani, pe șleau." />
        <div className="mt-10 max-w-3xl">
          <FaqList items={pricingFaq} />
        </div>
      </Section>
      <CtaBand title="Nu știi ce plan ți se potrivește?" lead="Auditul gratuit îți spune ce risc ai și ce garanție merită. Sau vorbim 20 de minute." primary={{ href: "/instrumente/audit-it", label: "Audit gratuit" }} secondary={{ href: "/contact", label: "Programează 20 de minute" }} />
    </>
  );
}
