import Link from "next/link";
import { ArrowRight, ShieldCheck, Activity, GitBranch, Wand2, FileCheck2, Coins, Unlock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section, SectionHeading, Eyebrow } from "@/components/ui/Section";
import { Proof } from "@/components/ui/Proof";
import { Badge } from "@/components/ui/Badge";
import { ConsolePreview } from "@/components/site/ConsolePreview";
import { CtaBand } from "@/components/site/CtaBand";
import { FaqList } from "@/components/site/FaqList";
import { TierCards } from "@/components/site/TierCards";
import { CaseCard } from "@/components/site/CaseCard";
import { CapabilityCard } from "@/components/site/CapabilityCard";
import { EpochStrip } from "@/components/site/EpochStrip";
import { Compare } from "@/components/charts/Compare";
import { HBars } from "@/components/charts/HBars";
import { principles } from "@/lib/content/principles";
import { capabilities } from "@/lib/content/services";
import { caseStudies } from "@/lib/content/cases";
import { generalFaq } from "@/lib/content/faq";
import { demoRisk, demoPosture, restoreProof, mfaProof, patchProof } from "@/lib/demo/state";
import { formatLei } from "@/lib/format";

const problems = [
  { title: "Rapoarte de activitate în loc de dovezi", body: "„Am verificat backup-ul” nu e o dovadă. O restaurare cronometrată, cu jurnal, este." },
  { title: "Risc exprimat în culori", body: "Roșu, galben, verde. Nimeni nu poate pune un buget pe „galben”." },
  { title: "Plătit la oră, deci orele cresc", body: "Modelul clasic e răsplătit când IT-ul tău are probleme. Al nostru, când nu are." },
  { title: "Consola ascunsă", body: "Furnizorul vede tot; tu vezi o factură. Încrederea se cere, nu se verifică." },
  { title: "Backup-uri netestate", body: "Un backup care nu a fost restaurat niciodată e o speranță, nu o procedură." },
  { title: "Totul „în capul lui Andrei”", body: "Când Andrei pleacă, pleacă și IT-ul. Documentația e a ta, nu a lui." },
  { title: "Contracte cu lacăt", body: "Rămâi pentru că nu poți pleca, nu pentru că merită. Noi publicăm clauza de divorț." },
  { title: "Aceleași 20 de probleme, manual, la nesfârșit", body: "Imprimanta, parola, spațiul pe disc. Un om plătit să repete e un om irosit." },
];

const steps = [
  { icon: GitBranch, title: "Geamănul digital", body: "Construim modelul viu al IT-ului tău: oameni, servicii, servere, rețele, furnizori și dependențele dintre ele.", deliverable: "Graf complet + puncte unice de eșec" },
  { icon: Activity, title: "Riscul în lei", body: "Simulăm căderile și compromiterile pe geamăn și exprimăm fiecare risc ca pierdere anuală așteptată, cu ipotezele afișate.", deliverable: "Registru de risc, inițial vs. rezidual" },
  { icon: Wand2, title: "Auto-vindecare", body: "Problemele cunoscute se rezolvă automat și se consemnează cu explicație. Oamenii intervin la ce e nou, în minute.", deliverable: "Jurnal explicat + ore umane în scădere" },
  { icon: FileCheck2, title: "Dovada", body: "Fiecare garanție are un test programat: restaurări demonstrate, MFA verificat zilnic, patch-uri sub 14 zile.", deliverable: "Dovezi DOV-… verificabile oricând" },
  { icon: Coins, title: "Decizia", body: "Lunar, cu managementul: ce s-a schimbat, ce riscuri rămân, ce decizii cerem, cât costă fiecare opțiune.", deliverable: "Raport executiv + plan pe 12 luni" },
];

