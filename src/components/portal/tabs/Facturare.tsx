"use client";

import { usePortal } from "../context";
import { PCard, PageTitle, PStat } from "../ui";
import { Badge } from "@/components/ui/Badge";
import { invoice } from "@/lib/demo/state";
import { formatLei } from "@/lib/format";
import { slaCredit, tiers } from "@/lib/pricing";

export function Facturare() {
  const { horizon } = usePortal();
  const future = horizon === "2126";
  const tier = tiers[1];
  const example = slaCredit("continuu", { monthlyInvoice: invoice.total, responseBreaches: 1, rtoBreaches: 0, rpoBreaches: 0, missedRestoreDrill: false });
  return (
    <div>
      <PageTitle title="Facturare" lead="Factura lunară, cu dividendul de automatizare și creditele SLA calculate automat din jurnal. Nimic de negociat, nimic de cerut." />
      <div className="grid gap-4 sm:grid-cols-3">
        <PStat label={future ? "Primă de risc lunară" : "Factura curentă"} value={future ? formatLei(1_420) : formatLei(invoice.total)} hint={future ? "proporțională cu riscul rezidual asigurat" : `${invoice.month} · scadentă 1 oct`} />
        <PStat label="Dividend de automatizare" value={future ? "−41%" : "−3%"} tone="good" hint={future ? "cumulat, față de 2026" : "anul 1 din 5 · scade în fiecare martie"} />
        <PStat label="Credite SLA luna aceasta" value={formatLei(0)} hint="0 garanții încălcate · verificat din jurnal" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <PCard title={`Factura · ${invoice.month}`} className="xl:col-span-2">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {invoice.lines.map((l) => (
                <tr key={l.label}>
                  <td className="py-2.5 text-ink">{l.label}</td>
                  <td className="num py-2.5 text-right text-ink-3">{l.qty} × {formatLei(l.unit)}</td>
                  <td className="num py-2.5 text-right text-ink">{formatLei(l.total)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 text-ink">{invoice.dividend.label}</td>
                <td />
                <td className="num py-2.5 text-right text-good">{formatLei(invoice.dividend.amount)}</td>
              </tr>
              <tr>
                <td className="py-2.5 text-ink">{invoice.credits.label}</td>
                <td />
                <td className="num py-2.5 text-right text-ink">{formatLei(invoice.credits.amount)}</td>
              </tr>
              <tr className="border-t-2 border-ink">
                <td className="py-3 font-semibold text-ink">Total (fără TVA)</td>
                <td />
                <td className="num py-3 text-right text-lg font-semibold text-ink">{formatLei(invoice.total)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-3">Licențele terților (Microsoft 365, EDR) sunt facturate separat, la costul furnizorului, cu factura lui vizibilă aici.</p>
        </PCard>
        <div className="space-y-4">
          <PCard title="Garanțiile planului">
            <dl className="num grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-ink-3">plan</dt><dd className="text-ink">{tier.name}</dd>
              <dt className="text-ink-3">răspuns</dt><dd className="text-ink">{tier.responseMinutes} min · 24/7</dd>
              <dt className="text-ink-3">RTO / RPO</dt><dd className="text-ink">{tier.rtoHours} h / {tier.rpoHours} h</dd>
              <dt className="text-ink-3">credit / încălcare</dt><dd className="text-ink">{tier.creditPct}%</dd>
              <dt className="text-ink-3">contract</dt><dd className="text-ink">lunar · pleci oricând</dd>
            </dl>
          </PCard>
          <PCard title="Dacă am fi greșit">
            <p className="text-sm text-ink-2">Un singur răspuns întârziat luna aceasta ar fi generat automat un credit de <span className="num font-medium text-ink">{example.totalPct}%</span> ({formatLei(example.credit)}), cu explicația în jurnal. <Badge tone="good" className="ml-1">nu a fost cazul</Badge></p>
          </PCard>
        </div>
      </div>
    </div>
  );
}
