import { Sparkline } from "@/components/charts/Sparkline";
import { UptimeStrip } from "@/components/charts/UptimeStrip";
import { Badge } from "@/components/ui/Badge";
import { demoPosture, demoRisk, dayStatus30, humanHoursByMonth, restoreProof } from "@/lib/demo/state";
import { formatLei } from "@/lib/format";
import { demoTwin } from "@/lib/twin";

export function ConsolePreview() {
  return (
    <div className="relative rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="live-dot" aria-hidden />
          <span className="font-medium text-ink">Nucleu Console</span>
          <span className="text-ink-3">· {demoTwin.company.name}</span>
        </div>
        <Badge mono>demo · date fictive</Badge>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-2/70 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Risc rezidual</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-ink">{formatLei(demoRisk.totalNow)}<span className="text-base font-normal text-ink-3">/an</span></div>
          <div className="mt-1 text-xs text-ink-2">
            de la {formatLei(demoRisk.totalBefore)} la onboarding · <span className="num text-good">−{Math.round(demoRisk.reductionPct)}%</span>
          </div>
        </div>
        <div className="rounded-xl bg-surface-2/70 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Postură de securitate</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-ink">{demoPosture.score}<span className="text-base font-normal text-ink-3">/100</span></div>
          <div className="mt-1 text-xs text-ink-2">7 straturi · 20 controale · 4 parțiale</div>
        </div>
        <div className="rounded-xl bg-surface-2/70 p-4 sm:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Ultima restaurare demonstrată</div>
            <code className="num text-[10px] text-ink-3">{restoreProof.id}</code>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <div className="num text-2xl font-semibold text-ink">{restoreProof.value}</div>
            <div className="text-xs text-ink-2">ERP complet · {restoreProof.when}</div>
          </div>
        </div>
        <div className="rounded-xl bg-surface-2/70 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Ore umane / lună</div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div className="num text-2xl font-semibold text-ink">{humanHoursByMonth.values.at(-1)!.toLocaleString("ro-RO")} h</div>
            <Sparkline data={humanHoursByMonth.values} labels={humanHoursByMonth.labels} width={120} height={40} tone="accent" suffix=" h" decimals={1} />
          </div>
        </div>
        <div className="rounded-xl bg-surface-2/70 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Uptime 30 zile · 99,98%</div>
          <UptimeStrip days={dayStatus30} className="mt-2" />
        </div>
      </div>
    </div>
  );
}
