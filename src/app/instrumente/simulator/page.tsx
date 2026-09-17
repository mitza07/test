import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/site/CtaBand";
import { ToolHero } from "@/components/tools/ToolHero";
import { ToolNotes } from "@/components/tools/ToolNotes";
import { FailureSimulator } from "@/components/tools/FailureSimulator";

export const metadata: Metadata = {
  title: "Simulator „ce se întâmplă dacă…” — căderi și criptări pe un geamăn digital",
  description:
    "Alege ce cade sau ce e criptat în geamănul digital al unei firme demo și vezi cine nu mai poate lucra, cât durează și cât costă, în lei. Cu remedierile și economia fiecăreia.",
};

export default function SimulatorPage() {
  return (
    <>
      <ToolHero
        category="Geamăn digital"
        title={<>Ce se întâmplă dacă… <span className="text-accent-ink">cade exact asta?</span></>}
        lead="Graful de mai jos e geamănul digital al unei firme demonstrative: oameni, servicii, servere, rețea, furnizori și dependențele dintre ele. Alege un scenariu sau apasă pe un nod. Vezi imediat cine se oprește, cât durează și cât costă incidentul, plus ce l-ar face mai ieftin."
      />
      <Section wide>
        <FailureSimulator />
      </Section>
      <ToolNotes
        items={[
          {
            title: "Propagarea",
            body: "Când un nod cade, cad și cele care depind de el, în lanț, până la oameni. Propagarea se oprește la nodurile cu redundanță (marcate REDUNDANT): o legătură de rezervă sau un firewall în pereche nu lasă căderea să treacă mai departe.",
          },
          {
            title: "Cădere vs. distrugere",
            body: "Căderea costă cât durează revenirea (RTO): oamenii sunt plătiți, dar lucrează la ~30% capacitate, iar o parte din venitul întârziat se pierde definitiv (35%). Distrugerea sau criptarea adaugă datele de reintrodus de la ultimul backup (RPO) și costul intervenției, care crește cu sensibilitatea datelor.",
          },
          {
            title: "Remedierile",
            body: "Pentru nodul căzut, propunem controale standard (legătură de rezervă, echipament de schimb, restaurare exersată, replică la cald) și recalculăm pierderea cu ele. Economia e diferența pe incident; costul lunar și cel unic sunt orientative.",
          },
          {
            title: "De ce doar demo",
            body: "Un geamăn se construiește din inventarul real: 38 de noduri și 62 de dependențe aici, altele la tine. Clienții Nucleu îl au în portal, actualizat automat, cu aceleași simulări și cu riscul anual calculat din el.",
          },
        ]}
      />
      <CtaBand
        title="Vrei geamănul digital al firmei tale, nu al uneia demo?"
        lead="Îl construim în primele 30 de zile, din inventarul real. Fiecare nod are proprietar, dependențe și un cost al căderii, iar simulările rulează pe el."
        primary={{ href: "/contact?subiect=geaman", label: "Vorbește cu un arhitect" }}
        secondary={{ href: "/instrumente/audit-it", label: "Începe cu auditul gratuit" }}
      />
    </>
  );
}
