import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import { site } from "@/lib/content/site";

export const metadata: Metadata = { title: "Termeni și condiții", description: "Termenii de utilizare a site-ului nucleu.ro, a instrumentelor gratuite și a portalului demonstrativ." };

export default function TermeniPage() {
  return (
    <LegalPage title="Termeni și condiții" updated="1 septembrie 2026" intro={`Acești termeni reglementează folosirea site-ului ${site.url.replace("https://", "")}, a instrumentelor gratuite și a portalului demonstrativ. Serviciile contractate au propriul contract, al cărui articol 12 este publicat ca Clauza de divorț.`}>
      <h2>1. Cine suntem</h2>
      <p>{site.legalName}, {site.address}, {site.cui}. Contact: {site.email}.</p>
      <h2>2. Instrumentele gratuite</h2>
      <p>Instrumentele din secțiunea „Instrumente” sunt oferite gratuit, fără cont, „ca atare”. Rezultatele sunt estimări bazate pe ipoteze afișate explicit și nu constituie audit contractual, consultanță juridică sau garanție. Verificatorul de e-mail și cel de igienă web interoghează exclusiv informații publice (DNS, antete HTTP) ale domeniului pe care îl introduci; folosește-le doar pentru domenii pe care ai dreptul să le verifici.</p>
      <p>Verificatorul de parole rulează integral în browser; nu transmitem parola nicăieri. Testul de viteză măsoară conexiunea către serverul nostru.</p>
      <h2>3. Portalul demonstrativ</h2>
      <p>Portalul demo conține exclusiv date fictive despre o firmă inventată („Meridian Distribuție SRL”). Orice asemănare cu firme reale este întâmplătoare. Acțiunile din demo nu au efect în lumea reală.</p>
      <h2>4. Asistentul {site.assistantName}</h2>
      <p>Asistentul răspunde din conținutul public al site-ului și, dacă e configurat, folosind un model de limbaj. Răspunsurile pot conține erori; pentru decizii contractuale, vorbește cu un om. Nu introduce în asistent date personale sau confidențiale.</p>
      <h2>5. Proprietate intelectuală</h2>
      <p>Conținutul site-ului (texte, modele, cod al instrumentelor) aparține {site.legalName}. Modelele de calcul (risc, audit, preț) pot fi citate cu menționarea sursei. Numele și mărcile terților aparțin proprietarilor lor.</p>
      <h2>6. Limitarea răspunderii</h2>
      <p>În limitele legii, nu răspundem pentru decizii luate exclusiv pe baza instrumentelor gratuite. Serviciile contractate au garanții explicite, cu credite automate, descrise în <Link href="/garantie">Garanția Nucleu</Link>.</p>
      <h2>7. Modificări</h2>
      <p>Putem actualiza acești termeni; data ultimei actualizări e afișată sus. Modificările importante sunt anunțate pe site cu 30 de zile înainte.</p>
      <h2>8. Legea aplicabilă</h2>
      <p>Legea română. Litigiile se soluționează amiabil, apoi de instanțele competente din București.</p>
    </LegalPage>
  );
}
