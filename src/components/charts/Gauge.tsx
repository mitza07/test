import { cn } from "@/lib/cn";

/** Scor 0–100 ca arc; culoarea urmează severitatea; cifra e text (font sans), nu culoare. */
export function Gauge({ value, size = 120, label, className }: { value: number; size?: number; label?: string; className?: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct >= 85 ? "var(--good)" : pct >= 60 ? "var(--warn)" : "var(--bad)";
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${label ?? "Scor"}: ${pct} din 100`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-semibold tracking-tight text-ink">{Math.round(pct)}</div>
        {label && <div className="text-[10px] uppercase tracking-wider text-ink-3">{label}</div>}
      </div>
    </div>
  );
}
