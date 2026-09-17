import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { FaqList } from "@/components/site/FaqList";
import { CaseCard } from "@/components/site/CaseCard";
import { CtaBand } from "@/components/site/CtaBand";
import { segments, getSegment } from "@/lib/content/segments";
import { getCase } from "@/lib/content/cases";

export function generateStaticParams() {
  return segments.map((s) => ({ segment: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/pentru/[segment]">): Promise<Metadata> {
  const { segment } = await params;
  const s = getSegment(segment);
  return s ? { title: `Pentru ${s.name.toLowerCase()} — ${s.headline}`, description: s.lead } : {};
}

export default async function SegmentPage({ params }: PageProps<"/pentru/[segment]">) {
  const { segment } = await params;
  const s = getSegment(segment);
  if (!s) notFound();
  const c = s.caseSlug ? getCase(s.caseSlug) : undefined;
  return (
    <>
      <section className="border-b border-line bg-surface-2/60">
        <Container className="py-16 sm:py-24">
          <Eyebrow className="mb-4">Pentru {s.name.toLowerCase()}</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">{s.headline}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">{s.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/contact?subiect=apel">Programează un apel de 20 de minute <ArrowRight className="size-4" /></Button>
            <Button href="/instrumente/audit-it" variant="secondary">Audit gratuit în 15 minute</Button>
          </div>
          <nav className="mt-8 flex flex-wrap gap-2 text-xs" aria-label="Alte segmente">
            {segments.filter((x) => x.slug !== s.slug).map((x) => (
              <Link key={x.slug} href={`/pentru/${x.slug}`} className="rounded-full border border-line bg-surface px-3 py-1 text-ink-2 hover:text-ink">{x.name}</Link>
            ))}
          </nav>
        </Container>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Ce se întâmplă acum" title="Problemele care revin." />
            <ul className="mt-8 space-y-3">
              {s.pains.map((p) => (
                <li key={p.title} className="rounded-2xl border border-line bg-surface p-5">
                  <div className="text-base font-semibold text-ink">{p.title}</div>
                  <p className="mt-1 text-sm text-ink-2">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeading eyebrow="Ce facem" title="Răspunsul Nucleu." />
            <ul className="mt-8 space-y-3">
              {s.answers.map((a) => (
                <li key={a.title} className="rounded-2xl border border-accent/30 bg-accent-soft/30 p-5">
                  <div className="text-base font-semibold text-ink">{a.title}</div>
                  <p className="mt-1 text-sm text-ink-2">{a.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading eyebrow="Ofertă" title="Prețuri publicate, fără surprize." />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {s.offer.map((o) => (
            <div key={o.title} className="rounded-2xl border border-line bg-surface p-5">
              <div className="text-base font-semibold text-ink">{o.title}</div>
              <div className="num mt-2 text-xl text-accent-ink">{o.price}</div>
              <p className="mt-2 text-sm text-ink-2">{o.detail}</p>
            </div>
          ))}
        </div>
        <ol className="mt-8 grid gap-3 md:grid-cols-3">
          {s.steps.map((st, i) => (
            <li key={st} className="flex gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
              <span className="num shrink-0 text-ink-3">0{i + 1}</span>
              {st}
            </li>
          ))}
        </ol>
      </Section>

      {c && (
        <Section>
          <SectionHeading eyebrow="Dovadă" title="Un scenariu din domeniul tău." />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <CaseCard c={c} />
          </div>
        </Section>
      )}

      <Section tone="muted">
        <SectionHeading eyebrow="Întrebări" title="Ce ne întreabă cei ca tine." />
        <div className="mt-8 max-w-3xl">
          <FaqList items={s.faq} />
        </div>
      </Section>
      <CtaBand title="Un apel de 20 de minute. Fără prezentări, fără slide-uri." lead="Îți spunem exact ce am face în primele 30 de zile și cât ar costa. Dacă nu are sens, îți spunem și asta." primary={{ href: "/contact?subiect=apel", label: "Programează apelul" }} secondary={{ href: "/preturi", label: "Vezi prețurile" }} />
    </>
  );
}
