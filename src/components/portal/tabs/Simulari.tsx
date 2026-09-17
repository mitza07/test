"use client";

import { useMemo, useState } from "react";
import { usePortal } from "../context";
import { PCard, PStat, PageTitle } from "../ui";
import { TwinGraph } from "@/components/charts/TwinGraph";
import { HBars } from "@/components/charts/HBars";
import { Badge } from "@/components/ui/Badge";
import { demoTwin, demoScenarios, simulateFailure, type FailureMode } from "@/lib/twin";
import { formatLei, formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";

export function Simulari() {
  const { sim, simulate } = usePortal();
  const [mode, setMode] = useState<FailureMode>(sim?.mode ?? "loss");
  const nodeId = sim?.nodeId ?? "srv-01";
  const effectiveMode = sim?.mode ?? mode;
  const result = useMemo(() => simulateFailure(demoTwin, nodeId, effectiveMode), [nodeId, effectiveMode]);
  const affected = useMemo(() => new Set(result.affected.map((n) => n.id)), [result]);
  const stopped = useMemo(() => new Set(result.stoppedBy.map((n) => n.id)), [result]);

  return (
    <div>
      <PageTitle title="Simulări · „ce se întâmplă dacă…”" lead="Alege un scenariu sau click pe orice nod din graf. Pierderea e calculată din geamăn: cine e afectat, cât durează, cât costă. Fiecare cifră are formula la vedere.">
        <div className="flex gap-1 rounded-full border border-line bg-surface-2 p-0.5 text-xs" role="group" aria-label="Tip de eveniment">
          {(["outage", "loss"] as FailureMode[]).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); simulate(nodeId, m); }} aria-pressed={effectiveMode === m} className={cn("rounded-full px-3 py-1", effectiveMode === m ? "bg-ink text-bg" : "text-ink-2")}>
              {m === "outage" ? "cădere" : "distrugere / criptare"}
            </button>
          ))}
        </div>
      </PageTitle>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <PCard title="Scenarii" padded={false}>
          <ul className="divide-y divide-line">
            {demoScenarios.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => { setMode(s.mode); simulate(s.nodeId, s.mode); }} className={cn("w-full px-4 py-3 text-left hover:bg-surface-2/60", nodeId === s.nodeId && effectiveMode === s.mode && "bg-accent-soft/50")}>
                  <div className="text-sm font-medium text-ink">{s.title}</div>
                  <div className="mt-0.5 text-xs text-ink-2">{s.story}</div>
                </button>
              </li>
            ))}
          </ul>
        </PCard>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PStat label="Pierdere per incident" value={formatLei(result.loss.total)} tone="bad" hint={result.mode === "loss" ? "cu date pierdute și cost de incident" : "productivitate + venit pus în pericol"} />
            <PStat label="Oameni afectați" value={`${result.affectedPeople} / ${result.totalPeople}`} hint={`${result.affectedServices.length} servicii oprite`} />
            <PStat label="Timp de revenire" value={formatDuration(result.outageHours * 60)} hint={result.failed.redundant && result.mode === "outage" ? "nod redundant" : "din RTO-ul nodului"} />
            <PStat label="Date pierdute" value={result.dataLossHours ? formatDuration(result.dataLossHours * 60) : "0"} hint={result.dataLossHours ? "de la ultimul backup verificat" : "fără pierdere de date"} />
          </div>

          <PCard padded={false} className="min-w-0 p-3" title={<span>Propagarea în geamăn · <span className="text-bad">{result.failed.name}</span></span>} action={<Badge tone="bad" mono>{effectiveMode === "loss" ? "distrugere" : "cădere"}</Badge>}>
            <TwinGraph twin={demoTwin} failedId={nodeId} affectedIds={affected} stoppedIds={stopped} selectedId={nodeId} onSelect={(id) => simulate(id, effectiveMode)} />
          </PCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <PCard title="Cum se compune pierderea">
              <HBars
                data={[
                  { label: "Productivitate pierdută", value: result.loss.productivity, display: formatLei(result.loss.productivity), hint: "oameni × ore × cost orar × 0,7" },
                  { label: "Venit pus în pericol", value: result.loss.revenue, display: formatLei(result.loss.revenue), hint: "venit/oră × dependență IT × cotă oameni × ore × 0,35" },
                  { label: "Date de reintrodus", value: result.loss.data, display: formatLei(result.loss.data), hint: "oameni × ore pierdute × cost orar" },
                  { label: "Costul incidentului", value: result.loss.incident, display: formatLei(result.loss.incident), hint: "intervenție, comunicare, expertiză" },
                ]}
                labelWidth={150}
              />
              <ul className="mt-4 space-y-1 text-xs text-ink-2">
                {result.explanation.map((e) => (
                  <li key={e}>· {e}</li>
                ))}
              </ul>
            </PCard>
            <PCard title="Ce ar merita, în lei" padded={false}>
              {result.mitigations.length === 0 ? (
                <p className="p-4 text-sm text-ink-2">Nodul e deja redundant sau nu are o măsură standard. Vezi registrul de risc pentru contextul complet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {result.mitigations.map((m) => (
                    <li key={m.id} className="px-4 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-medium text-ink">{m.title}</div>
                          <div className="mt-0.5 text-xs text-ink-2">{m.description}</div>
                        </div>
                        <div className="num shrink-0 text-xs sm:text-right">
                          <div className="text-good">−{formatLei(m.saved)} / incident</div>
                          <div className="text-ink-3">{m.monthlyCost ? `${formatLei(m.monthlyCost)}/lună` : "inclus"}{m.oneTimeCost ? ` + ${formatLei(m.oneTimeCost)} o dată` : ""}</div>
                        </div>
                      </div>
                      <div className="num mt-1 text-[11px] text-ink-3">revenire după: {formatDuration(m.outageHoursAfter * 60)}{m.dataLossHoursAfter ? ` · date pierdute: ${formatDuration(m.dataLossHoursAfter * 60)}` : ""}</div>
                    </li>
                  ))}
                </ul>
              )}
            </PCard>
          </div>
        </div>
      </div>
    </div>
  );
}
