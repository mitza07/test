import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CtaBand } from "@/components/site/CtaBand";
import { TwinGraph } from "@/components/charts/TwinGraph";
import { demoTwin } from "@/lib/twin";

export const metadata: Metadata = {
  title: "Infrastructură — vizibilă, măsurabilă, controlabilă",
  description: "Geamănul digital al firmei tale: fiecare echipament, serviciu, rețea și furnizor, cu dependențele dintre ele. Din el derivăm riscul, simulările și planul pe 12 luni.",
};

const pillars = [
  { title: "Inventar automat, validat fizic", body: "Descoperire de rețea + agenți pe stații + validare la fața locului. Fiecare echipament: ce e, unde e, cine îl folosește, când expiră garanția, ce rulează pe el." },
  { title: "Dependențe explicite", body: "ERP-ul rulează pe SRV-01, care depinde de switch-ul core, care depinde de firewall, care depinde de fibră. Când e scris, poți simula. Când nu e scris, afli la incident." },
  { title: "Puncte unice de eșec, numărate", body: "Fiecare nod fără redundanță și cu dependenți e un punct unic de eșec. Le listăm, le prețuim în lei și propunem pentru fiecare o măsură cu cost și economie." },
  { title: "Capacitate cu prognoză", body: "CPU, memorie, stocare, legături: tendințe pe 12 luni, ca să știi cu 9 luni înainte că ai nevoie de un disc, nu cu 9 minute." },
  { title: "Plan de viață pentru fiecare echipament", body: "Vârstă, garanție, firmware, înlocuire planificată, buget. Nimic nu „moare de bătrânețe” fără să fi fost în plan." },
  { title: "Schimbări simulate înainte de aplicare", body: "O regulă de firewall nouă, un server mutat, un VLAN nou: mai întâi pe geamăn, apoi în realitate, cu drum înapoi pregătit." },
];

export default function InfrastructuraPage() {
  const spof = demoTwin.nodes.filter((n) => !n.redundant && n.kind !== "person" && n.kind !== "site" && demoTwin.edges.some((e) => e.to === n.id && (e.rel === "depends_on" || e.rel === "runs_on" || e.rel === "stores")));
  return (
    <>
      <section className="border-b border-line bg-surface-2/60">
        <Container className="py-16 sm:py-24">
          <Eyebrow className="mb-4">Infrastructură</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Infrastructura devine vizibilă, măsurabilă și <span className="text-accent-ink">controlabilă</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
            Nu poți proteja ce nu știi că ai și nu poți decide despre ce nu poți măsura. Începem cu geamănul digital: modelul viu al
            IT-ului tău, cu fiecare dependență scrisă. Restul (risc, simulări, plan, buget) derivă din el.
          </p>
        </Container>
      </section>

      <Section wide>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading eyebrow="Geamănul digital" title="Firma demonstrativă: 28 de oameni, 2 locații, 38 de noduri, 62 de dependențe." lead="Furnizorii în stânga, oamenii în dreapta. Liniile punctate verzi sunt backup-urile. Click pe un nod în portalul demo ca să simulezi căderea lui." />
          <Badge mono>date fictive</Badge>
        </div>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <TwinGraph twin={demoTwin} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Puncte unice de eșec</div>
            <div className="mt-1 text-3xl font-semibold text-ink">{spof.length}</div>
            <p className="mt-1 text-sm text-ink-2">noduri fără redundanță de care depinde altceva</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Redundanțe active</div>
            <div className="mt-1 text-3xl font-semibold text-ink">{demoTwin.nodes.filter((n) => n.redundant).length}</div>
            <p className="mt-1 text-sm text-ink-2">noduri la care propagarea căderii se oprește</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Noduri protejate de backup</div>
            <div className="mt-1 text-3xl font-semibold text-ink">{new Set(demoTwin.edges.filter((e) => e.rel === "backs_up").map((e) => e.to)).size}</div>
            <p className="mt-1 text-sm text-ink-2">cu restaurare demonstrată lunar</p>
          </div>
        </div>
        <div className="mt-6">
          <Button href="/instrumente/simulator" variant="secondary">Simulează o cădere pe acest geamăn <ArrowRight className="size-4" /></Button>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading eyebrow="Ce facem cu el" title="Șase practici, aceeași sursă de adevăr." />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="text-base font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>
      <CtaBand title="Vrei geamănul digital al firmei tale?" lead="Îl construim la onboarding, în primele 14 zile, și îl ținem la zi automat. Până atunci, auditul gratuit îți arată unde sunt punctele unice de eșec." />
    </>
  );
}
