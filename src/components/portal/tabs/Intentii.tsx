"use client";

import { useState } from "react";
import { Bot, User, Check, Plus } from "lucide-react";
import { usePortal } from "../context";
import { PCard, PageTitle } from "../ui";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { intents as seed, tickets } from "@/lib/demo/state";
import { cn } from "@/lib/cn";

type Intent = (typeof seed)[number];

const templates: Record<string, { label: string; steps: { t: string; by: "auto" | "tehnician" | "uman" }[] }> = {
  angajare: { label: "Angajat nou", steps: [
    { t: "Cont Microsoft 365 + licență pe rol", by: "auto" },
    { t: "Grupuri și permisiuni derivate din rol", by: "auto" },
    { t: "Laptop din imaginea standard, criptat", by: "tehnician" },
    { t: "Acces aplicații (ERP, manager parole) pe rol", by: "auto" },
    { t: "MFA înrolat la prima autentificare", by: "auto" },
    { t: "Document de predare pentru HR", by: "auto" },
  ] },
  plecare: { label: "Plecare din firmă", steps: [
    { t: "Blocare conturi la ora stabilită", by: "auto" },
    { t: "Transfer e-mail și fișiere către manager", by: "auto" },
    { t: "Revocare ERP, VPN, manager parole, Wi-Fi", by: "auto" },
    { t: "Ștergere securizată + reimaginare laptop", by: "tehnician" },
    { t: "Verificare: 0 accese rămase (dovadă)", by: "auto" },
  ] },
  echipament: { label: "Echipament nou", steps: [
    { t: "Simulare în geamăn: impact pe segmentare", by: "auto" },
    { t: "Reguli de rețea și profil Wi-Fi", by: "uman" },
    { t: "Instalare, inventar, monitorizare", by: "tehnician" },
  ] },
  acces: { label: "Acces la o aplicație / folder", steps: [
    { t: "Verificare rol și aprobare manager", by: "auto" },
    { t: "Acordare acces cu expirare la 12 luni", by: "auto" },
    { t: "Consemnare în jurnal", by: "auto" },
  ] },
};

export function Intentii() {
  const { horizon } = usePortal();
  const [intents, setIntents] = useState<Intent[]>(seed);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<keyof typeof templates>("angajare");
  const [who, setWho] = useState("");
  const [when, setWhen] = useState("");

  function create(e: React.FormEvent) {
    e.preventDefault();
    const t = templates[kind];
    const title = `${t.label}: ${who || "—"}${when ? ` (${when})` : ""}`;
    const id = `INT-2026-${String(413 + intents.length - seed.length).padStart(4, "0")}`;
    setIntents([{ id, title, status: "creată acum · pași automați pornesc", steps: t.steps.map((s) => ({ ...s, done: false })) }, ...intents]);
    setOpen(false);
    setWho("");
    setWhen("");
  }

  return (
    <div>
      <PageTitle title="Intenții & tichete" lead={horizon === "2126" ? "În 2126 nu mai există tichete. Spui ce vrei să se întâmple; sistemul o face, o explică și o dovedește." : "Spui ce vrei să se întâmple, nu ce trebuie făcut. Pașii cunoscuți se execută automat; cei care cer mâini sau judecată au un om cu nume."}>
        <Button size="sm" onClick={() => setOpen((v) => !v)}><Plus className="size-4" /> Intenție nouă</Button>
      </PageTitle>

      {open && (
        <form onSubmit={create} className="mb-4 grid gap-3 rounded-2xl border border-accent/40 bg-accent-soft/30 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <label className="text-xs">
            <span className="font-medium text-ink">Ce se întâmplă?</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as keyof typeof templates)} className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink">
              {Object.entries(templates).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="font-medium text-ink">Cine / ce</span>
            <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Ana Pop, vânzări" className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink" />
          </label>
          <label className="text-xs">
            <span className="font-medium text-ink">Când</span>
            <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="luni, 21 sep" className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink" />
          </label>
          <Button type="submit" size="sm">Creează</Button>
          <p className="text-xs text-ink-3 sm:col-span-4">Pașii de mai jos sunt generați din șablonul firmei tale. Cei marcați „auto” pornesc imediat; cei cu om primesc responsabil și termen.</p>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {intents.map((i) => {
            const done = i.steps.filter((s) => s.done).length;
            return (
              <PCard key={i.id} title={i.title} action={<span className="num text-xs text-ink-3">{i.id} · {i.status}</span>} padded={false}>
                <ol className="divide-y divide-line">
                  {i.steps.map((s, idx) => (
                    <li key={idx} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full border", s.done ? "border-good bg-good text-white" : "border-line-2 text-transparent")}><Check className="size-3" /></span>
                      <span className={cn("flex-1", s.done ? "text-ink-2 line-through decoration-line-2" : "text-ink")}>{s.t}</span>
                      <Badge tone={s.by === "auto" ? "accent" : "neutral"}>{s.by === "auto" ? <><Bot className="size-3" /> auto</> : <><User className="size-3" /> {s.by}</>}</Badge>
                    </li>
                  ))}
                </ol>
                <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-ink-3">
                  <span>{done}/{i.steps.length} pași · {i.steps.filter((s) => s.by === "auto").length} automați</span>
                  <span className="num">timp uman estimat: {i.steps.filter((s) => s.by !== "auto").length * 25} min</span>
                </div>
              </PCard>
            );
          })}
        </div>
        <PCard title="Tichete (ce nu e o intenție)" padded={false}>
          <ul className="divide-y divide-line">
            {tickets.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-ink">{t.title}</div>
                  <span className="num shrink-0 text-xs text-ink-3">{t.id}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <Badge tone={t.status.startsWith("rezolvat") ? "good" : t.status.startsWith("așteaptă") ? "warn" : "accent"}>{t.status}</Badge>
                  <span className="num text-ink-3">{t.time} · {t.who}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-4 py-3 text-xs text-ink-3">Răspuns median luna aceasta: 11 min · garanție plan: 60 min · 68% rezolvate automat.</p>
        </PCard>
      </div>
    </div>
  );
}
