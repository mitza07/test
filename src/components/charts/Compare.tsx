import { cn } from "@/lib/cn";

/**
 * Înainte → acum, pentru fiecare element: „dumbbell” cu o nuanță de accent pentru „acum”
 * și gri de de-accentuare pentru „înainte” (formă de emfază; legendă prezentă).
 */
export function Compare({
  rows,
  format,
  className,
  beforeLabel = "înainte",
  afterLabel = "acum",
}: {
  rows: { label: string; before: number; after: number }[];
  format: (v: number) => string;
  className?: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const max = Math.max(...rows.flatMap((r) => [r.before, r.after]), 1);
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-4 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ink-3/60" /> {beforeLabel}</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-accent" /> {afterLabel}</span>
      </div>
      {rows.map((r) => {
        const b = (r.before / max) * 100;
        const a = (r.after / max) * 100;
        return (
          <div key={r.label} className="grid grid-cols-[minmax(120px,1fr)_2fr_auto] items-center gap-3 text-sm">
            <div className="truncate text-ink-2">{r.label}</div>
            <div className="relative h-6">
              <div className="absolute inset-y-0 left-0 my-auto h-[2px] bg-line-2" style={{ width: `${Math.max(a, b)}%` }} />
              <span className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-ink-3/60 ring-2 ring-surface" style={{ left: `calc(${b}% - 5px)` }} title={`${beforeLabel}: ${format(r.before)}`} />
              <span className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface" style={{ left: `calc(${a}% - 6px)` }} title={`${afterLabel}: ${format(r.after)}`} />
            </div>
            <div className="num whitespace-nowrap text-right text-ink">
              <span className="text-ink-3 line-through decoration-ink-3/50">{format(r.before)}</span>
              <span className="mx-1.5 text-ink-3">→</span>
              {format(r.after)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
