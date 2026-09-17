import type { Metadata } from "next";
import { Mail, MapPin, Clock, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Section";
import { ContactForm } from "@/components/site/ContactForm";
import { site } from "@/lib/content/site";
import { tiers } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Contact — răspundem într-o zi lucrătoare",
  description: "Audit IT gratuit, ofertă pentru un plan, un apel de 20 de minute sau o întrebare. Răspundem în maximum o zi lucrătoare.",
};

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const sp = await searchParams;
  const subject = typeof sp.subiect === "string" ? sp.subiect : "intrebare";
  const plan = typeof sp.plan === "string" ? sp.plan : "";
  const tier = tiers.find((t) => t.id === plan);
  const oameni = typeof sp.oameni === "string" ? sp.oameni : "";
  const prefill = tier ? `Vreau o ofertă pentru ${tier.name}${oameni ? `, ${oameni} oameni` : ""}.` : subject === "audit" ? "Vreau auditul IT gratuit. Suntem ... oameni, în ... locații." : "";

  return (
    <section>
      <Container className="py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Eyebrow className="mb-4">Contact</Eyebrow>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">Vorbește cu un om. <span className="text-ink-3">Fără formulare de 40 de câmpuri.</span></h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-2">
              Spune-ne câți oameni sunteți și ce vă doare. Răspundem în maximum {site.responseTime}, cu un răspuns concret, nu cu o prezentare.
            </p>
            <dl className="mt-10 space-y-5 text-sm">
              <div className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
                <div>
                  <dt className="font-medium text-ink">E-mail</dt>
                  <dd><a href={`mailto:${site.email}`} className="text-ink-2 hover:text-ink">{site.email}</a></dd>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
                <div>
                  <dt className="font-medium text-ink">Adresă</dt>
                  <dd className="text-ink-2">{site.address}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
                <div>
                  <dt className="font-medium text-ink">Program</dt>
                  <dd className="text-ink-2">Luni–Vineri 08–18 pentru discuții. Clienții au răspuns 24/7 conform planului.</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
                <div>
                  <dt className="font-medium text-ink">Ce nu facem</dt>
                  <dd className="text-ink-2">Nu sunăm insistent, nu trimitem newslettere, nu vindem datele. Dacă nu are sens să lucrăm împreună, îți spunem.</dd>
                </div>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <ContactForm initialSubject={subject} initialPlan={plan} prefill={prefill} />
          </div>
        </div>
      </Container>
    </section>
  );
}
