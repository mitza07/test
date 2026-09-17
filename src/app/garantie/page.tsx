import type { Metadata } from "next";
import Link from "next/link";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { CtaBand } from "@/components/site/CtaBand";
import { tiers, slaCredit } from "@/lib/pricing";
import { formatLei } from "@/lib/format";

export const metadata: Metadata = {
  title: "Garanția Nucleu — răspuns, revenire, date, dovezi, cu credite automate",
  description: "Ce garantăm în fiecare plan, cum se calculează creditele automat, ce e exclus și de ce nu trebuie să ceri nimic.",
};

export default function GarantiePage() {
  const ex = slaCredit("continuu", { monthlyInvoice: 3164, responseBreaches: 1, rtoBreaches: 1, rpoBreaches: 0, missedRestoreDrill: false });
  return (
    <>
      <section className="border-b border-line bg-surface-2/60">
        <Container className="py-16 sm:py-24">
          <Eyebrow className="mb-4">Garanția Nucleu</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">Patru garanții. Măsurate de platformă. <span className="text-accent-ink">Plătite automat.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">Un SLA pe care trebuie să îl dovedești tu nu e o garanție, e o dispută. La Nucleu, încălcările se calculează din jurnalul platformei, pe care îl vezi și tu, iar creditul apare pe factura următoare fără să ceri nimic.</p>
        </Container>
      </section>

      <Section>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-2/70 text-xs uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-4 py-3 font-medium">Garanție</th>
                {tiers.map((t) => (
                  <th key={t.id} className="px-4 py-3 font-medium">{t.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="num divide-y divide-line text-ink">
              <tr><td className="px-4 py-3 font-sans text-ink-2">Răspuns uman la incident</td>{tiers.map((t) => <td key={t.id} className="px-4 py-3">{t.responseMinutes} min · {t.coverage}</td>)}</tr>
              <tr><td className="px-4 py-3 font-sans text-ink-2">Revenire pentru servicii critice (RTO)</td>{tiers.map((t) => <td key={t.id} className="px-4 py-3">{t.rtoHours} h</td>)}</tr>
              <tr><td className="px-4 py-3 font-sans text-ink-2">Date pierdute maxim (RPO)</td>{tiers.map((t) => <td key={t.id} className="px-4 py-3">{t.rpoHours < 1 ? `${t.rpoHours * 60} min` : `${t.rpoHours} h`}</td>)}</tr>
              <tr><td className="px-4 py-3 font-sans text-ink-2">Restaurare demonstrată</td>{tiers.map((t) => <td key={t.id} className="px-4 py-3 font-sans">{t.restoreDrill}</td>)}</tr>
              <tr><td className="px-4 py-3 font-sans text-ink-2">Credit per încălcare</td>{tiers.map((t) => <td key={t.id} className="px-4 py-3">{t.creditPct}% din factura lunară</td>)}</tr>
              <tr><td className="px-4 py-3 font-sans text-ink-2">Plafon lunar credite</td>{tiers.map((t) => <td key={t.id} className="px-4 py-3">{t.creditCapPct}%</td>)}</tr>
              <tr><td className="px-4 py-3 font-sans text-ink-2">Revizuire cu managementul</td>{tiers.map((t) => <td key={t.id} className="px-4 py-3 font-sans">{t.humanReview}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Cum se calculează" title="Din jurnal, nu din discuții." />
            <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-ink-2">
              <p>Fiecare incident are în jurnal momentul detectării, momentul primului răspuns uman, momentul revenirii serviciilor critice și, dacă a fost o restaurare, cantitatea de date pierdute. Platforma compară aceste momente cu garanțiile planului tău.</p>
              <p>Exemplu, plan Continuu, factură de {formatLei(3164)}: un răspuns întârziat și o revenire peste 4 ore în aceeași lună generează un credit de <span className="num font-medium text-ink">{ex.totalPct}%</span>, adică <span className="num font-medium text-ink">{formatLei(ex.credit)}</span>, aplicat pe factura următoare, cu explicația în portal.</p>
              <p>Dacă nu ești de acord cu calculul, jurnalul e al tău: îl poți contesta cu aceleași date pe care le-am folosit noi.</p>
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Ce e exclus" title="Onest, ca să nu existe surprize." />
            <ul className="mt-8 space-y-3 text-[15px] text-ink-2">
              <li className="rounded-xl border border-line bg-surface p-4">Pene ale furnizorilor terți (internet, Microsoft, ANAF) în afara controlului nostru, cu excepția cazului în care lipsea o măsură de rezervă pe care o recomandaserăm și o aprobaseși.</li>
              <li className="rounded-xl border border-line bg-surface p-4">Schimbări făcute de client sau de terți fără să treacă prin geamăn și prin jurnal.</li>
              <li className="rounded-xl border border-line bg-surface p-4">Riscuri acceptate explicit de management în registrul de risc (de exemplu: „fără legătură de rezervă la depozit”). Le poți reevalua oricând.</li>
              <li className="rounded-xl border border-line bg-surface p-4">Forța majoră reală, nu „forța majoră” din contractele clasice: dezastre naturale, conflict armat, întreruperi naționale de energie.</li>
            </ul>
            <p className="mt-4 text-sm text-ink-3">Restul e al nostru. Textul integral e în contract; ieșirea e descrisă în <Link href="/legal/clauza-de-divort" className="underline decoration-line-2 underline-offset-2 hover:text-ink">Clauza de divorț</Link>.</p>
          </div>
        </div>
      </Section>
      <CtaBand title="Vrei garanțiile astea pentru firma ta?" lead="Începe cu auditul gratuit: îți spune ce plan are sens și cât ar costa exact." />
    </>
  );
}
