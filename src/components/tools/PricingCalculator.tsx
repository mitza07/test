"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { quote, tiers, addOns, type TierId } from "@/lib/pricing";
import { formatLei } from "@/lib/format";
import { HBars } from "@/components/charts/HBars";
import { cn } from "@/lib/cn";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

const inputCls = "num w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";

export function PricingCalculator({ initialTier = "continuu", initialPeople = 15 }: { initialTier?: TierId; initialPeople?: number }) {
  const [people, setPeople] = useState(initialPeople);
  const [tier, setTier] = useState<TierId>(initialTier);
  const [servers, setServers] = useState(1);
  const [sites, setSites] = useState(0);
  const [efactura, setEfactura] = useState(0);
  const [apps, setApps] = useState(0);

  const q = useMemo(() => quote({ people, tier, servers, extraSites: sites, efacturaFirms: efactura, apps }), [people, tier, servers, sites, efactura, apps]);

  const contactHref = `/contact?subiect=oferta&plan=${tier}&oameni=${people}&servere=${servers}&locatii=${sites}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <Field label={`Oameni protejați: ${people}`} hint="Angajați și colaboratori cu cont. Nu contează câte calculatoare au.">
          <input type="range" min={1} max={120} value={people} onChange={(e) => setPeople(Number(e.target.value))} className="w-full accent-[var(--accent)]" aria-label="Oameni protejați" />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium text-ink">Plan</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {tiers.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTier(t.id)}
                aria-pressed={tier === t.id}
                className={cn("rounded-xl border p-3 text-left text-sm transition-colors", tier === t.id ? "border-accent bg-accent-soft/50" : "border-line hover:bg-surface-2")}
              >
                <div className="font-medium text-ink">{t.name.replace("Nucleu ", "")}</div>
                <div className="num text-xs text-ink-2">{t.pricePerPerson} lei / om</div>
                <div className="text-[11px] text-ink-3">RTO {t.rtoHours} h · răspuns {t.responseMinutes} min</div>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Servere on-prem" hint={`${addOns[0].price} lei / server / lună`}>
            <input type="number" min={0} max={20} value={servers} onChange={(e) => setServers(Math.max(0, Number(e.target.value)))} className={inputCls} />
          </Field>
          <Field label="Locații suplimentare" hint={`${addOns[1].price} lei / locație / lună`}>
            <input type="number" min={0} max={20} value={sites} onChange={(e) => setSites(Math.max(0, Number(e.target.value)))} className={inputCls} />
          </Field>
          <Field label="Firme e-Factura (cabinete)" hint={`${addOns[2].price} lei / firmă / lună`}>
            <input type="number" min={0} max={500} value={efactura} onChange={(e) => setEfactura(Math.max(0, Number(e.target.value)))} className={inputCls} />
          </Field>
          <Field label="Aplicații interne operate" hint={`de la ${addOns[3].price} lei / lună`}>
            <input type="number" min={0} max={10} value={apps} onChange={(e) => setApps(Math.max(0, Number(e.target.value)))} className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="flex items-baseline justify-between">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Lunar, totul inclus</div>
            <div className="num text-xs text-ink-3">{q.perPerson} lei / om</div>
          </div>
          <div className="mt-1 text-4xl font-semibold tracking-tight text-ink">{formatLei(q.monthly)}<span className="text-base font-normal text-ink-3"> / lună</span></div>
          <ul className="mt-4 divide-y divide-line text-sm">
            {q.lines.map((l) => (
              <li key={l.label} className="flex items-center justify-between gap-3 py-2">
                <span className="text-ink-2">{l.label}</span>
                <span className="num text-ink">{formatLei(l.total)}</span>
              </li>
            ))}
          </ul>
          {q.minimumApplied && <p className="mt-2 text-xs text-ink-3">S-a aplicat minimul lunar al planului.</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={contactHref} className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[15px] font-medium text-white hover:brightness-110">
              Cere oferta exact așa <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-ink">Pe 5 ani, cu dividendul de automatizare (−3%/an)</div>
            <div className="num text-xs text-good">economisești {formatLei(q.fiveYearSavedByDividend)}</div>
          </div>
          <div className="mt-4">
            <HBars data={q.fiveYear.map((v, i) => ({ label: `Anul ${i + 1}`, value: v, display: formatLei(v) }))} labelWidth={70} />
          </div>
          <p className="mt-3 text-xs text-ink-3">
            Furnizor clasic, orientativ (per calculator + ore): {formatLei(q.classicEstimate.low)}–{formatLei(q.classicEstimate.high)} / lună, cu prețul care crește în timp, nu scade.
          </p>
        </div>
      </div>
    </div>
  );
}
