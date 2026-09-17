import type { Metadata } from "next";
import { PortalApp } from "@/components/portal/PortalApp";
import { isTab } from "@/components/portal/tabs";

export const metadata: Metadata = {
  title: "Nucleu Console — portal demonstrativ",
  description: "Portalul client Nucleu, cu date fictive: geamăn digital, simulări, intenții, inventar, identități, backup, securitate, registru de risc, rapoarte, jurnal, documente, facturare.",
  robots: { index: false },
};

export default async function PortalPage({ searchParams }: PageProps<"/portal">) {
  const sp = await searchParams;
  const t = typeof sp.tab === "string" ? sp.tab : "sumar";
  const initialTab = isTab(t) ? t : "sumar";
  return <PortalApp initialTab={initialTab} />;
}
