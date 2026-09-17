"use client";

import { Printer, Download } from "lucide-react";
import { usePortal } from "../context";
import { PCard, PageTitle } from "../ui";
import { Button } from "@/components/ui/Button";
import { HBars } from "@/components/charts/HBars";
import { demoRisk, demoPosture, humanHoursByMonth, restoreProof } from "@/lib/demo/state";
import { formatLei } from "@/lib/format";
import { demoTwin } from "@/lib/twin";

export function Rapoarte() {
  const { horizon } = usePortal();
  const future = horizon === "2126";
  return (
    <div>
      <PageTitle title="Rapoarte" lead="Raportul executiv lunar: o pagină, pe limba managementului. Ce a mers, ce s-a prevenit, ce riscuri rămân, ce decizii cerem.">
        <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer className="size-4" /> Tipărește</Button>
        <Button size="sm" variant="secondary"><Download className="size-4" /> PDF</Button>
      </PageTitle>
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <article className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <header className="flex items-start justify-between border-b border-line pb-4">
            <div>
              <div className="eyebrow">Raport executiv · {future ? "septembrie 2126" : "august 2026"}</div>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{demoTwin.company.name}</h3>
              <div className="text-sm text-ink-2">Plan {demoTwin.company.plan} · {demoTwin.business.people} oameni protejați · pregătit de Nucleu</div>
            </div>
            <div className="num text-right text-xs text-ink-3">pag. 1/1<br />generat automat, verificat de un om</div>
          </header>
          <section className="mt-6 grid gap-4 sm:grid-cols-4">
            {[
              { l: "Uptime servicii critice", v: "99,98%" },
              { l: "Incidente cu impact", v: future ? "0" : "1 · 41 min" },
              { l: "Risc rezidual", v: future ? formatLei(1_900) : formatLei(demoRisk.totalNow) },
              { l: "Ore umane", v: future ? "0,2 h" : `${humanHoursByMonth.values[5]} h` },
            ].map((k) => (
              <div key={k.l} className="rounded-xl bg-surface-2/70 p-3">
                <div className="text-[11px] uppercase tracking-wider text-ink-3">{k.l}</div>
                <div className="num mt-1 text-xl font-semibold text-ink">{k.v}</div>
              </div>
            ))}
          </section>
          <section className="mt-6">
            <h4 className="text-sm font-semibold text-ink">Ce a mers</h4>
            <ul className="mt-2 space-y-1 text-sm text-ink-2">
              <li>· 52 de remedieri automate (imprimare, spațiu, servicii, certificate), 0 cu impact asupra oamenilor.</li>
              <li>· Restaurare demonstrată: {restoreProof.title.toLowerCase()} în {restoreProof.value} ({restoreProof.id}).</li>
              <li>· Simulare de phishing: 28 trimise, 1 clic, 0 parole introduse; instruire de 10 minute făcută.</li>
              <li>· Onboarding automat pentru 2 colegi noi: cont funcțional în 38 și 44 de minute.</li>
            </ul>
          </section>
          <section className="mt-6">
            <h4 className="text-sm font-semibold text-ink">Ce s-a prevenit</h4>
            <ul className="mt-2 space-y-1 text-sm text-ink-2">
              <li>· 40 de încercări de autentificare pe VPN blocate automat (forță brută), niciun cont afectat.</li>
              <li>· Discul NAS-HQ ar fi ajuns la 90% pe 3 sep; retenția locală a fost ajustată pe 28 aug.</li>
              <li>· Certificatul conectorului e-Factura reînnoit cu 112 zile înainte de expirare.</li>
            </ul>
          </section>
          <section className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold text-ink">Riscuri rămase (top 3, lei/an)</h4>
              <div className="mt-3">
                <HBars data={demoRisk.lines.slice(0, 3).map((l) => ({ label: l.title, value: l.ealNow, display: formatLei(l.ealNow) }))} labelWidth={150} />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-ink">Decizii cerute</h4>
              <ol className="mt-2 space-y-2 text-sm text-ink-2">
                <li className="rounded-lg border border-warn/40 bg-warn-soft/40 p-2">1. Legătură de rezervă la depozit: 150 lei/lună + 900 lei o dată; elimină ≈ 7.400 lei/an risc. <span className="font-medium text-ink">Recomandăm da.</span></li>
                <li className="rounded-lg border border-line p-2">2. DMARC pe „reject”: fără cost, fără impact așteptat. <span className="font-medium text-ink">Recomandăm da.</span></li>
                <li className="rounded-lg border border-line p-2">3. Înlocuire switch depozit (2019): 2.400 lei; garanția a expirat. <span className="font-medium text-ink">Recomandăm în Q4.</span></li>
              </ol>
            </div>
          </section>
          <footer className="mt-6 border-t border-line pt-4 text-xs text-ink-3">
            Postura de securitate: {demoPosture.score}/100 (luna trecută 86). Toate cifrele au dovezi în portal (jurnal, DOV-…). Următoarea revizuire cu managementul: 14 octombrie, 45 de minute.
          </footer>
        </article>
        <div className="space-y-4">
          <PCard title="Arhivă" padded={false}>
            <ul className="divide-y divide-line text-sm">
              {["august 2026", "iulie 2026", "iunie 2026", "mai 2026", "aprilie 2026", "martie 2026 (onboarding)"].map((m) => (
                <li key={m} className="flex items-center justify-between px-4 py-2.5"><span className="text-ink">{m}</span><span className="num text-xs text-ink-3">PDF · 1 pag.</span></li>
              ))}
            </ul>
          </PCard>
          <PCard title="Cine primește">
            <ul className="space-y-1 text-sm text-ink-2">
              <li>· Director general (e-mail + portal)</li>
              <li>· Director financiar (portal)</li>
              <li>· Cabinet contabilitate (doar sumarul, portal)</li>
            </ul>
            <p className="mt-3 text-xs text-ink-3">Raportul nu se trimite ca atașament, ca să nu obișnuim pe nimeni cu atașamente „de la IT”.</p>
          </PCard>
        </div>
      </div>
    </div>
  );
}
