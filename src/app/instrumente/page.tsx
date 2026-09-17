import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MonitorSmartphone, Server } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Badge } from "@/components/ui/Badge";
import { CtaBand } from "@/components/site/CtaBand";

export const metadata: Metadata = {
  title: "Instrumente gratuite — audit IT, simulator, verificări e-mail și web, calculatoare",
  description:
    "Zece instrumente gratuite, fără cont: audit IT în 15 minute cu riscul în lei, simulator de căderi, verificare SPF/DKIM/DMARC, igienă web, costul nefuncționării, riscul de backup, quiz anti-phishing, calculator de preț, test de viteză, verificator de parole.",
};

type Runs = "browser" | "server";

interface Tool {
  slug: string;
  name: string;
  description: string;
  input: string;
  output: string;
  categories: string[];
  runs: Runs;
}

const tools: Tool[] = [
  {
    slug: "audit-it",
    name: "Audit IT în 15 minute",
    description: "24 de întrebări pe 7 straturi; rezultatul e un scor și riscul anual estimat în lei, cu primele acțiuni.",
    input: "profilul firmei (oameni, venit, sector) și 24 de răspunsuri",
    output: "scor pe 7 straturi, pierdere anuală așteptată, 5 acțiuni cu economia fiecăreia",
    categories: ["Risc", "Bani"],
    runs: "browser",
  },
  {
    slug: "simulator",
    name: "Simulator „ce se întâmplă dacă…”",
    description: "Alege ce cade sau ce e criptat în geamănul digital al unei firme demo și vezi cine nu mai poate lucra și cât costă.",
    input: "un scenariu sau un nod din graf, plus parametrii firmei",
    output: "oameni afectați, ore de oprire, pierdere pe incident, remedieri cu economia lor",
    categories: ["Risc", "Geamăn digital"],
    runs: "browser",
  },
  {
    slug: "email",
    name: "Verificare e-mail: SPF, DKIM, DMARC, MX",
    description: "Cât de ușor poate cineva trimite e-mail „din partea” domeniului tău. Verificăm înregistrările DNS publice.",
    input: "un domeniu sau o adresă de e-mail",
    output: "notă A–F, cele patru înregistrări, problemele găsite și ce trebuie publicat",
    categories: ["Securitate", "E-mail"],
    runs: "server",
  },
  {
    slug: "web",
    name: "Igienă web: HTTPS și antete de securitate",
    description: "Site-ul tău trimite browserului protecțiile standard? O cerere, opt antete, o notă.",
    input: "adresa site-ului",
    output: "notă A–F, HTTPS și redirecționare, cookie-uri, tabel cu antetele lipsă",
    categories: ["Securitate", "Web"],
    runs: "server",
  },
  {
    slug: "cost-downtime",
    name: "Costul unei ore de nefuncționare",
    description: "Cât pierzi pe oră când IT-ul stă: productivitate plătită degeaba plus venitul pus în pericol.",
    input: "oameni, cost orar, venit anual, dependența de IT, ore și incidente pe an",
    output: "cost pe oră, pe incident și pe an, cu formula la vedere",
    categories: ["Bani"],
    runs: "browser",
  },
  {
    slug: "risc-backup",
    name: "Riscul de backup",
    description: "RPO, probabilitatea ca restaurarea să eșueze și ca backup-ul să fie distrus odată cu datele. În lei.",
    input: "frecvența backup-ului, ultimul test de restaurare, offsite, imutabil, retenție",
    output: "verdict, ore de muncă pierdute, probabilități, pierdere pe incident și pe an",
    categories: ["Backup", "Bani"],
    runs: "browser",
  },
  {
    slug: "phishing",
    name: "Quiz anti-phishing (10 scenarii)",
    description: "Zece mesaje reale ca tipar: e-mail, SMS, telefon, Teams. Decizi tu dacă sunt înșelătorii, apoi vezi indiciile.",
    input: "10 decizii: înșelătorie sau legitim",
    output: "scor, verdict, explicația și indiciile fiecărui scenariu",
    categories: ["Securitate", "Oameni"],
    runs: "browser",
  },
  {
    slug: "calculator",
    name: "Calculator de preț Nucleu",
    description: "Cifra finală, per om protejat, cu tot ce e inclus și cu proiecția pe 5 ani. Fără „ofertă după audit”.",
    input: "oameni, plan, servere, locații, firme e-Factura, aplicații",
    output: "factura lunară exactă, liniile ei, proiecția pe 5 ani",
    categories: ["Bani", "Prețuri"],
    runs: "browser",
  },
  {
    slug: "viteza",
    name: "Test de viteză internet",
    description: "Latență, descărcare și încărcare, măsurate față de serverul Nucleu. Fără reclame, fără urmărire.",
    input: "un clic; ~20 MB trafic",
    output: "ping în ms, descărcare și încărcare în Mbps",
    categories: ["Rețea"],
    runs: "server",
  },
  {
    slug: "parole",
    name: "Verificator de parole",
    description: "Entropie, timp estimat de spargere și sugestii. Rulează doar în browser: parola nu pleacă nicăieri.",
    input: "o parolă (rămâne în browser)",
    output: "scor, biți de entropie, timp de spargere, avertismente, o frază generată",
    categories: ["Securitate", "Identitate"],
    runs: "browser",
  },
];

