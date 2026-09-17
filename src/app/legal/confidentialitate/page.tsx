import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { site } from "@/lib/content/site";

export const metadata: Metadata = { title: "Politica de confidențialitate", description: "Ce date colectăm pe nucleu.ro, de ce, cât timp și ce drepturi ai." };

export default function ConfidentialitatePage() {
  return (
    <LegalPage title="Politica de confidențialitate" updated="1 septembrie 2026" intro="Pe scurt: colectăm cât mai puțin, nu vindem nimic, nu urmărim nimic ce nu e necesar, și îți spunem exact ce facem cu ce ne dai.">
      <h2>1. Operatorul</h2>
      <p>{site.legalName}, {site.address}. Responsabil cu protecția datelor: {site.email}.</p>
      <h2>2. Ce date colectăm și de ce</h2>
      <ul>
        <li><strong>Formularul de contact:</strong> nume, firmă, e-mail, telefon, mesaj. Scop: să îți răspundem. Temei: interesul legitim / pașii premergători unui contract. Păstrare: 24 de luni sau până ceri ștergerea.</li>
        <li><strong>Instrumentele gratuite:</strong> domeniul sau adresa web pe care le introduci sunt procesate pe serverul nostru pentru a genera rezultatul și nu sunt stocate. Auditul IT și calculatoarele rulează în browserul tău; răspunsurile sunt salvate doar în browserul tău (localStorage), dacă îl permiți.</li>
        <li><strong>Asistentul {site.assistantName}:</strong> mesajele sunt procesate pentru a genera răspunsul. Dacă este activ un model de limbaj extern, textul conversației e transmis furnizorului respectiv sub un acord de prelucrare. Nu introduce date personale ale altor persoane.</li>
        <li><strong>Jurnale tehnice:</strong> adresa IP și cererile HTTP, pentru securitate și limitare de abuz, păstrate maximum 30 de zile.</li>
      </ul>
      <h2>3. Ce nu facem</h2>
      <ul>
        <li>Nu folosim cookie-uri de urmărire sau publicitate.</li>
        <li>Nu vindem, nu închiriem și nu „partajăm cu parteneri” datele tale.</li>
        <li>Nu trimitem newslettere fără acordul tău explicit.</li>
      </ul>
      <h2>4. Unde stau datele</h2>
      <p>Pe servere din Uniunea Europeană. Pentru clienți, backup-urile stau în regiuni UE, criptate; în planul Suveran, cheile sunt ale clientului.</p>
      <h2>5. Drepturile tale</h2>
      <p>Acces, rectificare, ștergere, restricționare, portabilitate, opoziție. Scrie-ne la {site.email}; răspundem în maximum 30 de zile. Te poți adresa și ANSPDCP (dataprotection.ro).</p>
      <h2>6. Clienți</h2>
      <p>Pentru datele prelucrate în numele clienților (în infrastructura lor), acționăm ca persoană împuternicită, în baza acordului de prelucrare anexat contractului. Detaliile subîmputerniciților (furnizori de cloud pentru backup, monitorizare) sunt în anexa contractului și în portal.</p>
    </LegalPage>
  );
}
