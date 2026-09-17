"use client";

import { useMemo, useState } from "react";
import { usePortal } from "../context";
import { PCard, PTable, PageTitle, PStat } from "../ui";
import { Badge } from "@/components/ui/Badge";
import { demoTwin, type NodeKind } from "@/lib/twin";
import { cn } from "@/lib/cn";

const kindLabel: Record<NodeKind, string> = { site: "locație", person: "oameni", device: "echipament", server: "server", service: "serviciu", data: "date", network: "rețea", identity: "identități", backup: "backup", vendor: "furnizor" };

export function Inventar() {
  const { setSelectedNode, setTab } = usePortal();
  const [filter, setFilter] = useState<NodeKind | "toate">("toate");
  const items = useMemo(() => demoTwin.nodes.filter((n) => n.kind !== "person" && n.kind !== "site" && (filter === "toate" || n.kind === filter)), [filter]);
  const kinds: (NodeKind | "toate")[] = ["toate", "device", "server", "network", "service", "data", "backup", "vendor", "identity"];
  const warranties = [
    { name: "SRV-01 · Hyper-V", expires: "mar 2027", days: 178 },
    { name: "SW-DEP-01 · switch depozit", expires: "expirat 2024", days: -600 },
    { name: "FW-DEP · firewall depozit", expires: "nov 2026", days: 58 },
    { name: "AP depozit ×6", expires: "dec 2026", days: 91 },
  ];
  const licenses = [
    { name: "Microsoft 365 Business Premium", used: 30, total: 30, renew: "1 mar 2027" },
    { name: "ERP · utilizatori concurenți", used: 24, total: 25, renew: "anual · ian" },
    { name: "EDR (protecție endpoint)", used: 22, total: 25, renew: "lunar" },
    { name: "Manager de parole", used: 30, total: 30, renew: "anual · sep" },
  ];

  return (
    <div>
      <PageTitle title="Inventar" lead="Descoperit automat din rețea și agenți, validat fizic la onboarding, actualizat zilnic. Fiecare rând e un nod din geamăn.">
        {kinds.map((k) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={cn("rounded-full border px-3 py-1 text-xs", filter === k ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:text-ink")}>
            {k === "toate" ? "toate" : kindLabel[k]}
          </button>
        ))}
      </PageTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <PStat label="Echipamente monitorizate" value="37" hint="stații, servere, rețea, periferice" />
        <PStat label="Garanții care expiră în 90 zile" value="2" tone="warn" hint="plan de înlocuire în registrul deciziilor" />
        <PStat label="Firmware / patch învechit" value="3" tone="warn" hint="switch depozit, 1 multifuncțională, 1 laptop offline" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <PCard title={`Noduri (${items.length})`} className="xl:col-span-2" padded={false}>
          <PTable
            head={["Nume", "Tip", "Locație", "Stare", "Detalii"]}
            rows={items.map((n) => [
              <button key={n.id} type="button" onClick={() => { setSelectedNode(n.id); setTab("geaman"); }} className="text-left font-medium hover:text-accent-ink">{n.name}</button>,
              kindLabel[n.kind],
              n.site === "site-hq" ? "Sediu" : n.site === "site-dep" ? "Depozit" : "—",
              <Badge key="s" tone={n.health === "ok" ? "good" : n.health === "warn" ? "warn" : "bad"}>{n.health === "ok" ? "ok" : n.health === "warn" ? "atenție" : "problemă"}</Badge>,
              <span key="m" className="num text-xs">{Object.entries(n.meta).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>,
            ])}
          />
        </PCard>
        <div className="space-y-4">
          <PCard title="Garanții" padded={false}>
            <ul className="divide-y divide-line">
              {warranties.map((w) => (
                <li key={w.name} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span className="text-ink">{w.name}</span>
                  <Badge tone={w.days < 0 ? "bad" : w.days < 90 ? "warn" : "good"}>{w.expires}</Badge>
                </li>
              ))}
            </ul>
          </PCard>
          <PCard title="Licențe" padded={false}>
            <ul className="divide-y divide-line">
              {licenses.map((l) => (
                <li key={l.name} className="px-4 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink">{l.name}</span>
                    <span className="num text-xs text-ink-2">{l.used}/{l.total}</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full bg-accent" style={{ width: `${(l.used / l.total) * 100}%` }} /></div>
                  <div className="num mt-1 text-[11px] text-ink-3">reînnoire: {l.renew}</div>
                </li>
              ))}
            </ul>
          </PCard>
        </div>
      </div>
    </div>
  );
}
