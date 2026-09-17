import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/site/CtaBand";
import { ToolHero } from "@/components/tools/ToolHero";
import { ToolNotes } from "@/components/tools/ToolNotes";
import { AuditWizard } from "@/components/tools/AuditWizard";

export const metadata: Metadata = {
  title: "Audit IT în 15 minute — 24 de întrebări, 7 straturi, riscul în lei",
  description:
    "Audit IT gratuit, fără cont: răspunzi la 24 de întrebări pe 7 straturi și primești scorul, pierderea anuală așteptată în lei și primele 5 acțiuni, cu economia fiecăreia. Rulează în browser.",
};

export default function AuditItPage() {
  return (
    <>
      <ToolHero
        category="Risc"
        title={<>Audit IT în 15 minute. <span className="text-accent-ink">Rezultatul e în lei, nu în culori.</span></>}
        lead="24 de întrebări pe 7 straturi: identitate, dispozitive, rețea, e-mail, backup, monitorizare, răspuns. La final: scorul, opt scenarii de risc cu pierderea anuală așteptată și primele acțiuni, ordonate după cât economisesc. Totul rulează în browserul tău; răspunsurile se salvează doar local, ca să poți continua mai târziu."
      />
      <Section>
        <AuditWizard />
      </Section>
      <ToolNotes
        items={[
          {
            title: "Scorul pe strat",
            body: "Fiecare răspuns valorează între 0 (control lipsă) și 1 (control complet). Scorul unui strat e media întrebărilor lui, iar scorul general e media celor 7 straturi. Sub 60 e roșu, 60–85 galben, peste 85 verde.",
          },
          {
            title: "Pierderea anuală așteptată (EAL)",
            body: "Pentru fiecare dintre cele 8 scenarii (ransomware, server defect, cont compromis, fraudă cu factură, pană de internet, laptop pierdut, fost angajat cu acces, omul-cheie pleacă) înmulțim probabilitatea anuală cu impactul în lei. Controalele tale scad probabilitatea, iar cele de recuperare scad impactul. Ipoteza fiecărui scenariu e scrisă lângă el.",
          },
          {
            title: "Economia unei acțiuni",
            body: "Recalculăm toate scenariile ca și cum acel control ar fi complet și raportăm diferența. Ordonăm după economie împărțită la efort: o zi, o săptămână sau un proiect. Așa vezi ce merită făcut luni dimineață.",
          },
          {
            title: "Ce nu e",
            body: "Nu e o evaluare tehnică și nu înlocuiește un audit cu acces la sisteme. E un ordin de mărime, construit ca să poată fi contestat: costul orar (90 lei), orele lucrătoare (2.000/an) și ipotezele sunt la vedere. Auditul complet, cu un om, e gratuit.",
          },
        ]}
      />
      <CtaBand
        title="Vrei auditul complet, cu acces la sisteme și cu un om?"
        lead="Verificăm ce ai răspuns, măsurăm ce se poate măsura și îți lăsăm un raport pe care îl poți duce oricui. Gratuit, fără obligații."
        primary={{ href: "/contact?subiect=audit", label: "Programează auditul gratuit" }}
        secondary={{ href: "/instrumente/simulator", label: "Încearcă simulatorul" }}
      />
    </>
  );
}
