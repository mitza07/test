import { cn } from "@/lib/cn";

export interface HBarDatum {
  label: string;
  value: number;
  /** Text afișat la vârf; implicit valoarea. */
  display?: string;
  tone?: "accent" | "good" | "warn" | "bad" | "muted" | "series-1" | "series-2";
  hint?: string;
}

const tones = {
  accent: "var(--accent)",
  good: "var(--good)",
  warn: "var(--warn)",
  bad: "var(--bad)",
  muted: "var(--ink-3)",
  "series-1": "var(--series-1)",
  "series-2": "var(--series-2)",
};

/** Bare orizontale: ≤ 24px grosime, capăt rotunjit 4px, valoare la vârf, o singură nuanță implicit. */
export function HBars({
  data,
  max,
  className,
  thickness = 14,
  labelWidth = 160,
}: {
  data: HBarDatum[];
  max?: number;
  className?: string;
  thickness?: number;
  labelWidth?: number;
}) {
  const m = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("space-y-2.5", className)} role="table" aria-label="Valori comparate">
      {data.map((d) => {
        const pct = Math.max(0, Math.min(100, (d.value / m) * 100));
        return (
          <div key={d.label} className="grid items-center gap-3" style={{ gridTemplateColumns: `${labelWidth}px 1fr auto` }} role="row" title={d.hint}>
            <div className="truncate text-sm text-ink-2" role="cell">
              {d.label}
            </div>
            <div className="relative h-6" role="cell">
              <div
                className="absolute inset-y-0 my-auto rounded-r-[4px]"
                style={{ width: `${pct}%`, height: thickness, background: tones[d.tone ?? "accent"] }}
              />
            </div>
            <div className="num text-sm text-ink" role="cell">
              {d.display ?? d.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