export default function InstrumentePage() {
  return (
    <>
      <section className="border-b border-line bg-surface-2/60">
        <Container className="py-16 sm:py-24">
          <Eyebrow className="mb-4">Instrumente gratuite</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Instrumente care îți spun adevărul despre IT-ul tău. <span className="text-accent-ink">Gratuit, fără cont.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
            Fiecare instrument rulează fie în browserul tău, fie pe serverul nostru, pentru verificările care au nevoie de DNS
            sau de o cerere HTTP. Nu stocăm nimic din ce introduci, nu cerem cont și nu trimitem e-mailuri după. Fiecare
            număr vine cu ipoteza din spatele lui, ca să-l poți contesta.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
            <span className="inline-flex items-center gap-2"><MonitorSmartphone className="size-4 text-ink-3" aria-hidden /> în browser: nimic nu pleacă de pe dispozitivul tău</span>
            <span className="inline-flex items-center gap-2"><Server className="size-4 text-ink-3" aria-hidden /> pe serverul nostru: procesat, nestocat</span>
          </div>
        </Container>
      </section>

      <Section>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t, i) => (
            <li key={t.slug} className="flex">
              <Link
                href={`/instrumente/${t.slug}`}
                className="group flex w-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="num text-xs text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <Badge tone="neutral" mono>
                    {t.runs === "browser" ? (
                      <><MonitorSmartphone className="size-3" aria-hidden /> în browser</>
                    ) : (
                      <><Server className="size-3" aria-hidden /> pe server</>
                    )}
                  </Badge>
                </div>
                <h2 className="mt-3 text-lg font-semibold leading-snug text-ink">{t.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{t.description}</p>
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-14 shrink-0 text-ink-3">Intrare:</dt>
                    <dd className="text-ink-2">{t.input}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-14 shrink-0 text-ink-3">Ieșire:</dt>
                    <dd className="text-ink-2">{t.output}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                  <div className="flex flex-wrap gap-1.5">
                    {t.categories.map((c) => (
                      <Badge key={c} tone="accent">{c}</Badge>
                    ))}
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent-ink">
                    Deschide <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <CtaBand
        title="Instrumentele îți arată riscul. Nucleu îl reduce și îți dă dovada."
        lead="Începe cu auditul de 15 minute: primești scorul pe 7 straturi, riscul anual în lei și primele acțiuni. Dacă vrei, îl parcurgem împreună, gratuit."
      />
    </>
  );
}
