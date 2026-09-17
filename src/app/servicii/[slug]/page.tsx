import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CtaBand } from "@/components/site/CtaBand";
import { CapabilityCard } from "@/components/site/CapabilityCard";
import { capabilities, getCapability } from "@/lib/content/services";

export function generateStaticParams() {
  return capabilities.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/servicii/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = getCapability(slug);
  if (!c) return {};
  return { title: c.name, description: c.tagline };
}

const toolNames: Record<string, string> = {
  parole: "Verificator de parole",
  simulator: "Simulator „ce se întâmplă dacă”",
  "risc-backup": "Calculator risc backup",
  email: "Verificare e-mail",
  phishing: "Quiz anti-phishing",
  web: "Igienă web",
  "audit-it": "Audit IT în 15 minute",
  "cost-downtime": "Costul nefuncționării",
  calculator: "Calculator de preț",
};

export default async function CapabilityPage({ params }: PageProps<"/servicii/[slug]">) {
  const { slug } = await params;
  const c = getCapability(slug);
  if (!c) notFound();
  const others = capabilities.filter((x) => x.slug !== c.slug).slice(0, 3);

  return (
    <>
      <section className="border-b border-line bg-surface-2/60">
        <Container className="py-16 sm:py-20">
          <Link href="/servicii" className="text-sm text-ink-2 hover:text-ink">← Toate capabilitățile</Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="flex flex-wrap gap-1.5">
                {c.tags.map((t) => (
                  <Badge key={t} mono>{t}</Badge>
                ))}
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">{c.name}</h1>
              <p className="mt-4 text-xl leading-relaxed text-ink-2">{c.tagline}</p>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2">{c.summary}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/instrumente/audit-it">Audit gratuit <ArrowRight className="size-4" /></Button>
                <Button href="/portal" variant="secondary">Vezi în portalul demo</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 self-start">
              {c.kpis.map((k) => (
                <div key={k.label} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="num text-xl font-semibold text-ink">{k.value}</div>
                  <div className="mt-1 text-xs text-ink-3">{k.label}</div>
                </div>
              ))}
              <p className="col-span-3 text-xs text-ink-3">Valori din firma demonstrativă. Ale tale sunt măsurate din prima lună.</p>
            </div>
          </div>
        </Container>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-3">
          <div>
            <Eyebrow className="mb-3">Problema</Eyebrow>
            <ul className="space-y-3">
              {c.problems.map((p) => (
                <li key={p} className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <Eyebrow className="mb-3">Ce include</Eyebrow>
            <ul className="space-y-2.5">
              {c.included.map((i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-2"><Check className="mt-0.5 size-4 shrink-0 text-good" /> {i}</li>
              ))}
            </ul>
          </div>
          <div>
            <Eyebrow className="mb-3">Dovezi lunare</Eyebrow>
            <ul className="space-y-2.5">
              {c.proofs.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-ink-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-ink" /> {p}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <div className="num text-xs text-ink-3">2026</div>
            <h2 className="mt-2 text-lg font-semibold text-ink">Ce facem azi</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{c.now}</p>
          </div>
          <div className="rounded-2xl border border-accent/40 bg-accent-soft/40 p-6">
            <div className="num text-xs text-ink-3">2126</div>
            <h2 className="mt-2 text-lg font-semibold text-ink">Încotro mergem</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{c.future}</p>
            <Link href="/manifest" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent-ink">Manifestul 2126 <ArrowRight className="size-4" /></Link>
          </div>
        </div>
        {c.tools && c.tools.length > 0 && (
          <div className="mt-8">
            <Eyebrow className="mb-3">Instrumente gratuite legate</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {c.tools.map((t) => (
                <Button key={t} href={`/instrumente/${t}`} variant="secondary" size="sm">{toolNames[t] ?? t} <ArrowRight className="size-3.5" /></Button>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section>
        <SectionHeading eyebrow="Alte capabilități" title="Totul e inclus. Iată încă trei." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {others.map((o) => (
            <CapabilityCard key={o.slug} c={o} />
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
