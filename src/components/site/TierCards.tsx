import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { tiers } from "@/lib/pricing";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function TierCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {tiers.map((t) => (
        <div
          key={t.id}
          className={cn(
            "relative flex flex-col rounded-2xl border bg-surface p-6 shadow-card",
            t.recommended ? "border-accent ring-1 ring-accent" : "border-line",
          )}
        >
          {t.recommended && (
            <Badge tone="accent" className="absolute -top-3 left-6">
              Recomandat
            </Badge>
          )}
          <div className="text-lg font-semibold text-ink">{t.name}</div>
          <p className="mt-1 text-sm text-ink-2">{t.audience}</p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight text-ink">{t.pricePerPerson}</span>
            <span className="text-sm text-ink-2">lei / om / lună</span>
          </div>
          <div className="mt-1 text-xs text-ink-3">minim {t.minimumMonthly.toLocaleString("ro-RO")} lei/lună · fără contract minim · scade 3%/an</div>
          <dl className="num mt-5 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl bg-surface-2/70 p-3 text-xs">
            <dt className="text-ink-3">răspuns</dt>
            <dd className="text-ink">{t.responseMinutes} min · {t.coverage}</dd>
            <dt className="text-ink-3">revenire (RTO)</dt>
            <dd className="text-ink">{t.rtoHours} h</dd>
            <dt className="text-ink-3">date pierdute (RPO)</dt>
            <dd className="text-ink">{t.rpoHours < 1 ? `${t.rpoHours * 60} min` : `${t.rpoHours} h`}</dd>
            <dt className="text-ink-3">credit garanție</dt>
            <dd className="text-ink">{t.creditPct}% / încălcare</dd>
          </dl>
          {!compact && (
            <ul className="mt-5 space-y-2 text-sm text-ink-2">
              {t.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
                  {h}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto pt-6">
            <Button href={`/contact?subiect=oferta&plan=${t.id}`} variant={t.recommended ? "primary" : "secondary"} className="w-full">
              Cere ofertă — {t.name.replace("Nucleu ", "")} <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      <p className="text-xs text-ink-3 lg:col-span-3">
        Toate planurile includ toate capabilitățile. Diferă garanțiile și cât de aproape stăm de management.{" "}
        <Link href="/garantie" className="underline decoration-line-2 underline-offset-2 hover:text-ink">
          Vezi garanția completă
        </Link>
        .
      </p>
    </div>
  );
}
