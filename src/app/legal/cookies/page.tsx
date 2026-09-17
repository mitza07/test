import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Politica de cookie-uri", description: "Nu folosim cookie-uri de urmărire. Folosim doar stocare locală, strict necesară, pentru preferințele tale." };

export default function CookiesPage() {
  return (
    <LegalPage title="Politica de cookie-uri" updated="1 septembrie 2026" intro="Nu avem banner de cookie-uri pentru că nu avem cookie-uri de urmărire. Ce folosim e strict necesar și rămâne în browserul tău.">
      <h2>Ce folosim</h2>
      <ul>
        <li><strong>Preferința de temă</strong> (luminoasă / întunecată): stocată local sub cheia <code className="num">nucleu-theme</code>. Nu e trimisă nicăieri.</li>
        <li><strong>Auditul IT început</strong>: răspunsurile tale, local, sub cheia <code className="num">nucleu-audit</code>, ca să poți continua mai târziu. Le ștergi din instrument sau din setările browserului.</li>
        <li><strong>Conversația cu asistentul</strong>: păstrată doar în memoria paginii, dispare la reîncărcare.</li>
      </ul>
      <h2>Ce nu folosim</h2>
      <ul>
        <li>Cookie-uri de analiză terță (Google Analytics, Meta Pixel etc.).</li>
        <li>Cookie-uri de publicitate sau remarketing.</li>
        <li>Fonturi sau scripturi încărcate de la terți care te-ar putea urmări; fonturile sunt servite de noi.</li>
      </ul>
      <h2>Portalul clienților</h2>
      <p>Portalul real folosește un cookie de sesiune strict necesar pentru autentificare (HttpOnly, Secure, SameSite=Strict), care expiră la deconectare sau după 12 ore. Portalul demonstrativ de pe acest site nu folosește niciun cookie.</p>
    </LegalPage>
  );
}
