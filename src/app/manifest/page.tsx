import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { CtaBand } from "@/components/site/CtaBand";
import { EpochStrip } from "@/components/site/EpochStrip";
import { principles } from "@/lib/content/principles";
import { epochs, invariants } from "@/lib/content/manifest";

export const metadata: Metadata = {
  title: "Manifest 2126 — IT-ul acum și peste 100 de ani",
  description: "Cum vedem infrastructura firmelor în 2026, 2030, 2040, 2060 și 2126, ce nu se va schimba niciodată și cele 10 principii pe care le aplicăm azi.",
};

export default function ManifestPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <Container className="relative py-20 sm:py-28">
          <Eyebrow className="mb-4">Manifest · 2026 → 2126</Eyebrow>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Peste 100 de ani nu va exista „IT”. Va exista încredere verificată.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
            Am scris acest manifest ca și cum am fi noi peste un secol, uitându-ne înapoi la 2026. Nu ca să ghicim tehnologia, ci ca să
            găsim ce nu se schimbă. Apoi am construit produsul de azi pornind de la acele lucruri.
          </p>
        </Container>
      </section>

      <Section>
        <SectionHeading eyebrow="I — Ce nu se schimbă" title="Cinci invariante. Restul e implementare." />
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {invariants.map((inv, i) => (
            <li key={inv.title} className="rounded-2xl border border-line bg-surface p-5">
              <div className="num text-xs text-ink-3">0{i + 1}</div>
              <h3 className="mt-2 text-base font-semibold leading-snug text-ink">{inv.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{inv.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="II — Traiectoria"
          title="De la operare autonomă la notarii realității digitale."
          lead="Fiecare epocă răspunde la aceleași patru întrebări: ce fac oamenii, ce face sistemul, pentru ce se plătește, ce contează ca dovadă. Și, pentru fiecare, ce construim deja azi."
        />
        <div className="mt-12">
          <EpochStrip />
        </div>
        <div className="mt-10 space-y-6">
          {epochs.map((e) => (
            <article key={e.year} className="grid gap-6 rounded-2xl border border-line bg-surface p-6 lg:grid-cols-[180px_1fr]">
              <div>
                <div className="text-4xl font-semibold tracking-tight text-ink">{e.year}</div>
                <div className="mt-1 text-sm font-medium text-ink-2">{e.title}</div>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="eyebrow">Oamenii</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-2">{e.human}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Sistemul</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-2">{e.system}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Pentru ce se plătește</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-2">{e.price}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Ce contează ca dovadă</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-2">{e.proof}</dd>
                </div>
                <div className="sm:col-span-2 rounded-xl bg-accent-soft/60 p-3 text-sm text-ink">
                  <span className="font-medium">Azi: </span>
                  {e.today}
                </div>
              </dl>
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="III — Cele 10 legi"
          title="Consiliul: de la cine am furat fiecare principiu."
          lead="Nu am inventat nimic. Am luat ce s-a dovedit adevărat un secol în statistică, fizică, cibernetică, economie și medicină, și l-am transformat în funcții de produs, cu numele autorului lângă."
        />
        <div className="mt-12 space-y-4">
          {principles.map((p) => (
            <article key={p.slug} id={p.slug} className="grid gap-5 rounded-2xl border border-line bg-surface p-6 lg:grid-cols-[64px_1fr_280px]">
              <div className="num text-3xl font-semibold text-ink-3">{String(p.n).padStart(2, "0")}</div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-ink">{p.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{p.body}</p>
                <p className="mt-3 rounded-xl bg-surface-2/70 p-3 text-sm text-ink">
                  <span className="font-medium">În produs: </span>
                  {p.inProduct}
                </p>
              </div>
              <aside className="rounded-xl border border-dashed border-line-2 p-4">
                <div className="eyebrow">Din consiliu</div>
                <div className="mt-2 font-semibold text-ink">{p.mind.name}</div>
                <div className="num text-xs text-ink-3">{p.mind.years}</div>
                <p className="mt-2 text-sm italic leading-relaxed text-ink-2">{p.mind.idea}</p>
              </aside>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <div className="max-w-3xl">
          <SectionHeading eyebrow="IV — Scrisoare din 2126" title="Ce ne-am spune, dacă am putea." />
          <div className="mt-8 space-y-4 text-[17px] leading-relaxed text-ink-2">
            <p>
              Ați avut dreptate să începeți cu dovezile. Tehnologia pe care o folosiți acum ne pare azi rudimentară, dar obiceiul de a nu
              afirma nimic fără un test programat a supraviețuit tuturor generațiilor de sisteme. Este singurul lucru pe care l-am
              păstrat neschimbat.
            </p>
            <p>
              Ați greșit crezând că oamenii vor dispărea din buclă. Nu au dispărut; s-au mutat mai sus. Nimeni nu mai repară nimic, dar
              cineva trebuie să spună ce înseamnă „reparat” și cât risc e acceptabil. Aceea e munca noastră acum. Pregătiți-vă clienții
              pentru ea: învățați-i să citească riscul în lei încă de pe acum.
            </p>
            <p>
              Clauza de divorț a fost cea mai bună idee a voastră. Într-o lume în care sistemele știu totul despre o firmă, dreptul de a
              pleca cu tot e ceea ce separă un serviciu de o captivitate. Puneți-o în contract, publicați-o, faceți-o un buton.
            </p>
            <p>Restul se schimbă. Construiți pentru ce rămâne.</p>
            <p className="num text-sm text-ink-3">— Nucleu, 17 septembrie 2126</p>
          </div>
          <div className="mt-8">
            <Button href="/instrumente/audit-it">
              Începe cu dovezile: auditul gratuit <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </Section>

      <CtaBand title="Vrei să vezi cum arată principiile astea aplicate la firma ta?" lead="Auditul gratuit în 15 minute produce riscul în lei, pe 7 straturi. Portalul demo arată tot ce am descris aici, cu date fictive." primary={{ href: "/instrumente/audit-it", label: "Audit gratuit" }} secondary={{ href: "/portal", label: "Portalul demo" }} />
    </>
  );
}
