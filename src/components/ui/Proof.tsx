import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

/** „Dovada” — elementul-semnătură Nucleu: fiecare afirmație are un ID, un moment și o metodă de verificare. */
export function Proof({
  id,
  title,
  when,
  method,
  value,
  className,
  compact = false,
}: {
  id: string;
  title: string;
  when: string;
  method: string;
  value?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-dashed border-line-2 bg-surface p-4",
        compact && "p-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-good">
            <ShieldCheck className="size-3.5" aria-hidden />
            Dovadă verificabilă
          </div>
          <div className={cn("mt-1 font-medium text-ink", compact ? "text-sm" : "text-base")}>{title}</div>
          {value && <div className={cn("num mt-1 text-ink", compact ? "text-lg" : "text-2xl")}>{value}</div>}
        </div>
        <code className="num shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-3">{id}</code>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-2">
        <dt className="text-ink-3">Când</dt>
        <dd className="num">{when}</dd>
        <dt className="text-ink-3">Metodă</dt>
        <dd>{method}</dd>
      </dl>
    </div>
  );
}
