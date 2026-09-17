import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/site/CtaBand";
import { ToolHero } from "@/components/tools/ToolHero";
import { ToolNotes } from "@/components/tools/ToolNotes";
import { EmailChecker } from "@/components/tools/EmailChecker";

export const metadata: Metadata = {
  title: "Verificare e-mail — SPF, DKIM, DMARC și MX pentru domeniul tău",
  description:
    "Verifică gratuit dacă domeniul tău de e-mail poate fi falsificat: MX, SPF, DKIM, DMARC citite din DNS-ul public, cu notă A–F, problemele găsite și ce trebuie publicat.",
};

export default function EmailToolPage() {
  return (
    <>
      <ToolHero
        category="Securitate"
        title={<>Poate cineva trimite e-mail <span className="text-accent-ink">„din partea” firmei tale?</span></>}
        lead="Citim înregistrările DNS publice ale domeniului: MX, SPF, DKIM și DMARC. Sunt exact ce văd serverele care primesc e-mailurile tale. Fără cont, fără e-mail trimis, fără nimic stocat."
      />
      <Section>
        <EmailChecker />
      </Section>
      <ToolNotes
        items={[
          {
            title: "SPF",
            body: "O listă publică a serverelor care au voie să trimită e-mail în numele domeniului. Trebuie să existe o singură înregistrare, să se termine cu -all (sau ~all) și să nu depășească 10 interogări DNS, altfel destinatarii o ignoră.",
          },
          {
            title: "DKIM",
            body: "Fiecare mesaj trimis e semnat criptografic; cheia publică stă în DNS, la un „selector”. Căutăm 14 selectori uzuali (Microsoft 365, Google, Mailjet etc.). Dacă folosești un selector propriu, poate exista fără să-l găsim.",
          },
          {
            title: "DMARC",
            body: "Spune destinatarilor ce să facă cu mesajele care pică SPF și DKIM: nimic (none), spam (quarantine) sau respingere (reject), și unde să trimită rapoartele. Doar „reject” cu rapoarte protejează cu adevărat; drumul obișnuit durează 30–60 de zile.",
          },
          {
            title: "De ce contează în lei",
            body: "Frauda cu factura falsă („am schimbat contul bancar”) e cel mai scump atac pentru firmele mici și începe aproape mereu cu un e-mail care pare al tău sau al furnizorului. DMARC pe reject închide jumătate din scenariu; procedura de verificare telefonică închide cealaltă jumătate.",
          },
        ]}
      />
      <CtaBand
        title="Vrei SPF, DKIM și DMARC puse la punct și verificate zilnic?"
        lead="La Nucleu sunt controale din stratul E-mail: configurate în prima săptămână, verificate automat în fiecare zi, cu rapoartele DMARC citite pentru tine."
        primary={{ href: "/instrumente/audit-it", label: "Vezi tot stratul de e-mail în audit" }}
        secondary={{ href: "/instrumente/phishing", label: "Testează echipa la phishing" }}
      />
    </>
  );
}
