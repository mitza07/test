import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui/Section";
import { CapabilityCard } from "@/components/site/CapabilityCard";
import { CtaBand } from "@/components/site/CtaBand";
import { capabilities } from "@/lib/content/services";

export const metadata: Metadata = {
  title: "Capabilități — douăsprezece arii, toate incluse",
  description: "Operare autonomă, identitate, rețea, servere, backup demonstrat, securitate măsurată, monitorizare, geamăn digital, automatizări, aplicații, consultanță, conformitate.",
};

export default function ServiciiPage() {
  return (
    <>
      <Section>
        <SectionHeading
          as="h1"
          eyebrow="Capabilități"
          title={<>Douăsprezece arii operaționale. <span className="text-ink-3">Un singur strat de responsabilitate.</span></>}
          lead="Toate sunt incluse pentru toți clienții. Fiecare vine cu livrabile concrete, dovezi lunare și o descriere onestă a ce facem azi și a direcției în care mergem."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c) => (
            <CapabilityCard key={c.slug} c={c} />
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
