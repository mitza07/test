import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/site/CtaBand";
import { ToolHero } from "@/components/tools/ToolHero";
import { ToolNotes } from "@/components/tools/ToolNotes";
import { DowntimeCalculator } from "@/components/tools/DowntimeCalculator";

export const metadata: Metadata = {
  title: "Costul unei ore de nefuncționare — calculator în lei",
  description:
    "Cât pierde firma ta pe oră când IT-ul stă: productivitate plătită degeaba plus venitul pus în pericol. Calculator gratuit, cu formula la vedere, pe oră, pe incident și pe an.",
};

export default function CostDowntimePage() {
  return (
    <>
      <ToolHero
        category="Bani"
        title={<>Cât costă o oră în care <span className="text-accent-ink">nu merge nimic?</span></>}
        lead="Șase cifre pe care le știi deja și o formulă simplă. Rezultatul e ordinul de mărime pe care îl compari cu prețul oricărei redundanțe: dacă o legătură de rezervă costă mai puțin decât o pană, decizia e luată."
      />
      <Section>
        <DowntimeCalculator />
      </Section>
      <ToolNotes
        items={[
          {
            title: "Productivitatea",
            body: "Într-o pană, oamenii sunt la birou și plătiți, dar fără ERP, e-mail sau fișiere fac cam 30% din ce fac de obicei. De aceea înmulțim costul orar cu 0,7: e partea din salariu plătită pentru muncă ce nu se întâmplă.",
          },
          {
            title: "Venitul pus în pericol",
            body: "Împărțim venitul anual la 2.000 de ore lucrătoare și îl înmulțim cu dependența de IT. Din venitul întârziat, presupunem că doar 35% se pierde definitiv (comanda care pleacă la concurent, clientul care nu mai revine); restul se recuperează în zilele următoare.",
          },
          {
            title: "Ce nu e în cifră",
            body: "Penalitățile din contracte, orele suplimentare de după, costul intervenției și reputația. Toate sunt reale și toate cresc cifra. Calculatorul dă un minim defendabil, nu o estimare pesimistă.",
          },
          {
            title: "La ce folosește",
            body: "Compară costul pe an cu prețul controlului care l-ar preveni: o legătură 4G de rezervă, un echipament de schimb, un backup testat lunar. În simulator vezi exact aceste comparații, pe un graf de dependențe.",
          },
        ]}
      />
      <CtaBand
        title="Pune cifra asta lângă prețul planului Nucleu."
        lead="Continuu garantează revenirea în 4 ore și răspuns în 60 de minute, 24/7, cu credit automat când nu respectăm. Calculatorul de preț îți dă factura exactă."
        primary={{ href: "/instrumente/calculator", label: "Calculează prețul" }}
        secondary={{ href: "/instrumente/simulator", label: "Deschide simulatorul" }}
      />
    </>
  );
}
