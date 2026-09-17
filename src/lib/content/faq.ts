export interface Faq {
  q: string;
  a: string;
}

export const pricingFaq: Faq[] = [
  { q: "De ce per om, nu per calculator?", a: "Pentru că protejăm oameni, nu cutii. Un om are un laptop, un telefon, un cont de e-mail, documente în cloud și acces la ERP. Numărul de calculatoare e un detaliu tehnic; numărul de oameni e ce contează pentru risc și pentru preț." },
  { q: "Ce înseamnă „totul inclus”?", a: "Toate capabilitățile, pentru toți clienții: platformă, monitorizare 24/7, backup 3-2-1 imutabil, securitate măsurată, automatizări, rapoarte, geamăn digital. Planurile diferă doar prin garanții (cât de repede răspundem și revenim) și prin cât de aproape stăm de management." },
  { q: "Există contract minim?", a: "Nu. Plătești lunar, pleci oricând, cu tot ce am construit exportat în 24 de ore. Este Clauza de divorț, scrisă în contract și publicată pe site." },
  { q: "Cum funcționează creditele automate?", a: "Fiecare garanție încălcată (răspuns întârziat, revenire peste RTO, date pierdute peste RPO, restaurare nedemonstrată) generează automat un credit pe factura următoare. Nu trebuie cerut, nu trebuie dovedit de tine: platforma îl calculează din propriul jurnal." },
  { q: "De ce scade prețul în fiecare an?", a: "Pentru că automatizarea noastră lucrează pentru tine. Cu cât operăm mai mult infrastructura ta, cu atât consumă mai puține ore umane. Împărțim câștigul: −3% pe an la prețul per om, 5 ani la rând." },
  { q: "Ce nu e inclus?", a: "Hardware-ul și licențele terților (Microsoft, antivirus, echipamente) se facturează la costul lor, cu factura furnizorului vizibilă. Proiectele mari (sediu nou, migrare de ERP) au ofertă separată, cu estimare în scris înainte." },
  { q: "Cum arată onboarding-ul?", a: "Audit gratuit (online în 15 minute sau la sediu într-o oră), apoi 30 de zile de stabilizare: geamănul digital, backup demonstrat, MFA, monitorizare. Fără taxă de instalare." },
  { q: "Putem începe doar cu o parte?", a: "Da: intervenții la oră (190 lei/oră, prima oră de diagnostic gratuită) sau doar monitorizarea e-Factura pentru un cabinet. Dar modelul funcționează cel mai bine întreg: riscul se reduce în lanț, nu pe bucăți." },
];

export const generalFaq: Faq[] = [
  { q: "Ce e diferit față de un furnizor clasic de IT administrat?", a: "Trei lucruri: (1) fiecare afirmație vine cu o dovadă verificabilă, nu cu un raport de activitate; (2) riscul e exprimat în lei, cu ipotezele la vedere; (3) nu există lock-in: pleci oricând, cu tot. În rest, facem aceleași lucruri, dar automatizate, măsurate și explicate." },
  { q: "Datele mele unde stau?", a: "Backup-urile stau în regiuni din Uniunea Europeană, criptate. În planul Suveran, cheile sunt ale tale. Documentația și jurnalele sunt în portalul tău și pot fi exportate oricând." },
  { q: "Folosiți AI?", a: "Da, acolo unde aduce timp înapoi și poate fi verificat: clasificarea solicitărilor, remedieri cunoscute, generarea rapoartelor, asistentul Vega. Fiecare acțiune a unui agent e în jurnal, cu motivul, și are un buton de oprire." },
  { q: "Ce se întâmplă dacă Nucleu dispare?", a: "Tot ce am construit e în formate deschise, în portalul tău, exportabil. Orice furnizor competent poate prelua în câteva zile. Principiul 10: construit pentru 100 de ani, fără să depindă de noi." },
];
