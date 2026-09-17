import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Section";

const legalNav = [
  { href: "/legal/clauza-de-divort", label: "Clauza de divorț" },
  { href: "/legal/termeni", label: "Termeni și condiții" },
  { href: "/legal/confidentialitate", label: "Confidențialitate" },
  { href: "/legal/cookies", label: "Cookie-uri" },
];

export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro?: string; children: React.ReactNode }) {
  return (
    <Container className="py-16 sm:py-20">
      <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav className="lg:sticky lg:top-24 lg:self-start" aria-label="Legal">
          <Eyebrow className="mb-3">Legal</Eyebrow>
          <ul className="space-y-1.5 text-sm">
            {legalNav.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-ink-2 hover:text-ink">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
          <p className="num mt-2 text-xs text-ink-3">ultima actualizare: {updated}</p>
          {intro && <p className="mt-6 text-lg leading-relaxed text-ink-2">{intro}</p>}
          <div className="prose-nucleu mt-8 space-y-6 text-[15px] leading-relaxed text-ink-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_strong]:text-ink">
            {children}
          </div>
        </article>
      </div>
    </Container>
  );
}
