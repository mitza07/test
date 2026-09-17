import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/site/CtaBand";
import { ToolHero } from "@/components/tools/ToolHero";
import { ToolNotes } from "@/components/tools/ToolNotes";
import { BackupRiskCalculator } from "@/components/tools/BackupRiskCalculator";

export const metadata: Metadata = {
  title: "Riscul de backup — RPO, restaurare, imutabilitate, în lei",
  description:
    "Calculator gratuit: cât de mult poți pierde și cât de probabil e ca backup-ul să nu te salveze. RPO, probabilitatea ca restaurarea să eșueze sau ca backup-ul să fie distrus odată cu datele, pierderea pe incident și pe an.",
};

export default function RiscBackupPage() {
  return (
    <>
      <ToolHero
        category="Backup"
        title={<>Backup-ul tău e o procedură <span className="text-accent-ink">sau o speranță?</span></>}
        lead="Șapte răspunsuri despre cum faci backup și primești verdictul, orele de muncă pe care le poți pierde și probabilitatea ca, în ziua incidentului, să nu ai de fapt nimic de restaurat. Totul în lei, cu ipotezele la vedere."
      />
      <Section>
        <BackupRiskCalculator />
      </Section>
      <ToolNotes
        items={[
          {
            title: "RPO și orele pierdute",
            body: "RPO e intervalul dintre backup-uri: tot ce s-a lucrat de la ultimul backup până la incident trebuie refăcut. În medie, incidentul cade la jumătatea intervalului, de aceea „ore pierdute” e jumătate din RPO. Costul: oamenii × orele × costul orar, doar pentru cele ~8 ore din 24 în care se produc date.",
          },
          {
            title: "Restaurarea eșuează",
            body: "Un backup nerestaurat niciodată eșuează, din experiență, cam în 35% din cazuri: discuri corupte, parole uitate, configurații schimbate. Testat lunar, procentul scade la 2%. E cel mai ieftin control din tot IT-ul: prima restaurare de test durează o oră.",
          },
          {
            title: "Backup-ul e distrus odată cu datele",
            body: "Un NAS din același birou, accesibil din rețea, e criptat de ransomware împreună cu serverul (45%). O copie în altă locație reduce la 12%; una imutabilă (nu poate fi modificată o perioadă) la 2%. Când oricare dintre cele două se întâmplă, pierderea nu mai e „câteva ore”, ci reconstituirea a ~30 de zile de muncă.",
          },
          {
            title: "Verdictul",
            body: "„Critic” când șansa să nu ai nimic de restaurat depășește 30%; „fragil” peste 8% sau când backup-ul e mai rar decât zilnic; „solid” altfel. Pierderea anuală presupune 15% probabilitate anuală a unui incident care distruge datele primare.",
          },
        ]}
      />
      <CtaBand
        title="Restaurare demonstrată lunar, cu durata consemnată."
        lead="La Nucleu, backup-ul 3-2-1 cu copie imutabilă e standard, iar restaurarea e exersată lunar și dovedită în portal. Dacă lipsește, primești credit automat."
        primary={{ href: "/servicii/backup-restaurare", label: "Cum facem backup" }}
        secondary={{ href: "/instrumente/audit-it", label: "Vezi tot stratul în audit" }}
      />
    </>
  );
}
