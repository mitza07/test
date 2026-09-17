import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Proof } from "@/components/ui/Proof";
import { Compare } from "@/components/charts/Compare";
import { CaseCard } from "@/components/site/CaseCard";
import { CtaBand } from "@/components/site/CtaBand";
import { caseStudies, getCase } from "@/lib/content/cases";
import { formatLei, proofId } from "@/lib/format";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/studii-de-caz/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = getCase(slug);
  return c ? { title: `${c.title} — ${c.sector}`, description: c.problem } : {};
}

export default async function CasePage({ params }: PageProps<"/studii-de-caz/[slug]">) {
  const { slug } = await params;
  const c = getCase(slug);
  if (!c) notFound();
  const others = caseStudies.filter((x) => x.slug !== c.slug).slice(0, 3);
  return (
    <>
      <section className="border-b border-line bg-surface-2/60">
        <Container className="py-16 sm:py-20">
          <Link href="/studii-de-caz" className="text-sm text-ink-2 hover:text-ink">← Toate scenariile</Link>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Badge>{c.sector}</Badge>
            <span className="num text-xs text-ink-3">{c.size}</span>
            <Badge mono>scenariu anonimizat</Badge>
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">{c.title}</h1>
        </Container>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-10">
            <div>
              <Eyebrow className="mb-3">Problema</Eyebrow>
              <p className="text-[17px] leading-relaxed text-ink-2">{c.problem}</p>
            </div>
            <div>
              <Eyebrow className="mb-3">Intervenția</Eyebrow>
              <ul className="space-y-2.5">
                {c.intervention.map((i) => (
                  <li key={i} className="flex gap-2 text-[15px] text-ink-2"><Check className="mt-1 size-4 shrink-0 text-good" /> {i}</li>
                ))}
              </ul>
            </div>
            <div>
              <Eyebrow className="mb-3">Rezultatul</Eyebrow>
              <p className="text-[17px] leading-relaxed text-ink">{c.result}</p>
            </div>
            {c.quote && (
              <blockquote className="rounded-2xl border-l-4 border-accent bg-surface-2/60 p-5">
                <p className="text-[17px] italic leading-relaxed text-ink">„{c.quote.text}”</p>
                <footer className="mt-2 text-sm text-ink-3">— {c.quote.role}</footer>
              </blockquote>
            )}
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
              <div className="text-sm font-medium text-ink">Riscul anual estimat</div>
              <div className="mt-4">
                <Compare rows={[{ label: "pierdere anuală așteptată", before: c.riskBefore, after: c.riskAfter }]} format={(v) => formatLei(v)} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-surface-2/70 p-3">
                  <div className="text-ink-3">reducere</div>
                  <div className="num text-lg text-good">−{Math.round((1 - c.riskAfter / c.riskBefore) * 100)}%</div>
                </div>
                <div className="rounded-xl bg-surface-2/70 p-3">
                  <div className="text-ink-3">în</div>
                  <div className="num text-lg text-ink">{c.days} zile</div>
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-3">Estimări din registrul de risc al clientului: probabilitate × impact, cu ipotezele documentate în portal.</p>
            </div>
            <Proof id={proofId(c.slug, "2026-08-30", 12)} title={c.proof.title} value={c.proof.value} when="ultimul exercițiu lunar" method={c.proof.method} />
          </aside>
        </div>
      </Section>

      <Section tone="muted">
        <Eyebrow className="mb-6">Alte scenarii</Eyebrow>
        <div className="grid gap-4 md:grid-cols-3">
          {others.map((o) => (
            <CaseCard key={o.slug} c={o} />
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
