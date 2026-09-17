export interface PhishingScenario {
  id: string;
  channel: "e-mail" | "SMS" | "telefon" | "Teams";
  from: string;
  subject: string;
  body: string;
  /** Indicii vizibile (afișate după răspuns). */
  clues: string[];
  isPhishing: boolean;
  explanation: string;
}

export const phishingScenarios: PhishingScenario[] = [
  { id: "p1", channel: "e-mail", from: "Microsoft <no-reply@micros0ft-security.com>", subject: "Contul tău va fi suspendat în 24 de ore", body: "Am detectat activitate neobișnuită. Confirmă-ți identitatea aici pentru a evita suspendarea: http://micros0ft-security.com/verify", clues: ["Domeniu falsificat („micros0ft” cu zero)", "Presiune de timp", "Link către un site care nu e microsoft.com"], isPhishing: true, explanation: "Microsoft nu trimite avertismente cu termen de 24 de ore către link-uri externe. Verifică mereu domeniul expeditorului și al link-ului." },
  { id: "p2", channel: "e-mail", from: "Andreea Ionescu <andreea.ionescu@meridian.ro>", subject: "Raport vânzări septembrie", body: "Salut, atașat raportul de vânzări pe septembrie, așa cum am discutat ieri în ședință. Spune-mi dacă vrei și defalcarea pe regiuni.", clues: ["Expeditor intern cunoscut", "Context real (ședința de ieri)", "Fără cerere urgentă sau link"], isPhishing: false, explanation: "Un e-mail obișnuit între colegi. Nu orice atașament e periculos: contextul și lipsa presiunii sunt semne bune. Totuși, dacă nu ai discutat ieri nimic, întreabă." },
  { id: "p3", channel: "telefon", from: "„Departamentul IT”", subject: "Apel: „Avem o problemă cu contul tău”", body: "Bună ziua, sunt de la IT. Avem un incident și trebuie să vă resetăm parola acum. Îmi puteți dicta codul pe care tocmai l-ați primit prin SMS?", clues: ["Cere codul MFA", "Urgență", "Nu poți verifica cine sună"], isPhishing: true, explanation: "Nimeni legitim nu cere codul MFA prin telefon. Codul e al tău; cine îl cere vrea să intre în contul tău." },
  { id: "p4", channel: "e-mail", from: "Furnizor Ambalaje SRL <contabilitate@furnizor-ambalaje.ro>", subject: "Actualizare date bancare — factura 4471", body: "Bună ziua, vă informăm că am schimbat contul bancar. Vă rugăm să efectuați plata facturii 4471 în noul cont: RO49 BTRL ... Mulțumim.", clues: ["Schimbare de cont bancar", "Cerere de plată", "Fără confirmare pe alt canal"], isPhishing: true, explanation: "Cel mai scump tip de fraudă pentru firme mici. Regula: orice schimbare de cont se confirmă telefonic, la un număr pe care îl aveai deja, nu la cel din e-mail." },
  { id: "p5", channel: "SMS", from: "+40 7xx xxx xxx", subject: "SMS: coletul tău e blocat", body: "Coletul dvs. nu a putut fi livrat. Achitați taxa vamală de 4,90 lei: https://posta-ro-livrare.top/plata", clues: ["Domeniu .top, fără legătură cu Poșta Română", "Sumă mică, pentru a părea inofensiv", "Cere date de card"], isPhishing: true, explanation: "Taxa mică e momeala; scopul e cardul. Curierii reali nu cer plata vamală prin link-uri către domenii aleatorii." },
  { id: "p6", channel: "Teams", from: "Mihai Popa (Director General)", subject: "Mesaj Teams: „Ești la birou?”", body: "Salut, sunt într-o ședință și nu pot vorbi. Am nevoie urgent să cumperi 5 carduri cadou de 500 lei pentru un client și să-mi trimiți codurile. Îți decontez după.", clues: ["Cerere neobișnuită de la un superior", "Urgență + imposibilitatea de a vorbi", "Carduri cadou = bani greu de urmărit"], isPhishing: true, explanation: "Tiparul clasic „CEO fraud”. Chiar dacă mesajul vine dintr-un cont real (compromis), cererea e anormală: confirmă prin telefon sau față în față." },
  { id: "p7", channel: "e-mail", from: "Google <no-reply@accounts.google.com>", subject: "Conectare nouă pe Windows", body: "Contul tău a fost folosit pentru conectare de pe un dispozitiv Windows nou. Dacă ai fost tu, poți ignora acest e-mail. Dacă nu, verifică activitatea din Contul Google.", clues: ["Domeniu real (accounts.google.com)", "Nu cere nimic urgent", "Te trimite în cont, nu la un link ciudat"], isPhishing: false, explanation: "Notificare de securitate reală. Semnul bun: nu îți cere să faci clic pe un link ca să „eviți” ceva. Verifică deschizând singur contul, nu din e-mail." },
  { id: "p8", channel: "e-mail", from: "ANAF <notificari@anaf-declaratii.info>", subject: "Somație: neregularități fiscale — răspundeți în 48h", body: "În urma controlului, s-au constatat neregularități. Descărcați somația atașată (Somatie_ANAF.zip) și răspundeți în 48 de ore pentru a evita sancțiunile.", clues: ["Domeniu fals (.info)", "Atașament .zip", "Amenințare + termen"], isPhishing: true, explanation: "ANAF comunică prin SPV, nu prin arhive .zip pe e-mail. Atașamentele arhivate cu „somații” sunt purtătoare clasice de ransomware." },
  { id: "p9", channel: "e-mail", from: "Nucleu <salut@nucleu.ro>", subject: "Raportul lunar septembrie e gata", body: "Bună, raportul lunar e disponibil în portal. Ca de obicei, nu îl atașăm pe e-mail: intră în portal din marcajul tău sau din aplicație. Rezumat: 0 incidente, restaurare demonstrată în 7 min.", clues: ["Nu conține link de autentificare", "Te trimite la marcajul tău, nu la un link", "Ton obișnuit, fără urgență"], isPhishing: false, explanation: "Așa ar trebui să arate un e-mail legitim de la un furnizor: fără link-uri de login, fără urgență. Dacă ai dubii, intră în portal pe drumul tău obișnuit." },
  { id: "p10", channel: "e-mail", from: "HR <hr@meridian-ro.com>", subject: "Noua politică de concedii — semnează până vineri", body: "Salut, te rog citește și semnează noua politică de concedii în portalul HR: https://meridian-ro.com/hr/login. Trebuie să te autentifici cu contul de Microsoft.", clues: ["Domeniu asemănător, dar diferit (meridian-ro.com vs meridian.ro)", "Cere autentificare Microsoft pe un site extern", "Termen (vineri)"], isPhishing: true, explanation: "Pagina de „login Microsoft” e o copie care îți ia parola. Domeniul e aproape identic cu cel real: exact de aceea funcționează." },
];

export function phishingScore(answers: Record<string, boolean>): { correct: number; total: number; pct: number; verdict: string } {
  const total = phishingScenarios.length;
  const correct = phishingScenarios.filter((s) => answers[s.id] !== undefined && answers[s.id] === s.isPhishing).length;
  const pct = Math.round((correct / total) * 100);
  const verdict =
    pct >= 90 ? "Excelent. Ești un filtru mai bun decât majoritatea software-ului." :
    pct >= 70 ? "Bine. Câteva tipare încă te pot păcăli; regula de aur rămâne confirmarea pe alt canal." :
    pct >= 50 ? "Mediu. Cu 10 minute de instruire pe lună, scorul urcă repede." :
    "Riscant. Nu e o judecată: aceste atacuri sunt făcute să păcălească oameni ocupați. Merită o sesiune scurtă cu toată echipa.";
  return { correct, total, pct, verdict };
}
