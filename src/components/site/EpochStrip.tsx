import { epochs } from "@/lib/content/manifest";
import { cn } from "@/lib/cn";

export function EpochStrip({ activeYear }: { activeYear?: string }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-5">
      {epochs.map((e, i) => (
        <li key={e.year} className={cn("relative rounded-xl border p-4", e.year === activeYear ? "border-accent bg-accent-soft/50" : "border-line bg-surface")}>
          <div className="num text-xs text-ink-3">{i === 0 ? "acum" : `+${Number(e.year) - 2026} ani`}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-ink">{e.year}</div>
          <div className="mt-1 text-sm font-medium text-ink">{e.title}</div>
        </li>
      ))}
    </ol>
  );
}
