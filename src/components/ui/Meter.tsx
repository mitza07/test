import { cn } from "@/lib/cn";

export function Meter({
  value,
  max = 100,
  tone = "accent",
  className,
  label,
  showValue = true,
}: {
  value: number;
  max?: number;
  tone?: "accent" | "good" | "warn" | "bad" | "auto";
  className?: string;
  label?: string;
  showValue?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const resolved = tone === "auto" ? (pct >= 85 ? "good" : pct >= 60 ? "warn" : "bad") : tone;
  const color = { accent: "bg-accent", good: "bg-good", warn: "bg-warn", bad: "bg-bad" }[resolved];
  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="text-ink-2">{label}</span>}
          {showValue && <span className="num text-ink">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
      >
        <div className={cn("h-full rounded-full transition-[width] duration-700", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
