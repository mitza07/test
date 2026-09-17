"use client";

import { useState } from "react";
import { Bot, User, Sparkles } from "lucide-react";
import { usePortal } from "../context";
import { PCard, PageTitle } from "../ui";
import { Badge } from "@/components/ui/Badge";
import { journal, type JournalEntry } from "@/lib/demo/state";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const kinds: Record<JournalEntry["kind"], { label: string; tone: "good" | "accent" | "warn" | "bad" | "neutral" }> = {
  remediere: { label: "remediere", tone: "good" },
  dovadă: { label: "dovadă", tone: "accent" },
  securitate: { label: "securitate", tone: "warn" },
  intenție: { label: "intenție", tone: "accent" },
  schimbare: { label: "schimbare", tone: "neutral" },
  alertă: { label: "alertă", tone: "bad" },
};

const future: JournalEntry[] = [
  { at: "2126-09-17T09:58:00+03:00", actor: "auto", kind: "remediere", title: "Capacitate realocată preventiv", why: "Semnal slab detectat cu 40 de minute înainte de un vârf; 3 servicii mutate fără întrerupere. Dovadă atestată de terț.", duration: "0,8 s" },
  { at: "2126-09-17T09:31:00+03:00", actor: "auto", kind: "securitate", title: "Politică de acces regenerată pentru un colaborator nou", why: "14 permisiuni derivate din rol; expiră automat la finalul contractului; nicio permisiune manuală.", duration: "0,3 s" },
  { at: "2126-09-17T08:40:00+03:00", actor: "client", kind: "intenție", title: "Apetit de risc redus la 1.500 lei/an", why: "Sistemul a recalculat garanțiile și prima de risc: +40 lei/lună. Decizie umană, 12 minute.", duration: "12 min" },
  { at: "2126-09-17T06:00:00+03:00", actor: "auto", kind: "dovadă", title: "Atestare continuă: starea declarată = starea reală", why: "Un verificator independent a confirmat 1.204 afirmații despre infrastructură; 0 discrepanțe.", duration: "3,1 s" },
];

export function Jurnal() {
  const { horizon } = usePortal();
  const [filter, setFilter] = useState<"toate" | JournalEntry["actor"]>("toate");
  const source = horizon === "2126" ? future : journal;
  const rows = source.filter((j) => filter === "toate" || j.actor === filter);
  return (
    <div>
      <PageTitle title="Jurnal" lead="Fiecare acțiune, automată sau umană, cu motivul ei în limbaj clar. Nimic nu se întâmplă în infrastructura ta fără să apară aici.">
        {(["toate", "auto", "uman", "client"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full border px-3 py-1 text-xs", filter === f ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:text-ink")}>{f}</button>
        ))}
      </PageTitle>
      <PCard padded={false}>
        <ol className="divide-y divide-line">
          {rows.map((j) => (
            <li key={j.at + j.title} className="grid gap-2 px-4 py-3 sm:grid-cols-[140px_28px_1fr_auto] sm:items-start">
              <div className="num text-xs text-ink-3">{formatDateTime(j.at)}</div>
              <div>{j.actor === "auto" ? <Bot className="size-4 text-accent-ink" aria-label="automat" /> : j.actor === "client" ? <Sparkles className="size-4 text-warn" aria-label="client" /> : <User className="size-4 text-good" aria-label="uman" />}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">{j.title} <Badge tone={kinds[j.kind].tone}>{kinds[j.kind].label}</Badge></div>
                <div className="mt-1 text-xs leading-relaxed text-ink-2"><span className="font-medium text-ink-2">De ce: </span>{j.why}</div>
              </div>
              <div className="num text-xs text-ink-3">{j.duration}</div>
            </li>
          ))}
        </ol>
      </PCard>
      <p className="mt-3 text-xs text-ink-3">Jurnalul e semnat criptografic și exportabil (JSON). Retenție: nelimitată cât ești client, apoi predat la ieșire.</p>
    </div>
  );
}
