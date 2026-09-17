"use client";

import { useState } from "react";
import { Download, FolderOpen, Check } from "lucide-react";
import { PCard, PTable, PageTitle } from "../ui";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { documents } from "@/lib/demo/state";

export function Documente() {
  const [exported, setExported] = useState(false);
  return (
    <div>
      <PageTitle title="Documente" lead="Documentația vie a firmei tale: generată din configurația reală, nu scrisă o dată și uitată. Totul e al tău, în formate deschise.">
        <Button size="sm" onClick={() => setExported(true)}>{exported ? <><Check className="size-4" /> Export pregătit (demo)</> : <><Download className="size-4" /> Exportă tot</>}</Button>
      </PageTitle>
      {exported && (
        <div className="mb-4 rounded-2xl border border-good/40 bg-good-soft/40 p-4 text-sm text-ink">
          <div className="font-medium">Arhiva de export e gata (în demo, doar simulat).</div>
          <p className="mt-1 text-ink-2">În portalul real: o arhivă cu toate documentele, configurațiile (Git), jurnalul semnat și dovezile, disponibilă în câteva minute, fără aprobare. Este Clauza de divorț, ca buton.</p>
        </div>
      )}
      <PCard padded={false}>
        <PTable
          head={["Document", "Tip", "Actualizat", "Format", ""]}
          rows={documents.map((d) => [
            <span key="n" className="flex items-center gap-2 font-medium"><FolderOpen className="size-4 text-ink-3" /> {d.name}</span>,
            <Badge key="t">{d.type}</Badge>,
            <span key="u" className="num text-xs">{d.updated}</span>,
            <span key="f" className="num text-xs">{d.format}</span>,
            <button key="d" type="button" className="text-xs text-accent-ink">descarcă</button>,
          ])}
        />
      </PCard>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <PCard title="Generate automat">
          <p className="text-sm text-ink-2">Harta rețelei, inventarul, registrul de risc și dovezile se regenerează zilnic din surse. Nu pot fi „vechi”.</p>
        </PCard>
        <PCard title="Scrise de oameni">
          <p className="text-sm text-ink-2">Procedurile și planul de răspuns sunt scrise de oameni, versionate, cu data ultimului exercițiu și cu proprietar.</p>
        </PCard>
        <PCard title="Ale tale">
          <p className="text-sm text-ink-2">Formate deschise (Markdown, CSV, JSON, SVG, Git). Orice furnizor competent le poate prelua. Fără lacăte.</p>
        </PCard>
      </div>
    </div>
  );
}
