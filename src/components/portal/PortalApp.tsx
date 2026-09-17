"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, GitBranch, Wand2, ListChecks, Boxes, Users, DatabaseBackup, ShieldCheck, Coins, FileText, ScrollText, FolderOpen, Receipt, ArrowLeft, Menu, X, Clock,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { demoTwin, type FailureMode } from "@/lib/twin";
import { PortalContext, type Horizon } from "./context";
import { tabIds, type Tab } from "./tabs";
import { Sumar } from "./tabs/Sumar";
import { Geaman } from "./tabs/Geaman";
import { Simulari } from "./tabs/Simulari";
import { Intentii } from "./tabs/Intentii";
import { Inventar } from "./tabs/Inventar";
import { Identitati } from "./tabs/Identitati";
import { Backup } from "./tabs/Backup";
import { Securitate } from "./tabs/Securitate";
import { Risc } from "./tabs/Risc";
import { Rapoarte } from "./tabs/Rapoarte";
import { Jurnal } from "./tabs/Jurnal";
import { Documente } from "./tabs/Documente";
import { Facturare } from "./tabs/Facturare";

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "sumar", label: "Sumar", icon: LayoutDashboard },
  { id: "geaman", label: "Geamăn digital", icon: GitBranch },
  { id: "simulari", label: "Simulări", icon: Wand2 },
  { id: "intentii", label: "Intenții & tichete", icon: ListChecks },
  { id: "inventar", label: "Inventar", icon: Boxes },
  { id: "identitati", label: "Identități", icon: Users },
  { id: "backup", label: "Backup & restaurări", icon: DatabaseBackup },
  { id: "securitate", label: "Securitate", icon: ShieldCheck },
  { id: "risc", label: "Registru de risc", icon: Coins },
  { id: "rapoarte", label: "Rapoarte", icon: FileText },
  { id: "jurnal", label: "Jurnal", icon: ScrollText },
  { id: "documente", label: "Documente", icon: FolderOpen },
  { id: "facturare", label: "Facturare", icon: Receipt },
];

export function PortalApp({ initialTab }: { initialTab: Tab }) {
  const [tab, setTabState] = useState<Tab>(initialTab);
  const [horizon, setHorizon] = useState<Horizon>("2026");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [sim, setSim] = useState<{ nodeId: string; mode: FailureMode } | null>(null);
  const [menu, setMenu] = useState(false);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    setMenu(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", t);
      window.history.replaceState(null, "", url.toString());
    } catch {}
  }, []);

  const simulate = useCallback(
    (nodeId: string, mode: FailureMode = "outage") => {
      setSim({ nodeId, mode });
      setSelectedNode(nodeId);
      setTab("simulari");
    },
    [setTab],
  );

  useEffect(() => {
    const onPop = () => {
      try {
        const t = new URL(window.location.href).searchParams.get("tab") as Tab | null;
        if (t && tabIds.includes(t)) setTabState(t);
      } catch {}
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const ctx = useMemo(() => ({ horizon, setHorizon, tab, setTab, selectedNode, setSelectedNode, simulate, sim }), [horizon, tab, setTab, selectedNode, simulate, sim]);

  const Panel = {
    sumar: Sumar, geaman: Geaman, simulari: Simulari, intentii: Intentii, inventar: Inventar, identitati: Identitati, backup: Backup, securitate: Securitate, risc: Risc, rapoarte: Rapoarte, jurnal: Jurnal, documente: Documente, facturare: Facturare,
  }[tab];

  return (
    <PortalContext.Provider value={ctx}>
      <div className="flex min-h-screen flex-col bg-bg">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-surface px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <button type="button" className="inline-flex size-9 items-center justify-center rounded-lg text-ink hover:bg-surface-2 lg:hidden" onClick={() => setMenu((v) => !v)} aria-label="Meniu" aria-expanded={menu}>
              {menu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Link href="/" aria-label="Nucleu — site"><Logo /></Link>
            <span className="hidden text-sm text-ink-3 sm:inline">· Console</span>
            <span className="hidden items-center gap-2 rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 md:inline-flex">
              <span className="live-dot" aria-hidden /> {demoTwin.company.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-full border border-line bg-surface-2 p-0.5 text-xs sm:flex" role="group" aria-label="Orizont">
              <Clock className="ml-2 size-3.5 text-ink-3" aria-hidden />
              {(["2026", "2126"] as Horizon[]).map((h) => (
                <button key={h} type="button" onClick={() => setHorizon(h)} aria-pressed={horizon === h} className={cn("num rounded-full px-2.5 py-1", horizon === h ? "bg-ink text-bg" : "text-ink-2 hover:text-ink")}>
                  {h}
                </button>
              ))}
            </div>
            <Badge mono tone="accent">demo · date fictive</Badge>
            <ThemeToggle />
            <Link href="/" className="hidden items-center gap-1 text-sm text-ink-2 hover:text-ink md:inline-flex"><ArrowLeft className="size-4" /> Site</Link>
          </div>
        </header>

        {horizon === "2126" && (
          <div className="border-b border-accent/30 bg-accent-soft/60 px-4 py-2 text-center text-xs text-ink">
            <span className="num font-medium">Orizont 2126</span> · Așa arată același portal când infrastructura devine complet autonomă: oamenii stabilesc limite, sistemul le respectă și dovedește că le respectă. Cifrele sunt o proiecție, nu o promisiune.
          </div>
        )}

        <div className="flex flex-1">
          <aside className={cn("fixed inset-y-14 left-0 z-30 w-64 shrink-0 overflow-y-auto border-r border-line bg-surface p-3 transition-transform lg:static lg:translate-x-0", menu ? "translate-x-0" : "-translate-x-full")}>
            <nav aria-label="Module">
              <ul className="space-y-0.5">
                {tabs.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setTab(t.id)}
                      aria-current={tab === t.id ? "page" : undefined}
                      className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm", tab === t.id ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}
                    >
                      <t.icon className={cn("size-4", tab === t.id ? "text-accent-ink" : "text-ink-3")} />
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-6 rounded-xl border border-dashed border-line-2 p-3 text-xs text-ink-3">
              Portal demonstrativ. Tot ce vezi aici e ce ar vedea clientul: nicio consolă ascunsă.
            </div>
          </aside>
          {menu && <div className="fixed inset-0 z-20 bg-ink/30 lg:hidden" onClick={() => setMenu(false)} aria-hidden />}
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            <Panel />
          </main>
        </div>
      </div>
    </PortalContext.Provider>
  );
}
