import { cn } from "@/lib/cn";

export function Stat({
  label,
  value,
  hint,
  delta,
  deltaTone = "good",
  className,
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: string;
  deltaTone?: "good" | "bad" | "neutral";
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const tone = { good: "text-good", bad: "text-bad", neutral: "text-ink-3" }[deltaTone];
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="text-xs font-medium uppercase tracking-wider text-ink-3">{label}</div>
      <div className="flex items-baseline gap-2">
        <div
          className={cn(
            "font-semibold tracking-tight text-ink",
            size === "sm" && "text-xl",
            size === "md" && "text-3xl",
            size === "lg" && "text-5xl",
          )}
        >
          {value}
        </div>
        {delta && <div className={cn("num text-xs", tone)}>{delta}</div>}
      </div>
      {hint && <div className="text-sm text-ink-2">{hint}</div>}
    </div>
  );
}
