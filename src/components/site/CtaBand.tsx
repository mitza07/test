import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function CtaBand({
  title = "Vezi riscul firmei tale în lei, în 15 minute.",
  lead = "Auditul e gratuit, online, fără cont. Primești un scor pe 7 straturi, riscul anual estimat și primele trei acțiuni, cu economia fiecăreia.",
  primary = { href: "/instrumente/audit-it", label: "Începe auditul gratuit" },
  secondary = { href: "/contact", label: "Vorbește cu un om" },
}: {
  title?: string;
  lead?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-14 text-bg sm:px-12 sm:py-20">
          <div className="grid-paper pointer-events-none absolute inset-0 opacity-20" aria-hidden />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
            <p className="mt-4 text-base leading-relaxed text-bg/75 sm:text-lg">{lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={primary.href} size="lg" variant="inverse">
                {primary.label} <ArrowRight className="size-4" />
              </Button>
              <Button href={secondary.href} size="lg" variant="inverse-ghost">
                {secondary.label}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
