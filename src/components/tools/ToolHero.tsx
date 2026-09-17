import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Section";

/** Antetul comun al paginilor de instrumente: drum înapoi, categorie, titlu, explicație. */
export function ToolHero({
  category,
  title,
  lead,
  children,
}: {
  category: string;
  title: React.ReactNode;
  lead: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-line bg-surface-2/60">
      <Container className="py-12 sm:py-20">
        <Link href="/instrumente" className="no-print inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Toate instrumentele
        </Link>
        <Eyebrow className="mt-8 mb-4">Instrumente gratuite · {category}</Eyebrow>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">{lead}</p>
        {children}
      </Container>
    </section>
  );
}
