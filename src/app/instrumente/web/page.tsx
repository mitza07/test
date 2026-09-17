import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/site/CtaBand";
import { ToolHero } from "@/components/tools/ToolHero";
import { ToolNotes } from "@/components/tools/ToolNotes";
import { WebChecker } from "@/components/tools/WebChecker";

export const metadata: Metadata = {
  title: "Igienă web — HTTPS, redirecționare și antete de securitate",
  description:
    "Verifică gratuit dacă site-ul firmei trimite browserului protecțiile standard: HTTPS, redirecționare HTTP→HTTPS, HSTS, CSP, X-Frame-Options, cookie-uri Secure. Notă A–F și recomandări.",
};

export default function WebToolPage() {
  return (
    <>
      <ToolHero
        category="Securitate"
        title={<>Site-ul tău trimite browserului <span className="text-accent-ink">protecțiile standard?</span></>}
        lead="Facem două cereri, ca un browser obișnuit: una prin HTTPS și una prin HTTP, ca să vedem dacă ești redirecționat. Apoi citim opt antete de securitate și cookie-urile setate la prima vizită. Nu scanăm vulnerabilități și nu stocăm nimic."
      />
      <Section>
        <WebChecker />
      </Section>
      <ToolNotes
        items={[
          {
            title: "HTTPS și redirecționarea",
            body: "Fără HTTPS, tot ce trec vizitatorii prin site (formulare, autentificări) circulă în clar, iar scorul e tăiat la 40%. Dacă versiunea HTTP răspunde fără să trimită la HTTPS, un vizitator care tastează adresa fără „https://” rămâne neprotejat.",
          },
          {
            title: "HSTS și CSP",
            body: "Strict-Transport-Security îi spune browserului să nu mai încerce niciodată HTTP pentru domeniul tău (cerem cel puțin 180 de zile). Content-Security-Policy limitează de unde se pot încărca scripturi și e cea mai bună apărare împotriva injecțiilor de cod în pagină.",
          },
          {
            title: "Antetele mici, dar ieftine",
            body: "X-Content-Type-Options, X-Frame-Options, Referrer-Policy și Permissions-Policy sunt câte o linie de configurare fiecare. Lipsa lor nu e o breșă, dar arată că nimeni nu s-a uitat. Versiunea serverului sau X-Powered-By spun atacatorilor exact ce să caute.",
          },
          {
            title: "Ce nu verificăm",
            body: "Nu testăm certificatul în profunzime, nu căutăm vulnerabilități în aplicație și nu urmărim paginile interne. E un test de igienă, nu un test de penetrare. Remedierea completă a tot ce apare aici durează, de obicei, sub o zi.",
          },
        ]}
      />
      <CtaBand
        title="Site-ul, e-mailul și rețeaua, verificate în fiecare zi."
        lead="La Nucleu, antetele, certificatele și domeniile sunt monitorizate automat, cu alerte înainte să expire ceva. Vezi în audit unde se încadrează stratul tău web."
        primary={{ href: "/instrumente/audit-it", label: "Începe auditul gratuit" }}
        secondary={{ href: "/instrumente/email", label: "Verifică și e-mailul" }}
      />
    </>
  );
}
