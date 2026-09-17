import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CaseStudy } from "@/lib/content/cases";
import { formatLei } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export function CaseCard({ c }: { c: CaseStudy }) {
  const reduction = Math.round((1 - c.riskAfter / c.riskBefore) * 100);
  return (
    <Link
      href={`/studii-de-caz/${c.slug}`}
      className="group flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge>{c.sector}</Badge>
        <span className="num text-xs text-ink-3">{c.size}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-snug text-ink">{c.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm text-ink-2">{c.problem}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-surface-2/70 p-3 text-xs">
        <div>
          <div className="text-ink-3">risc anual</div>
          <div className="num text-ink">
            <span className="text-ink-3 line-through">{formatLei(c.riskBefore)}</span> → {formatLei(c.riskAfter)}
          </div>
        </div>
        <div>
          <div className="text-ink-3">în {c.days} de zile</div>
          <div className="num text-good">−{reduction}%</div>
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-ink">
        Citește dovada <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
