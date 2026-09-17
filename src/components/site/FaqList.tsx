import { ChevronDown } from "lucide-react";
import type { Faq } from "@/lib/content/faq";

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-4 open:bg-surface-2/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink marker:hidden">
            {f.q}
            <ChevronDown className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
