import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { site } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Clauza de divorț — pleci oricând, cu tot",
  description: "Textul integral al clauzei de ieșire din contractele Nucleu: fără durată minimă, export complet în 24 de ore, formate deschise, asistență la tranziție.",
};

export default function ClauzaPage() {
  return (
    <LegalPage
      title="Clauza de divorț"
      updated="1 septembrie 2026"
      intro="Este articolul 12 din contractul standard Nucleu, publicat integral. Îl numim „clauza de divorț” pentru că despre asta e vorba: cum pleci, dacă vrei să pleci. Un furnizor bun nu are nevoie de lacăte."
    >
      <h2>12.1 Fără durată minimă</h2>
      <p>Contractul se încheie pe durată nedeterminată și poate fi denunțat unilateral de client, oricând, cu un preaviz de 30 de zile calendaristice, prin e-mail sau din portal. Nu există penalități de reziliere, taxe de ieșire sau „luni rămase de plătit”.</p>
      <h2>12.2 Tot ce am construit e al tău</h2>
      <p>Documentația, diagramele, procedurile, configurațiile, inventarul, jurnalele, dovezile și rapoartele produse în timpul contractului sunt proprietatea clientului din momentul creării. {site.name} păstrează doar dreptul de a-și folosi metodele și instrumentele generice.</p>
      <h2>12.3 Export complet în 24 de ore</h2>
      <p>Clientul poate exporta oricând, din portal, fără aprobare, toate datele sale în formate deschise (Markdown, CSV, JSON, SVG, arhive Git). La denunțarea contractului, {site.name} livrează în plus, în maximum 24 de ore lucrătoare, un pachet complet de predare care conține:</p>
      <ul>
        <li>toate credențialele administrative (transferate securizat, apoi rotite de client);</li>
        <li>harta rețelei, inventarul și configurațiile echipamentelor;</li>
        <li>procedurile operaționale și planul de răspuns la incident;</li>
        <li>istoricul jurnalului și al dovezilor;</li>
        <li>lista furnizorilor, contractelor și expirărilor.</li>
      </ul>
      <h2>12.4 Asistență la tranziție</h2>
      <p>În perioada de preaviz, {site.name} oferă până la 8 ore de asistență gratuită noului furnizor sau echipei interne pentru preluare: explicarea arhitecturii, predarea accesului la sistemele de monitorizare și backup, verificarea că restaurarea funcționează și fără noi.</p>
      <h2>12.5 Fără dependențe ascunse</h2>
      <p>Nu folosim în infrastructura clientului componente proprietare pe care doar noi le putem opera. Toate sistemele instalate (monitorizare, backup, automatizări, documentație) rulează pe software cu licențe deschise sau comerciale transferabile, cu configurația versionată în repository-ul clientului.</p>
      <h2>12.6 Ștergerea datelor de la noi</h2>
      <p>La 30 de zile după predare, ștergem definitiv copiile de lucru ale datelor clientului din sistemele noastre și confirmăm în scris. Backup-urile offsite sunt transferate sau șterse, la alegerea clientului, cu dovadă.</p>
      <h2>12.7 Dacă noi dispărem</h2>
      <p>În caz de insolvență sau încetare a activității {site.legalName}, toate cele de mai sus se aplică automat, iar accesul clientului la portal și la exporturi rămâne activ cel puțin 90 de zile. Datele sunt structurate astfel încât orice furnizor competent să poată prelua în câteva zile.</p>
      <h2>De ce publicăm asta</h2>
      <p>Pentru că vrem să rămâi pentru că merită, nu pentru că nu poți pleca. Și pentru că, peste 100 de ani, dreptul de a ieși va fi ceea ce separă un serviciu de o captivitate. Îl luăm în serios de pe acum.</p>
    </LegalPage>
  );
}
