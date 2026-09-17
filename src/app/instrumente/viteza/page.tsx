import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/site/CtaBand";
import { ToolHero } from "@/components/tools/ToolHero";
import { ToolNotes } from "@/components/tools/ToolNotes";
import { SpeedTest } from "@/components/tools/SpeedTest";

export const metadata: Metadata = {
  title: "Test de viteză internet — latență, descărcare, încărcare",
  description:
    "Test de viteză fără reclame și fără urmărire: latența, descărcarea și încărcarea măsurate față de serverul Nucleu, cu explicația a ce înseamnă fiecare cifră pentru o firmă.",
};

export default function VitezaPage() {
  return (
    <>
      <ToolHero
        category="Rețea"
        title={<>Cât de repede ajungi <span className="text-accent-ink">până la noi?</span></>}
        lead="Un test simplu, fără reclame: cinci cereri pentru latență, 12 MB descărcați, 4 MB încărcați. Măsoară conexiunea dintre browserul tău și serverul Nucleu, nu viteza contractată cu furnizorul. Datele transferate sunt aleatorii și nu sunt păstrate."
      />
      <Section>
        <SpeedTest />
      </Section>
      <ToolNotes
        items={[
          {
            title: "Latența (ms)",
            body: "Timpul dus-întors al unei cereri fără conținut, mediana din cinci. Contează pentru tot ce e interactiv: ERP în cloud, Remote Desktop, videoconferințe. Sub 30 ms e excelent, 30–80 normal în România, peste 150 se simte la fiecare clic.",
          },
          {
            title: "Descărcarea (Mbps)",
            body: "Trei fișiere de 4 MB, unul după altul, pe o singură conexiune. Testele comerciale deschid mai multe conexiuni în paralel și arată cifre mai mari; noi arătăm ce vede o aplicație obișnuită. Pentru 20 de oameni, 100 Mbps reali sunt suficienți pentru muncă de birou.",
          },
          {
            title: "Încărcarea (Mbps)",
            body: "De obicei mai mică decât descărcarea, mai ales pe conexiuni rezidențiale. E cifra care contează pentru backup-ul în cloud, pentru videoconferințe și pentru transmiterile e-Factura. 100 GB de backup la 20 Mbps durează 11 ore; la 200 Mbps, o oră.",
          },
          {
            title: "Cum să-l folosești",
            body: "Repetă pe cablu și pe Wi-Fi, dimineața și la ora 15. Diferența mare între ele arată unde e problema: rețeaua internă sau furnizorul. Dacă firma depinde de internet, întrebarea următoare nu e viteza, ci ce se întâmplă când pică: vezi simulatorul.",
          },
        ]}
      />
      <CtaBand
        title="Internetul pică. Întrebarea e cât te costă și dacă ai o rezervă."
        lead="În simulator vezi ce se oprește când cade fibra și cât ar economisi o legătură 4G/5G cu comutare automată."
        primary={{ href: "/instrumente/simulator", label: "Simulează căderea fibrei" }}
        secondary={{ href: "/instrumente/cost-downtime", label: "Costul unei ore fără IT" }}
      />
    </>
  );
}
