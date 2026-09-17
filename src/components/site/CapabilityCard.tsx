import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Capability } from "@/lib/content/services";

export function CapabilityCard({ c }: { c: Capability }) {
  return (
    <Link
      href={`/servicii/${c.slug}`}
      className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg"
    >
      <h3 className="text-base font-semibold text-ink">{c.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{c.tagline}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {c.tags.slice(0, 3).map((t) => (
          <span key={t} className="num rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-3">
            {t}
          </span>
        ))}
      </div>
      <div className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-ink">
        Detalii <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
