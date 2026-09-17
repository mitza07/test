import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/site/CtaBand";
import { ToolHero } from "@/components/tools/ToolHero";
import { ToolNotes } from "@/components/tools/ToolNotes";
import { PasswordChecker } from "@/components/tools/PasswordChecker";

export const metadata: Metadata = {
  title: "Verificator de parole — rulează doar în browser",
  description:
    "Verifică rezistența unei parole fără să o trimiți nicăieri: entropie, timp estimat de spargere, tipare comune, sugestii. Plus un generator de fraze de 5 cuvinte. Rulează exclusiv în browser.",
};

export default function ParolePage() {
  return (
    <>
      <ToolHero
        category="Identitate"
        title={<>Cât rezistă parola ta? <span className="text-accent-ink">Verificată local, nu trimisă.</span></>}
        lead="Estimăm entropia, penalizăm tiparele pe care le încearcă primele orice atac (cuvinte comune, ani, secvențe de tastatură) și calculăm cât ar dura spargerea offline. Codul rulează în browserul tău; poți verifica deconectând internetul."
      />
      <Section>
        <PasswordChecker />
      </Section>
      <ToolNotes
        items={[
          {
            title: "Entropia (biți)",
            body: "Câte încercări ar trebui, în medie, ca să ghicească parola cineva care știe ce clase de caractere folosești: lungime × log₂(mărimea alfabetului). Fiecare bit dublează efortul. 40 de biți se sparg într-o pauză de cafea; 80 de biți nu se sparg în viața asta.",
          },
          {
            title: "De ce lungimea bate complexitatea",
            body: "„P@rola2024!” are 4 clase de caractere și e slabă: conține un cuvânt comun și un an. „Lanterna-Tractor-Ghiveci-Nor-42” e lungă, ușor de ținut minte și are peste 100 de biți. O frază de 4–5 cuvinte fără legătură între ele e cea mai bună parolă pe care o poți memora.",
          },
          {
            title: "Timpul de spargere",
            body: "Presupunem un atac offline, cu hash-ul parolei furat, la 10 miliarde de încercări pe secundă. Un atac online (pe o pagină de login) e de milioane de ori mai lent, dar nu te baza pe asta: parolele se scurg din baze de date, nu se ghicesc pe site.",
          },
          {
            title: "Parola nu e suficientă",
            body: "O parolă excelentă introdusă pe o pagină falsă e o parolă furată. Managerul de parole (una unică per serviciu) și MFA (al doilea factor) sunt cele două controale care contează cu adevărat; sunt primele întrebări din stratul Identitate al auditului.",
          },
        ]}
      />
      <CtaBand
        title="Manager de parole și MFA pe toate conturile, în prima săptămână."
        lead="Sunt primele controale pe care le punem la orice client, pentru că sunt cele mai ieftine și opresc cele mai multe atacuri. Vezi în audit unde ești."
        primary={{ href: "/instrumente/audit-it", label: "Începe auditul gratuit" }}
        secondary={{ href: "/instrumente/phishing", label: "Quiz anti-phishing" }}
      />
    </>
  );
}
