import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/site/CtaBand";
import { ToolHero } from "@/components/tools/ToolHero";
import { ToolNotes } from "@/components/tools/ToolNotes";
import { PhishingQuiz } from "@/components/tools/PhishingQuiz";

export const metadata: Metadata = {
  title: "Quiz anti-phishing — 10 scenarii reale ca tipar",
  description:
    "Zece mesaje pe e-mail, SMS, telefon și Teams: decizi dacă sunt înșelătorii sau legitime, apoi vezi indiciile și explicația. Gratuit, în browser, fără cont.",
};

export default function PhishingPage() {
  return (
    <>
      <ToolHero
        category="Oameni"
        title={<>Zece mesaje. <span className="text-accent-ink">Care sunt înșelătorii?</span></>}
        lead="Tiparele reale din ultimii ani, adaptate la o firmă din România: factura cu contul schimbat, coletul blocat, „directorul” care cere carduri cadou, somația ANAF. Trei dintre ele sunt legitime, pentru că paranoia nu e o strategie. După fiecare răspuns vezi indiciile."
      />
      <Section>
        <PhishingQuiz />
      </Section>
      <ToolNotes
        items={[
          {
            title: "Regula de aur",
            body: "Orice cerere de bani, parole, coduri sau schimbare de cont bancar se confirmă pe alt canal: la un număr de telefon pe care îl aveai deja, nu la cel din mesaj. Nu contează cât de real pare expeditorul; conturile reale se compromit.",
          },
          {
            title: "Cele trei semne",
            body: "Urgența („în 24 de ore”), un domeniu aproape identic (micros0ft, meridian-ro.com) și un link sau atașament care cere autentificare. Un singur semn e suspect; două sunt aproape sigur un atac.",
          },
          {
            title: "De ce sunt și mesaje legitime",
            body: "O echipă care raportează totul ca phishing blochează munca și, în timp, nu mai raportează nimic. Notificările reale nu cer să faci clic „ca să eviți” ceva; te trimit să deschizi singur contul, pe drumul obișnuit.",
          },
          {
            title: "Scorul echipei",
            body: "Un rezultat individual spune puțin; al echipei, mult. La Nucleu, simulările de phishing sunt trimestriale, cu 10 minute de instruire după, iar procentul de clicuri apare în raportul lunar, alături de celelalte controale.",
          },
        ]}
      />
      <CtaBand
        title="Trimite quiz-ul echipei. Apoi hai să-l facem periodic."
        lead="Simulări trimestriale, instruire scurtă, procedură de dublă verificare pentru plăți: stratul E-mail din audit îți spune unde ești."
        primary={{ href: "/instrumente/audit-it", label: "Începe auditul gratuit" }}
        secondary={{ href: "/instrumente/email", label: "Verifică domeniul de e-mail" }}
      />
    </>
  );
}
