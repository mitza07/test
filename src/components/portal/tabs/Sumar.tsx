"use client";

import { ArrowRight, Bot, ShieldCheck, Sparkles } from "lucide-react";
import { usePortal } from "../context";
import { PCard, PStat, PageTitle } from "../ui";
import { Sparkline } from "@/components/charts/Sparkline";
import { UptimeStrip } from "@/components/charts/UptimeStrip";
import { Proof } from "@/components/ui/Proof";
import { Badge } from "@/components/ui/Badge";
import { demoRisk, demoPosture, dayStatus30, humanHoursByMonth, riskByMonth, autoActionsByWeek, restoreProof, journal, intents, tickets } from "@/lib/demo/state";
import { formatLei, formatDateTime } from "@/lib/format";
import { demoTwin } from "@/lib/twin";

export function Sumar() {
  const { horizon, setTab, simulate } = usePortal();
  const future = horizon === "2126";
  const openTickets = tickets.filter((t) => !t.status.startsWith("rezolvat")).length;

  return (
    <div>
      <PageTitle title={future ? "Sumar · orizont 2126" : `Bună dimineața. Totul e sub control.`} lead={future ? "Infrastructura se administrează, se verifică și se asigură singură. Ce rămâne de decis, decizi tu." : `${demoTwin.company.name} · ${demoTwin.business.people} oameni · 2 locații · plan ${demoTwin.company.plan}`}>
        <Badge tone="good"><ShieldCheck className="size-3" /> 0 incidente deschise</Badge>
        <Badge>{openTickets} solicitări active</Badge>
      </PageTitle>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PStat label="Risc rezidual anual" value={future ? formatLei(1_900) : formatLei(demoRisk.totalNow)} hint={future ? "asigurat automat; prima de risc inclusă în preț" : `de la ${formatLei(demoRisk.totalBefore)} la onboarding · −${Math.round(demoRisk.reductionPct)}%`} />
        <PStat label="Postură de securitate" value={future ? "99/100" : `${demoPosture.score}/100`} hint={future ? "atestată continuu de un terț independent" : "7 straturi · 20 controale · recalculată azi 06:00"} />
        <PStat label="Ore umane luna aceasta" value={future ? "0,2 h" : `${humanHoursByMonth.values.at(-1)!.toLocaleString("ro-RO")} h`} hint={future ? "o decizie de management, 12 minute" : `în scădere de la ${humanHoursByMonth.values[0].toLocaleString("ro-RO")} h în martie`} tone="good" />
        <PStat label="Acțiuni automate · săptămâna" value={future ? "1.284" : String(autoActionsByWeek.at(-1))} hint={future ? "fiecare cu explicație și dovadă" : "remedieri, verificări, dovezi generate"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <PCard title="Risc în lei · 7 luni" className="lg:col-span-1">
          <Sparkline data={riskByMonth.values} labels={riskByMonth.labels} width={320} height={90} suffix=" lei" tone="accent" className="w-full" />
          <div className="mt-2 flex justify-between text-xs text-ink-3"><span>{riskByMonth.labels[0]}</span><span>{riskByMonth.labels.at(-1)}</span></div>
        </PCard>
        <PCard title="Ore umane · 7 luni">
          <Sparkline data={humanHoursByMonth.values} labels={humanHoursByMonth.labels} width={320} height={90} suffix=" h" decimals={1} tone="good" className="w-full" />
          <div className="mt-2 flex justify-between text-xs text-ink-3"><span>{humanHoursByMonth.labels[0]}</span><span>{humanHoursByMonth.labels.at(-1)}</span></div>
        </PCard>
        <PCard title="Uptime servicii critice · 30 zile · 99,98%">
          <UptimeStrip days={dayStatus30} />
          <p className="mt-3 text-xs text-ink-2">Un incident minor pe 18 aug (imprimare, 41 min), rezolvat automat.</p>
        </PCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <PCard title="Ultimele acțiuni" action={<button type="button" onClick={() => setTab("jurnal")} className="inline-flex items-center gap-1 text-xs text-accent-ink">Jurnal complet <ArrowRight className="size-3" /></button>} padded={false}>
            <ul className="divide-y divide-line">
              {(future
                ? [
                    { at: "2126-09-17T09:58:00+03:00", actor: "auto" as const, kind: "remediere" as const, title: "Capacitate realocată preventiv: 3 servicii mutate înainte de un vârf estimat", why: "Semnal slab detectat cu 40 de minute înainte; mutare fără întrerupere; dovadă atestată.", duration: "0,8 s" },
                    { at: "2126-09-17T09:31:00+03:00", actor: "auto" as const, kind: "securitate" as const, title: "Politică de acces regenerată: un colaborator nou, 14 permisiuni derivate din rol", why: "Nicio permisiune manuală; expiră automat la finalul contractului.", duration: "0,3 s" },
                    { at: "2126-09-17T08:40:00+03:00", actor: "client" as const, kind: "intenție" as const, title: "Decizie de management: apetit de risc redus la 1.500 lei/an", why: "Sistemul a recalculat garanțiile și prima; diferența: +40 lei/lună.", duration: "12 min" },
                  ]
                : journal.slice(0, 5)
              ).map((j) => (
                <li key={j.at + j.title} className="flex gap-3 px-4 py-3">
                  <div className="mt-0.5">{j.actor === "auto" ? <Bot className="size-4 text-accent-ink" /> : j.actor === "client" ? <Sparkles className="size-4 text-warn" /> : <ShieldCheck className="size-4 text-good" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink">{j.title}</div>
                    <div className="mt-0.5 text-xs text-ink-2">{j.why}</div>
                  </div>
                  <div className="num shrink-0 text-right text-[11px] text-ink-3">
                    <div>{formatDateTime(j.at)}</div>
                    {j.duration && <div>{j.duration}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </PCard>
          <PCard title="Intenții în curs" action={<button type="button" onClick={() => setTab("intentii")} className="inline-flex items-center gap-1 text-xs text-accent-ink">Toate <ArrowRight className="size-3" /></button>} padded={false}>
            <ul className="divide-y divide-line">
              {intents.map((i) => {
                const done = i.steps.filter((s) => s.done).length;
                return (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink">{i.title}</div>
                      <div className="num text-xs text-ink-3">{i.id} · {i.status}</div>
                    </div>
                    <div className="w-32">
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent" style={{ width: `${(done / i.steps.length) * 100}%` }} /></div>
                      <div className="num mt-1 text-right text-[11px] text-ink-3">{done}/{i.steps.length} pași</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </PCard>
        </div>
        <div className="space-y-4">
          <Proof id={restoreProof.id} title={restoreProof.title} value={restoreProof.value} when={restoreProof.when} method={restoreProof.method} />
          <PCard title="Decizii cerute managementului">
            <ul className="space-y-3 text-sm">
              <li className="rounded-xl border border-warn/40 bg-warn-soft/40 p-3">
                <div className="font-medium text-ink">Legătură de rezervă la depozit</div>
                <div className="mt-1 text-xs text-ink-2">150 lei/lună elimină ≈ 7.400 lei/an risc. Vezi simularea.</div>
                <button type="button" onClick={() => simulate("net-wan-dep", "outage")} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-ink">Simulează căderea fibrei <ArrowRight className="size-3" /></button>
              </li>
              <li className="rounded-xl border border-line p-3">
                <div className="font-medium text-ink">DMARC: trecere la „reject”</div>
                <div className="mt-1 text-xs text-ink-2">45 de zile de rapoarte curate. Recomandăm activarea marți, 06:00. Fără impact așteptat.</div>
              </li>
            </ul>
          </PCard>
        </div>
      </div>
    </div>
  );
}
