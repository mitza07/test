"use client";

import { Wand2 } from "lucide-react";
import { usePortal } from "../context";
import { PCard, PTable, PageTitle, PStat } from "../ui";
import { Compare } from "@/components/charts/Compare";
import { Badge } from "@/components/ui/Badge";
import { demoRisk } from "@/lib/demo/state";
import { layerLabels } from "@/lib/twin";
import { formatLei, formatPercent } from "@/lib/format";

export function Risc() {
  const { simulate, horizon } = usePortal();
  const r = demoRisk;
  return (
    <div>
      <PageTitle title="Registrul de risc" lead="Pierdere anuală așteptată = probabilitate × impact. Impactul vine din simularea scenariului pe geamăn; probabilitatea, din controalele active. Ipotezele sunt editabile la revizuirea lunară.">
        <Badge mono>lei / an</Badge>
      </PageTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <PStat label="La onboarding (martie)" value={formatLei(r.totalBefore)} hint="înainte de orice control" />
        <PStat label="Acum" value={horizon === "2126" ? formatLei(1_900) : formatLei(r.totalNow)} tone="good" hint={horizon === "2126" ? "restul e asigurat automat" : `−${Math.round(r.reductionPct)}% · riscul rămas e acceptat de management`} />
        <PStat label="Cel mai mare risc rămas" value={r.lines[0].title} hint={`${formatLei(r.lines[0].ealNow)} / an · ${layerLabels[r.lines[0].layer].name}`} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <PCard title="Înainte → acum, pe scenariu" className="xl:col-span-1">
          <Compare rows={r.lines.map((l) => ({ label: l.title, before: l.ealBefore, after: l.ealNow }))} format={(v) => formatLei(v)} beforeLabel="onboarding" afterLabel="acum" />
        </PCard>
        <PCard title="Registrul complet" className="xl:col-span-2" padded={false}>
          <PTable
            head={["Scenariu", "Strat", "Probabilitate / an", "Impact", "Pierdere așteptată", "Controale", ""]}
            rows={r.lines.map((l) => [
              <span key="t" className="font-medium">{l.title}</span>,
              layerLabels[l.layer].name,
              <span key="p" className="num">{formatPercent(l.pNow * 100)} <span className="text-ink-3">(era {formatPercent(l.pBefore * 100)})</span></span>,
              <span key="i" className="num">{formatLei(l.impactNow)}</span>,
              <span key="e" className="num font-medium text-ink">{formatLei(l.ealNow)}</span>,
              <ul key="c" className="text-xs">{l.controls.map((c) => <li key={c} className={c.startsWith("(deschis)") ? "text-warn" : ""}>· {c}</li>)}</ul>,
              l.fixedImpact ? <span key="s" className="text-xs text-ink-3">impact fix</span> : <button key="s" type="button" onClick={() => simulate(l.nodeId, l.mode)} className="inline-flex items-center gap-1 text-xs text-accent-ink"><Wand2 className="size-3" /> simulează</button>,
            ])}
          />
        </PCard>
      </div>
      <PCard title="Ipoteze (editabile la revizuire)" className="mt-4">
        <ul className="grid gap-2 text-sm text-ink-2 sm:grid-cols-2">
          <li>· Cost complet orar per angajat: 95 lei; productivitate fără sisteme: 30%</li>
          <li>· Venit anual 18,5 mil. lei; 55% depinde direct de IT; 35% din venitul întârziat se pierde definitiv</li>
          <li>· Costul unui incident cu date: 2.500 lei + 900 lei × sensibilitatea datelor (4/5)</li>
          <li>· Plată medie deturnabilă prin fraudă: 60.000 lei (impact fix)</li>
          <li>· Probabilitățile „înainte” sunt medii de sector; cele „acum” scad proporțional cu controalele verificate</li>
          <li>· Riscul nu e niciodată zero: cifrele reziduale sunt cele pe care managementul le-a acceptat în scris</li>
        </ul>
      </PCard>
    </div>
  );
}
