import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" className="fill-ink" />
      <circle cx="16" cy="16" r="9" className="stroke-bg" strokeWidth="1.5" fill="none" strokeDasharray="3 2.2" />
      <circle cx="16" cy="16" r="4" className="fill-accent" />
    </svg>
  );
}

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {withText && <span className="text-[17px] font-semibold tracking-tight text-ink">Nucleu</span>}
    </span>
  );
}
