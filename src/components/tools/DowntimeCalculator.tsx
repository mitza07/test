"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { downtimeCost } from "@/lib/tools/downtime";
import { formatLei, formatNumber } from "@/lib/format";
import { HBars } from "@/components/charts/HBars";
import { NumberField, RangeField } from "./fields";

export function DowntimeCalculator() {
  const [people, setPeople] = useState(15);
  const [hourlyCost, setHourlyCost] = useState(90);
  const [annualRevenue, setAnnualRevenue] = useState(5_000_000);
  const [dependency, setDependency] = useState(50);
  const [hoursPerIncident, setHoursPerIncident] = useState(4);
  const [incidentsPerYear, setIncidentsPerYear] = useState(3);

  const r = useMemo(
    () => downtimeCost({ people, hourlyCostPerPerson: hourlyCost, annualRevenue, itDependency: dependency / 100, hoursPerIncident, incidentsPerYear }),
    [people, hourlyCost, annualRevenue, dependency, hoursPerIncident, incidentsPerYear],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField label="Oameni care depind de IT" value={people} onChange={(n) => setPeople(Math.round(n))} min={1} max={5000} />
          <NumberField label="Cost orar pe persoană" hint="Salariu complet, cu taxe, împărțit la ~170 h/lună." value={hourlyCost} onChange={setHourlyCost} min={1} max={10_000} suffix="lei/h" />
          <NumberField label="Venit anual" value={annualRevenue} onChange={setAnnualRevenue} min={0} max={10_000_000_000} step={100_000} suffix="lei" className="sm:col-span-2" />
        </div>
        <RangeField label="Dependența de IT" value={dependency} onChange={setDependency} display={`${dependency}%`} hint="Cât din venit se oprește când se opresc sistemele: un magazin online ~100%, un atelier ~20%." />
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField label="Ore pe incident" hint="Cât durează, în medie, până revine tot." value={hoursPerIncident} onChange={setHoursPerIncident} min={0.25} max={720} step={0.5} suffix="h" />
          <NumberField label="Incidente pe an" hint="Pene, servere căzute, conturi blocate." value={incidentsPerYear} onChange={setIncidentsPerYear} min={0} max={365} step={1} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Costul unei ore de nefuncționare</div>
          <div className="num mt-1 text-4xl font-semibold tracking-tight text-ink">{formatLei(r.perHour.total)}</div>
          <div className="mt-4">
            <HBars
              labelWidth={130}
              data={[
                { label: "Productivitate", value: r.perHour.productivity, display: formatLei(r.perHour.productivity), tone: "series-1", hint: "oameni plătiți, ~70% din muncă pierdută" },
                { label: "Venit pierdut", value: r.perHour.revenue, display: formatLei(r.perHour.revenue), tone: "series-2", hint: "35% din venitul întârziat nu se mai recuperează" },
              ]}
            />
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-4">
            <div>
              <dt className="text-xs text-ink-3">Pe incident</dt>
              <dd className="num mt-0.5 text-lg font-semibold text-ink">{formatLei(r.perIncident)}</dd>
              <dd className="num text-xs text-ink-3">{formatNumber(hoursPerIncident, 1)} h</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Pe an</dt>
              <dd className="num mt-0.5 text-lg font-semibold text-bad">{formatLei(r.perYear)}</dd>
              <dd className="num text-xs text-ink-3">{formatNumber(incidentsPerYear)} incidente</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Ore pierdute pe an</dt>
              <dd className="num mt-0.5 text-lg font-semibold text-ink">{formatNumber(r.hoursPerYear, 1)} h</dd>
              <dd className="num text-xs text-ink-3">{formatNumber((r.hoursPerYear / 2000) * 100, 2)}% din program</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="text-sm font-semibold text-ink">Cum calculăm</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            <li>
              <span className="font-medium text-ink">Productivitate</span> = oameni × cost orar × 0,7. Oamenii sunt plătiți, dar fără sisteme lucrează la ~30% capacitate.
            </li>
            <li>
              <span className="font-medium text-ink">Venit pierdut</span> = (venit anual ÷ 2.000 de ore) × dependența de IT × 0,35. Doar 35% din venitul întârziat se pierde definitiv; restul se recuperează după.
            </li>
            <li>
              <span className="font-medium text-ink">Pe incident</span> = costul orei × ore pe incident. <span className="font-medium text-ink">Pe an</span> = pe incident × incidente pe an.
            </li>
            <li className="text-xs text-ink-3">Nu includem penalități contractuale, clienți pierduți definitiv sau costuri de intervenție; cifra e un minim, nu un maxim.</li>
          </ul>
          <Link href="/instrumente/simulator" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-ink">
            Vezi ce cade și cine se oprește, în simulator <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
