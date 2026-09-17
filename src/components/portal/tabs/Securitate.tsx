"use client";

import { ShieldCheck, CircleDashed, CircleAlert } from "lucide-react";
import { PCard, PageTitle } from "../ui";
import { Gauge } from "@/components/charts/Gauge";
import { HBars } from "@/components/charts/HBars";
import { Badge } from "@/components/ui/Badge";
import { demoPosture } from "@/lib/demo/state";
import { cn } from "@/lib/cn";

export function Securitate() {
  const p = demoPosture;
  const partial = p.layers.flatMap((l) => l.controls).filter((c) => c.status !== "done");
  return (
    <div>
      <PageTitle title="Securitate" lead="Postura e un număr calculat zilnic din 20 de controale verificabile, pe 7 straturi. Fiecare control: dovadă, dată, metodă, și ce se întâmplă dacă lipsește." />
      <div className="grid gap-4 xl:grid-cols-3">
        <PCard title="Postura azi, 06:00">
          <div className="flex items-center gap-6">
            <Gauge value={p.score} size={140} label="postură" />
            <div className="text-sm text-ink-2">
              <div><span className="num font-medium text-ink">{p.layers.flatMap((l) => l.controls).filter((c) => c.status === "done").length}</span> controale complete</div>
              <div><span className="num font-medium text-ink">{partial.length}</span> parțiale, fiecare cu plan</div>
              <div><span className="num font-medium text-ink">0</span> lipsă</div>
              <div className="mt-2 text-xs text-ink-3">luna trecută: 86 · acum 6 luni: 41</div>
            </div>
          </div>
        </PCard>
        <PCard title="Pe straturi" className="xl:col-span-2">
          <HBars data={p.layers.map((l) => ({ label: l.name, value: l.score, display: `${l.score}%`, tone: l.score >= 85 ? "good" : l.score >= 60 ? "warn" : "bad", hint: l.description }))} max={100} labelWidth={120} />
        </PCard>
      </div>
      <PCard title="Controale parțiale · ce rămâne de făcut" className="mt-4" padded={false}>
        <ul className="divide-y divide-line">
          {partial.map((c) => (
            <li key={c.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-ink"><CircleDashed className="size-4 text-warn" /> {c.title} <Badge tone="warn">parțial</Badge></div>
                <div className="mt-1 pl-6 text-xs text-ink-2">{c.why}</div>
              </div>
              <div className="num pl-6 text-xs text-ink-3 sm:pl-0 sm:text-right">{c.evidence}</div>
            </li>
          ))}
        </ul>
      </PCard>
      <div className="mt-4 space-y-4">
        {p.layers.map((l) => (
          <PCard key={l.layer} title={`${l.name} · ${l.score}/100`} padded={false}>
            <ul className="divide-y divide-line">
              {l.controls.map((c) => {
                const Icon = c.status === "done" ? ShieldCheck : c.status === "partial" ? CircleDashed : CircleAlert;
                return (
                  <li key={c.id} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[1fr_auto]">
                    <div className="flex items-center gap-2 text-ink"><Icon className={cn("size-4", c.status === "done" ? "text-good" : c.status === "partial" ? "text-warn" : "text-bad")} /> {c.title}</div>
                    <div className="num text-xs text-ink-3">{c.evidence}</div>
                  </li>
                );
              })}
            </ul>
          </PCard>
        ))}
      </div>
    </div>
  );
}
