export const site = {
  name: "Nucleu",
  legalName: "Nucleu Infrastructure SRL",
  tagline: "Infrastructura care se demonstrează singură",
  description:
    "Nucleu administrează, securizează și demonstrează IT-ul firmei tale: riscul măsurat în lei, backup-ul demonstrat prin restaurări reale, intervenții automate explicate pe înțelesul tău. Alternativa la IT-ul administrat clasic — construită pentru următorii 100 de ani.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://nucleu.ro",
  email: "salut@nucleu.ro",
  phone: "+40 31 000 0000",
  address: "Str. Meridianului 12, Sector 1, București",
  cui: "RO 51 000 000",
  founded: 2026,
  assistantName: "Vega",
  responseTime: "o zi lucrătoare",
} as const;

export type NavItem = { href: string; label: string; description?: string };

export const nav: NavItem[] = [
  { href: "/servicii", label: "Capabilități" },
  { href: "/platforma", label: "Platformă" },
  { href: "/securitate", label: "Securitate" },
  { href: "/infrastructura", label: "Infrastructură" },
  { href: "/studii-de-caz", label: "Dovezi" },
  { href: "/instrumente", label: "Instrumente" },
  { href: "/preturi", label: "Prețuri" },
  { href: "/manifest", label: "Manifest 2126" },
];

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Produs",
    items: [
      { href: "/platforma", label: "Nucleu Console" },
      { href: "/portal", label: "Demo interactiv" },
      { href: "/servicii", label: "Capabilități" },
      { href: "/preturi", label: "Prețuri" },
      { href: "/garantie", label: "Garanția Nucleu" },
      { href: "/status", label: "Status public" },
    ],
  },
  {
    title: "Companie",
    items: [
      { href: "/manifest", label: "Manifest 2126" },
      { href: "/studii-de-caz", label: "Dovezi și scenarii" },
      { href: "/pentru/contabili", label: "Pentru contabili" },
      { href: "/pentru/clinici", label: "Pentru clinici" },
      { href: "/pentru/distributie", label: "Pentru distribuție" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Instrumente gratuite",
    items: [
      { href: "/instrumente/audit-it", label: "Audit IT în 15 minute" },
      { href: "/instrumente/simulator", label: "Simulator „ce se întâmplă dacă”" },
      { href: "/instrumente/email", label: "Verificare e-mail (SPF/DKIM/DMARC)" },
      { href: "/instrumente/web", label: "Igienă web" },
      { href: "/instrumente/cost-downtime", label: "Costul unei ore de nefuncționare" },
      { href: "/instrumente/calculator", label: "Calculator de preț" },
    ],
  },
  {
    title: "Legal",
    items: [
      { href: "/legal/clauza-de-divort", label: "Clauza de divorț" },
      { href: "/legal/termeni", label: "Termeni și condiții" },
      { href: "/legal/confidentialitate", label: "Confidențialitate" },
      { href: "/legal/cookies", label: "Cookie-uri" },
    ],
  },
];
