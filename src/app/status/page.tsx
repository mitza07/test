import type { Metadata } from "next";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { UptimeStrip, type DayStatus } from "@/components/charts/UptimeStrip";
import { Proof } from "@/components/ui/Proof";
import { proofId } from "@/lib/format";

export const metadata: Metadata = {
  title: "Status public — sistemele Nucleu și dovezile noastre",
  description: "Starea platformei Nucleu, istoricul incidentelor și indicatorii noștri operaționali publicați lunar: timp de răspuns, restaurări demonstrate, credite plătite.",
};

function strip(seed: number, incidents: number[] = [], degraded: number[] = []): DayStatus[] {
  return Array.from({ length: 90 }, (_, i) => (incidents.includes(i) ? "bad" : degraded.includes(i) ? "warn" : "ok"));
}

const services = [
  { name: "Nucleu Console (portal clienți)", uptime: "99,99%", days: strip(1, [], [41]) },
  { name: "Monitorizare & alertare", uptime: "100%", days: strip(2) },
  { name: "Backup offsite (regiuni UE)", uptime: "100%", days: strip(3) },
  { name: "Automatizări & agenți", uptime: "99,97%", days: strip(4, [], [12, 63]) },
  { name: "API clienți", uptime: "99,98%", days: strip(5, [], [27]) },
  { name: "Site public & instrumente", uptime: "100%", days: strip(6) },
];

const incidents = [
  { date: "8 aug 2026", title: "Latență crescută la automatizări (2 h 10 min)", detail: "Un furnizor de cozi de mesaje a avut o pană regională; sarcinile s-au procesat cu întârziere, fără pierderi. Am adăugat un al doilea furnizor, în altă regiune.", status: "rezolvat · cauză publicată" },
  { date: "17 iul 2026", title: "Portal: pagini lente pentru 40 de minute", detail: "O interogare neindexată după o migrare. Detectată de monitorizarea proprie înainte de orice raport de client. Index adăugat; test de regresie adăugat.", status: "rezolvat · cauză publicată" },
];

export default function StatusPage() {
  return (
    <>
      <section className="border-b border-line bg-surface-2/60">
        <Container className="py-14 sm:py-20">
          <div className="flex flex-wrap items-center gap-3">
            <span className="live-dot" aria-hidden />
            <Eyebrow>Status public</Eyebrow>
            <Badge mono>date demonstrative</Badge>
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">Toate sistemele operaționale.</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-2">Aceleași standarde pe care le cerem infrastructurii tale le aplicăm și nouă: uptime publicat, incidente cu cauză publicată, dovezi lunare.</p>
        </Container>
      </section>

      <Section>
        <div className="space-y-4">
          {services.map((s) => (
            <div key={s.name} className="rounded-2xl border border-line bg-surface p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-ink">{s.name}</div>
                <div className="num text-xs text-ink-2">{s.uptime} · 90 zile</div>
              </div>
              <UptimeStrip days={s.days} />
            </div>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading eyebrow="Dovezile noastre · luna trecută" title="Ce am promis clienților și ce am livrat." lead="Publicăm lunar aceiași indicatori pe care îi vezi în portalul tău, agregați pe toți clienții. Datele de mai jos sunt demonstrative." />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Proof id={proofId("resp", "2026-09-01", 1)} title="Timp de răspuns median (Continuu)" value="11 min" when="august 2026" method="toate solicitările clienților, din jurnal; garanție: 60 min" compact />
          <Proof id={proofId("drill", "2026-09-01", 2)} title="Restaurări demonstrate" value="100%" when="august 2026" method="toți clienții cu drill lunar; durată mediană 9 min 40 s" compact />
          <Proof id={proofId("credit", "2026-09-01", 3)} title="Credite SLA plătite" value="1.240 lei" when="august 2026" method="1 răspuns întârziat (73 min) · credit aplicat automat" compact />
          <Proof id={proofId("hours", "2026-09-01", 4)} title="Ore umane / client / lună" value="4,1 h" when="august 2026" method="mediană; în scădere de la 6,8 h în martie" compact />
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Istoric incidente" title="Când greșim, publicăm cauza." />
        <ol className="mt-8 space-y-3">
          {incidents.map((i) => (
            <li key={i.title} className="grid gap-2 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-[120px_1fr_auto]">
              <div className="num text-xs text-ink-3">{i.date}</div>
              <div>
                <div className="text-sm font-medium text-ink">{i.title}</div>
                <p className="mt-1 text-sm text-ink-2">{i.detail}</p>
              </div>
              <Badge tone="good" className="self-start">{i.status}</Badge>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