export default function Home() {
  const topRisks = demoRisk.lines.slice(0, 5).map((l) => ({ label: l.title, before: l.ealBefore, after: l.ealNow }));
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <Container wide className="relative py-16 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div className="animate-rise">
              <Badge tone="accent" className="mb-6">
                <Sparkles className="size-3" /> Alternativa la IT-ul administrat clasic
              </Badge>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                IT-ul care se repară singur.
                <br />
                <span className="text-accent-ink">Și îți arată dovada.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
                Nucleu transformă infrastructura firmei tale într-un sistem autonom și verificabil: fiecare risc măsurat în
                lei, fiecare backup demonstrat prin restaurare, fiecare intervenție explicată pe înțelesul tău. Fără tichete
                pierdute, fără promisiuni. Dovezi.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/instrumente/audit-it" size="lg">
                  Vezi riscul tău în lei, în 15 min <ArrowRight className="size-4" />
                </Button>
                <Button href="/portal" size="lg" variant="secondary">
                  Explorează portalul demo
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
                <li className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-good" /> Restaurare demonstrată lunar</li>
                <li className="inline-flex items-center gap-2"><Coins className="size-4 text-good" /> Riscul în lei, nu în culori</li>
                <li className="inline-flex items-center gap-2"><Unlock className="size-4 text-good" /> Pleci oricând, cu tot</li>
              </ul>
            </div>
            <div className="animate-rise [animation-delay:120ms]">
              <ConsolePreview />
            </div>
          </div>
        </Container>
      </section>

      {/* Dovezi */}
      <section className="border-y border-line bg-surface-2/60">
        <Container wide className="py-10">
          <div className="grid gap-4 md:grid-cols-3">
            <Proof id={restoreProof.id} title={restoreProof.title} value={restoreProof.value} when={restoreProof.when} method={restoreProof.method} compact />
            <Proof id={mfaProof.id} title={mfaProof.title} value={mfaProof.value} when={mfaProof.when} method={mfaProof.method} compact />
            <Proof id={patchProof.id} title={patchProof.title} value={patchProof.value} when={patchProof.when} method={patchProof.method} compact />
          </div>
          <p className="mt-4 text-xs text-ink-3">
            Așa arată o afirmație la Nucleu: cu ID, moment și metodă. Datele de mai sus sunt din firma demonstrativă; ale tale vor fi ale tale.
          </p>
        </Container>
      </section>

      {/* 01 Problema */}
      <Section id="problema">
        <SectionHeading
          eyebrow="01 — Problema"
          title={<>IT-ul clasic vinde ore. Firma ta are nevoie de <span className="text-accent-ink">certitudini</span>.</>}
          lead="Companiile nu pierd bani doar când pică serverul. Pierd bani când nu pot răspunde la întrebări simple: cine are acces la ce, cât ne-ar costa o zi fără sisteme, chiar merge backup-ul?"
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((p) => (
            <div key={p.title} className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="text-[15px] font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 02 Principii */}
      <Section id="principii" tone="muted">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="02 — Cele 10 legi"
            title={<>Principii furate de la cei mai deștepți oameni din istorie. <span className="text-ink-3">Aplicate la IT-ul tău.</span></>}
            lead="Deming, Feynman, Shannon, Ostrom, Wiener, Kahneman. Nu am inventat nimic: am luat ce s-a dovedit adevărat timp de un secol și l-am transformat în funcții de produs."
          />
          <Button href="/manifest" variant="secondary">
            Citește manifestul 2126 <ArrowRight className="size-4" />
          </Button>
        </div>
        <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {principles.map((p) => (
            <li key={p.slug} className="rounded-2xl border border-line bg-surface p-5">
              <div className="num text-xs text-ink-3">{String(p.n).padStart(2, "0")}</div>
              <h3 className="mt-2 text-[15px] font-semibold leading-snug text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{p.short}</p>
              <p className="mt-3 text-xs text-ink-3">— {p.mind.name}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 03 Cum funcționează */}
      <Section id="cum-functioneaza">
        <SectionHeading
          eyebrow="03 — Cum funcționează"
          title={<>Cinci pași, în buclă, <span className="text-accent-ink">în fiecare lună</span>.</>}
          lead="Nu un proiect cu început și sfârșit, ci un sistem cu feedback: modelăm, măsurăm, reparăm automat, dovedim, decidem. Apoi de la capăt, cu riscul mai mic."
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <s.icon className="size-5 text-accent-ink" aria-hidden />
                <span className="num text-xs text-ink-3">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.body}</p>
              <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
                <span className="font-medium text-ink-2">Livrabil:</span> {s.deliverable}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 04 Riscul în lei */}
      <Section id="risc" tone="muted">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="04 — Riscul în lei"
              title={<>De la {formatLei(demoRisk.totalBefore)} la {formatLei(demoRisk.totalNow)} pe an. <span className="text-ink-3">Cu formula la vedere.</span></>}
              lead="Pentru firma demonstrativă (28 de oameni, distribuție), fiecare scenariu e simulat pe geamănul digital: cine e afectat, cât durează, cât costă. Probabilitate × impact = pierdere anuală așteptată. Managementul decide pe cifre, nu pe adjective."
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/instrumente/simulator" variant="secondary">
                Simulează o cădere <ArrowRight className="size-4" />
              </Button>
              <Button href="/portal?tab=risc" variant="ghost">
                Vezi registrul complet
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-medium text-ink">Pierdere anuală așteptată, pe scenariu</div>
              <Badge mono>lei / an</Badge>
            </div>
            <Compare rows={topRisks} format={(v) => formatLei(v)} beforeLabel="la onboarding" afterLabel="acum" />
            <p className="mt-4 text-xs text-ink-3">Reducere totală: {Math.round(demoRisk.reductionPct)}% în 6 luni. Riscul rămas e cunoscut, acceptat de management și revizuit lunar.</p>
          </div>
        </div>
      </Section>

      {/* 05 Capabilități */}
      <Section id="capabilitati">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="05 — Capabilități"
            title={<>Douăsprezece arii, un singur strat de responsabilitate. <span className="text-ink-3">Toate incluse, pentru toți clienții.</span></>}
            lead="Nu vindem pachete cu funcții scoase. Fiecare client primește tot; diferă doar garanțiile."
          />
          <Button href="/servicii" variant="secondary">
            Toate capabilitățile <ArrowRight className="size-4" />
          </Button>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.slice(0, 8).map((c) => (
            <CapabilityCard key={c.slug} c={c} />
          ))}
        </div>
      </Section>

      {/* 06 Platforma */}
      <Section id="platforma" tone="ink" className="text-bg">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow className="mb-4 text-bg/60">06 — Platforma</Eyebrow>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Cutia de sticlă: portalul tău este consola noastră.</h2>
            <p className="mt-5 text-lg leading-relaxed text-bg/75">
              Nu există un ecran pe care îl vedem noi și tu nu. Geamăn digital, simulări, intenții, inventar, identități, backup cu dovezi, postura pe 7 straturi, jurnalul complet, documente exportabile, factura cu creditele calculate automat.
            </p>
            <ul className="mt-6 grid gap-2 text-sm text-bg/80 sm:grid-cols-2">
              {["Geamăn digital + simulator", "Intenții în loc de tichete", "Jurnal explicat, uman și automat", "Dovezi DOV-… verificabile", "Postură pe 7 straturi, zilnic", "Buton „Exportă tot”, oricând"].map((f) => (
                <li key={f} className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-good" /> {f}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/portal" size="lg" variant="inverse">
                Intră în portalul demo <ArrowRight className="size-4" />
              </Button>
              <Button href="/platforma" size="lg" variant="inverse-ghost">
                Despre Nucleu Console
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-bg/15 bg-bg/5 p-5">
            <div className="mb-3 flex items-center justify-between text-xs text-bg/60">
              <span>Postură de securitate · 7 straturi</span>
              <span className="num">{demoPosture.score}/100</span>
            </div>
            <div className="rounded-xl bg-surface p-4 text-ink">
              <HBars
                data={demoPosture.layers.map((l) => ({ label: l.name, value: l.score, display: `${l.score}%`, tone: l.score >= 85 ? "good" : l.score >= 60 ? "warn" : "bad", hint: l.description }))}
                max={100}
                labelWidth={110}
              />
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-good" /> ≥ 85 controlat</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-warn" /> 60–84 parțial</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-bad" /> &lt; 60 expus</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 07 Prețuri */}
      <Section id="preturi">
        <SectionHeading
          eyebrow="07 — Prețuri"
          title={<>Per om protejat. Totul inclus. <span className="text-accent-ink">Prețul scade în fiecare an.</span></>}
          lead="Fără contract minim, fără taxă de instalare, fără „ofertă după audit” cu surprize. Garanțiile încălcate generează credite automat, pe factura următoare."
          align="center"
        />
        <div className="mt-12">
          <TierCards compact />
        </div>
        <div className="mt-6 text-center">
          <Button href="/preturi" variant="secondary">
            Detalii, extra-opțiuni și calculator <ArrowRight className="size-4" />
          </Button>
        </div>
      </Section>

      {/* 08 Dovezi */}
      <Section id="dovezi" tone="muted">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="08 — Dovezi"
            title={<>Scenarii în care IT-ul trebuie să funcționeze, <span className="text-ink-3">cu cifrele înainte și după</span>.</>}
            lead="Tipologii anonimizate din practică, cu riscul anual estimat înainte și după intervenție. Nu garantăm rezultate identice; garantăm metoda și dovezile."
          />
          <Button href="/studii-de-caz" variant="secondary">
            Toate scenariile <ArrowRight className="size-4" />
          </Button>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {caseStudies.slice(0, 3).map((c) => (
            <CaseCard key={c.slug} c={c} />
          ))}
        </div>
      </Section>

      {/* 09 2126 */}
      <Section id="2126">
        <SectionHeading
          eyebrow="09 — Acum și peste 100 de ani"
          title={<>Construim pentru 2126. <span className="text-ink-3">Începând cu ce nu se va schimba.</span></>}
          lead="Tehnologiile se schimbă la 5 ani. Încrederea trebuie dovedită, riscul trebuie măsurat, oamenii trebuie să poată pleca: astea rămân. De aceea Nucleu e proiectat pornind de la ele."
        />
        <div className="mt-12">
          <EpochStrip activeYear="2026" />
        </div>
        <div className="mt-6">
          <Link href="/manifest" className="inline-flex items-center gap-1 text-sm font-medium text-accent-ink">
            Citește manifestul complet, de la 2026 la 2126 <ArrowRight className="size-4" />
          </Link>
        </div>
      </Section>

      {/* FAQ */}
      <Section tone="muted">
        <SectionHeading eyebrow="Întrebări frecvente" title="Pe scurt, ce e diferit." />
        <div className="mt-10 max-w-3xl">
          <FaqList items={generalFaq} />
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
