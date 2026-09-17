import { cn } from "@/lib/cn";

export type DayStatus = "ok" | "warn" | "bad" | "none";

/** Bandă de 30/90 de zile; stare = culoare + legendă + tooltip (niciodată culoare singură). */
export function UptimeStrip({
  days,
  className,
  labels,
}: {
  days: DayStatus[];
  className?: string;
  labels?: string[];
}) {
  const cls: Record<DayStatus, string> = {
    ok: "bg-good",
    warn: "bg-warn",
    bad: "bg-bad",
    none: "bg-surface-3",
  };
  const text: Record<DayStatus, string> = { ok: "operațional", warn: "degradat", bad: "incident", none: "fără date" };
  return (
    <div className={className}>
      <div className="flex gap-[3px]" role="img" aria-label={`Ultimele ${days.length} zile: ${days.filter((d) => d === "ok").length} zile operaționale`}>
        {days.map((d, i) => (
          <span
            key={i}
            title={`${labels?.[i] ?? `Ziua ${i + 1}`}: ${text[d]}`}
            className={cn("h-7 flex-1 rounded-[2px] min-w-[3px]", cls[d])}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-good" /> operațional</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-warn" /> degradat</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-bad" /> incident</span>
      </div>
    </div>
  );
}
