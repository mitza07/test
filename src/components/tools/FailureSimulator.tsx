"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Maximize2, Minimize2 } from "lucide-react";
import { demoTwin } from "@/lib/twin/demo";
import { demoScenarios, simulateFailure, type FailureMode } from "@/lib/twin/simulate";
import type { Twin } from "@/lib/twin/types";
import { TwinGraph } from "@/components/charts/TwinGraph";
import { HBars } from "@/components/charts/HBars";
import { Badge } from "@/components/ui/Badge";
import { formatDuration, formatLei, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { NumberField, RangeField, Segmented } from "./fields";

const defaultScenario = demoScenarios.find((s) => s.id === "ransomware") ?? demoScenarios[0];

export function FailureSimulator() {
  const [nodeId, setNodeId] = useState(defaultScenario.nodeId);
  const [mode, setMode] = useState<FailureMode>(defaultScenario.mode);
  const [people, setPeople] = useState(demoTwin.business.people);
  const [annualRevenue, setAnnualRevenue] = useState(demoTwin.business.annualRevenue);
  const [hourlyCost, setHourlyCost] = useState(demoTwin.business.hourlyCostPerPerson);
  const [itDependency, setItDependency] = useState(Math.round(demoTwin.business.itDependencyShare * 100));
  const [fit, setFit] = useState(false);

  const twin = useMemo<Twin>(
    () => ({
      ...demoTwin,
      business: { ...demoTwin.business, people, annualRevenue, hourlyCostPerPerson: hourlyCost, itDependencyShare: itDependency / 100 },
    }),
    [people, annualRevenue, hourlyCost, itDependency],
  );

  const result = useMemo(() => simulateFailure(twin, nodeId, mode), [twin, nodeId, mode]);
  const affectedIds = useMemo(() => new Set(result.affected.map((n) => n.id)), [result]);
  const stoppedIds = useMemo(() => new Set(result.stoppedBy.map((n) => n.id)), [result]);
  const activeScenario = demoScenarios.find((s) => s.nodeId === nodeId && s.mode === mode);

  const breakdown = [
    { label: "Productivitate", value: result.loss.productivity, hint: "oameni plătiți, dar la ~30% capacitate" },
    { label: "Venit pus în pericol", value: result.loss.revenue, hint: "partea din venit care depinde de IT; 35% se pierde definitiv" },
    { label: "Date de reintrodus", value: result.loss.data, hint: "munca dintre ultimul backup și incident" },
    { label: "Costul incidentului", value: result.loss.incident, hint: "intervenție, comunicare, expertiză" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-5">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="text-sm font-semibold text-ink">Scenarii pregătite</h2>
          <ul className="mt-3 space-y-2">
            {demoScenarios.map((s) => {
              const active = activeScenario?.id === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setNodeId(s.nodeId);
                      setMode(s.mode);
                    }}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-colors",
                      active ? "border-accent bg-accent-soft/50" : "border-line hover:bg-surface-2",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{s.title}</span>
                      <Badge tone={s.mode === "loss" ? "bad" : "warn"} className="shrink-0">{s.mode === "loss" ? "distrugere" : "cădere"}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-2">{s.story}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <Segmented<FailureMode>
            label="Tipul incidentului"
            value={mode}
            onChange={setMode}
            options={[
              { value: "outage", label: "Cădere" },
              { value: "loss", label: "Distrugere / criptare" },
            ]}
          />
          <p className="mt-2 text-xs text-ink-3">Căderea oprește lucrul cât durează revenirea. Distrugerea adaugă datele pierdute de la ultimul backup.</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Parametrii firmei</h2>
          <p className="text-xs text-ink-3">Graful rămâne al firmei demo; cifrele de mai jos schimbă doar cât costă fiecare oră.</p>
          <NumberField label="Oameni" value={people} onChange={(n) => setPeople(Math.round(n))} min={1} max={5000} />
          <NumberField label="Venit anual" value={annualRevenue} onChange={setAnnualRevenue} min={0} max={10_000_000_000} step={100_000} suffix="lei" />
          <NumberField label="Cost orar pe persoană" hint="Salariu complet, cu taxe, împărțit la ore." value={hourlyCost} onChange={setHourlyCost} min={1} max={10_000} suffix="lei/h" />
          <RangeField label="Dependența de IT" value={itDependency} onChange={setItDependency} display={`${itDependency}%`} hint="Cât din venit se oprește când se opresc sistemele." />
        </div>
      </aside>

      <div className="min-w-0 space-y-6">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-ink-2">
              <span className="font-medium text-ink">{demoTwin.company.name}</span> · geamăn digital demo, date fictive. Apasă pe orice nod ca să-l „dobori”.
            </div>
            <button
              type="button"
              onClick={() => setFit((f) => !f)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:bg-surface-2"
              aria-pressed={fit}
            >
              {fit ? <Minimize2 className="size-3.5" aria-hidden /> : <Maximize2 className="size-3.5" aria-hidden />}
              {fit ? "Mărime reală" : "Potrivește în lățime"}
            </button>
          </div>
          <TwinGraph
            twin={twin}
            failedId={nodeId}
            affectedIds={affectedIds}
            stoppedIds={stoppedIds}
            selectedId={nodeId}
            onSelect={(id) => setNodeId(id)}
            compact={fit}
          />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={mode === "loss" ? "bad" : "warn"}>{mode === "loss" ? "distrugere / criptare" : "cădere"}</Badge>
            <span className="text-sm font-medium text-ink">{result.failed.name}</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Pierdere pe incident</div>
              <div className="num mt-1 text-4xl font-semibold tracking-tight text-bad">{formatLei(result.loss.total)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Oameni afectați</div>
              <div className="num mt-1 text-2xl font-semibold text-ink">
                {formatNumber(result.affectedPeople)} <span className="text-base font-normal text-ink-3">din {formatNumber(result.totalPeople)}</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Oprire</div>
              <div className="num mt-1 text-2xl font-semibold text-ink">{formatDuration(result.outageHours * 60)}</div>
              {result.dataLossHours > 0 && (
                <div className="num text-xs text-ink-2">date pierdute: {formatDuration(result.dataLossHours * 60)}</div>
              )}
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-sm text-ink-2">
            {result.explanation.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-ink-3" aria-hidden>→</span>
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Din ce e formată pierderea</div>
            <div className="mt-3">
              <HBars data={breakdown.map((b) => ({ label: b.label, value: b.value, display: formatLei(b.value), hint: b.hint, tone: b.value > 0 ? "bad" : "muted" }))} labelWidth={150} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="text-lg font-semibold text-ink">Ce ar reduce pierderea</h3>
          {result.mitigations.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">
              {result.failed.redundant && mode === "outage"
                ? "Nodul are redundanță: nu e nimic de remediat aici. Încearcă modul „distrugere” sau alt nod."
                : "Pentru acest nod nu avem o remediere standard; într-un geamăn real, arhitectul propune una specifică."}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {result.mitigations.map((m) => (
                <li key={m.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <div className="text-sm font-medium text-ink">{m.title}</div>
                    <p className="mt-1 text-sm text-ink-2">{m.description}</p>
                    <div className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
                      <span>{m.monthlyCost > 0 ? `${formatLei(m.monthlyCost)} / lună` : "inclus în abonament"}</span>
                      {m.oneTimeCost > 0 && <span>{formatLei(m.oneTimeCost)} o singură dată</span>}
                      <span>oprire după: {formatDuration(m.outageHoursAfter * 60)}</span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="num text-lg font-semibold text-good">−{formatLei(m.saved)}</div>
                    <div className="text-xs text-ink-3">pe incident · rămâne {formatLei(m.lossAfter)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-sm text-ink-2">
          Aceasta e firma demonstrativă, Meridian Distribuție SRL: 28 de oameni, două locații, date fictive. Un client Nucleu primește
          geamănul lui, construit din inventarul real, cu aceleași simulări.{" "}
          <Link href="/instrumente/audit-it" className="inline-flex items-center gap-1 font-medium text-accent-ink">
            Vezi riscul firmei tale <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </p>
      </div>
    </div>
  );
}
