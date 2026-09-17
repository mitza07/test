import type { Metadata } from "next";
import { ArrowRight, ShieldCheck, CircleDashed, CircleAlert } from "lucide-react";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Gauge } from "@/components/charts/Gauge";
import { CtaBand } from "@/components/site/CtaBand";
import { demoPosture } from "@/lib/demo/state";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Securitate măsurată — 7 straturi, un scor zilnic, fiecare lipsă în lei",
  description: "Fără teatru, fără frică. Postura de securitate calculată zilnic din controale verificabile: identitate, dispozitive, rețea, e-mail, backup, monitorizare, răspuns.",
};

const monthly = [
  "Acoperire MFA pe toate conturile (zilnic, nu lunar)",
  "Patch-uri pe stații și servere sub 14 zile",
  "Fiecare regulă de firewall are un motiv și un proprietar",
  "SPF, DKIM, DMARC verificate și rapoartele citite",
  "Restaurare demonstrată din backup, cu durata consemnată",
  "Conturi privilegiate revizuite",
  "Certificate, domenii, garanții, licențe: registru de expirări",
  "Zero accese ale foștilor angajați (HR ↔ directorul de identități)",
  "Simulare de phishing și instruire de 10 minute (trimestrial)",
  "Exercițiu de incident cu managementul (trimestrial)",
];

export default function SecuritatePage() {
  const p = demoPosture;
  return (
    <>
      <section className="border-b border-line bg-surface-2/60">
        <Container className="py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <Eyebrow className="mb-4">Securitate</Eyebrow>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
                Securitate fără teatru. <span className="text-accent-ink">Control, nu frică.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
                Nu vindem frică și nu promitem invulnerabilitate. Construim control măsurabil: știi cine are acces la ce, ce se
                întâmplă când ceva cade și cât durează revenirea. Postura e un număr calculat zilnic din controale verificabile,
                iar fiecare control lipsă are un cost estimat în lei, ca să decizi tu ce merită.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/instrumente/audit-it">Măsoară postura firmei tale <ArrowRight className="size-4" /></Button>
                <Button href="/portal?tab=securitate" variant="secondary">Vezi în portalul demo</Button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-8 rounded-2xl border border-line bg-surface p-8 shadow-card">
              <Gauge value={p.score} size={160} label="postură" />
              <div className="text-sm text-ink-2">
                <div className="font-medium text-ink">Firma demonstrativă, azi 06:00</div>
                <div className="mt-1">7 straturi · 20 de controale</div>
                <div className="mt-1">{p.layers.flatMap((l) => l.controls).filter((c) => c.status === "done").length} complete · {p.layers.flatMap((l) => l.controls).filter((c) => c.status === "partial").length} parțiale</div>
                <div className="mt-3 text-xs text-ink-3">Recalculat zilnic. Fiecare control are dovadă, dată și metodă.</div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Section>
        <SectionHeading
          eyebrow="Cele 7 straturi"
          title="Fiecare strat, cu controalele lui și cu ce se întâmplă dacă lipsesc."
          lead="Scorul unui strat e media ponderată a controalelor lui: complet = 1, parțial = 0,5, lipsă = 0. Simplu, ca să poată fi contestat."
        />
        <div className="mt-12 space-y-4">
          {p.layers.map((l, i) => (
            <article key={l.layer} className="grid gap-6 rounded-2xl border border-line bg-surface p-6 lg:grid-cols-[220px_1fr]">
              <div>
                <div className="num text-xs text-ink-3">L{i + 1} · {l.short}</div>
                <h3 className="mt-1 text-xl font-semibold text-ink">{l.name}</h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="num text-3xl font-semibold text-ink">{l.score}</span>
                  <span className="text-sm text-ink-3">/100</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <div className={cn("h-full rounded-full", l.score >= 85 ? "bg-good" : l.score >= 60 ? "bg-warn" : "bg-bad")} style={{ width: `${l.score}%` }} />
                </div>
                <p className="mt-3 text-sm text-ink-2">{l.description}</p>
              </div>
              <ul className="divide-y divide-line">
                {l.controls.map((c) => {
                  const Icon = c.status === "done" ? ShieldCheck : c.status === "partial" ? CircleDashed : CircleAlert;
                  const tone = c.status === "done" ? "text-good" : c.status === "partial" ? "text-warn" : "text-bad";
                  return (
                    <li key={c.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-ink">
                          <Icon className={cn("size-4 shrink-0", tone)} aria-hidden />
                          {c.title}
                          <Badge tone={c.status === "done" ? "good" : c.status === "partial" ? "warn" : "bad"}>{c.status === "done" ? "complet" : c.status === "partial" ? "parțial" : "lipsă"}</Badge>
                        </div>
                        <p className="mt-1 pl-6 text-sm text-ink-2">{c.why}</p>
                      </div>
                      {c.evidence && <div className="num pl-6 text-xs text-ink-3 sm:pl-0 sm:text-right">{c.evidence}</div>}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Verificări recurente" title="Ce verificăm, cu ce frecvență, cu ce dovadă." lead="Majoritatea sunt zilnice și automate. Cele trimestriale se fac cu oameni, pentru că judecata nu se automatizează." />
          </div>
          <ol className="space-y-2">
            {monthly.map((m, i) => (
              <li key={m} className="flex gap-3 rounded-xl border border-line bg-surface p-3 text-sm text-ink-2">
                <span className="num w-6 shrink-0 text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                {m}
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section>
        <div className="max-w-3xl">
          <SectionHeading eyebrow="Ce nu promitem" title="Niciun sistem nu e invulnerabil. Proiectăm pentru detecție rapidă, impact limitat și revenire demonstrată." />
          <p className="mt-6 text-[15px] leading-relaxed text-ink-2">
            Un atac reușit nu e o rușine; unul nedetectat, cu backup criptat și fără plan, e. Nucleu proiectează pentru trei
            lucruri: să afli repede (monitorizare și EDR), să se oprească aproape (segmentare și MFA) și să revii cu dovezi
            (restaurare demonstrată, plan exersat). Iar când se întâmplă, primești un mesaj care spune ce s-a întâmplat, ce s-a
            oprit și la ce oră revenim. Apoi se întâmplă exact așa.
          </p>
        </div>
      </Section>
      <CtaBand title="Câte dintre cele 20 de controale ai deja?" lead="Auditul gratuit îți dă scorul pe 7 straturi și costul fiecărei lipse, în 15 minute." />
    </>
  );
}
