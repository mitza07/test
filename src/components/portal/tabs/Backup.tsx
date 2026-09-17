"use client";

import { PCard, PTable, PageTitle, PStat } from "../ui";
import { Badge } from "@/components/ui/Badge";
import { Proof } from "@/components/ui/Proof";
import { Sparkline } from "@/components/charts/Sparkline";
import { restoreProof } from "@/lib/demo/state";
import { proofId } from "@/lib/format";

const drills = [
  { date: "16 sep 2026 03:41", what: "ERP complet (VM + bază de date)", duration: "7 min 12 s", result: "reușit · integritate verificată", id: proofId("restore", "2026-09-16", 41) },
  { date: "14 aug 2026 03:40", what: "Server de fișiere · 3,1 TB", duration: "38 min", result: "reușit", id: proofId("restore", "2026-08-14", 40) },
  { date: "12 iul 2026 03:42", what: "Mailbox M365 · 1 utilizator, 6 luni", duration: "4 min 10 s", result: "reușit", id: proofId("restore", "2026-07-12", 39) },
  { date: "10 iun 2026 03:41", what: "SRV-01 complet, pe mediu izolat", duration: "52 min", result: "reușit · 1 pas de îmbunătățit (rețea)", id: proofId("restore", "2026-06-10", 38) },
  { date: "9 mai 2026 03:40", what: "Baza de date ERP · punct în timp", duration: "9 min 30 s", result: "reușit", id: proofId("restore", "2026-05-09", 37) },
];

export function Backup() {
  return (
    <div>
      <PageTitle title="Backup & restaurări" lead="Nu urmărim dacă backup-ul „a rulat”. Urmărim dacă restaurarea funcționează: lunar, cronometrată, consemnată." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PStat label="RPO efectiv" value="1 h" tone="good" hint="ultimul backup verificat: azi 09:00 · garanție: 1 h" />
        <PStat label="Copie imutabilă" value="90 zile" hint="regiune UE · nu poate fi modificată sau ștearsă" />
        <PStat label="Ultimul restore demonstrat" value={restoreProof.value} tone="good" hint="16 sep · ERP complet · garanție RTO: 4 h" />
        <PStat label="Verificare integritate" value="zilnic" hint="0 erori în 194 de zile" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <PCard title="Lanțul 3-2-1" className="xl:col-span-2">
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              { n: "1", title: "Producție", body: "SRV-01 (ERP, fișiere, identități) + Microsoft 365", meta: "snapshot la 1 h" },
              { n: "2", title: "Local · NAS-HQ", body: "24 TB, 61% folosit, imutabil 14 zile, alt mediu", meta: "backup la 1 h · retenție 30 zile" },
              { n: "3", title: "Offsite · UE", body: "Regiune eu-central, criptat, imutabil 90 zile, chei separate", meta: "zilnic 02:00 + M365 zilnic" },
            ].map((s) => (
              <li key={s.n} className="rounded-xl border border-line p-4">
                <div className="num text-xs text-ink-3">copia {s.n}</div>
                <div className="mt-1 font-medium text-ink">{s.title}</div>
                <div className="mt-1 text-sm text-ink-2">{s.body}</div>
                <div className="num mt-2 text-xs text-ink-3">{s.meta}</div>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2/70 p-3">
            <div className="text-xs text-ink-2">Durata restaurărilor demonstrate (ERP), ultimele 6 luni</div>
            <Sparkline data={[11.2, 9.5, 9.8, 8.4, 7.9, 7.2]} labels={["apr", "mai", "iun", "iul", "aug", "sep"]} width={180} height={40} suffix=" min" decimals={1} tone="good" />
          </div>
        </PCard>
        <Proof id={restoreProof.id} title={restoreProof.title} value={restoreProof.value} when={restoreProof.when} method={restoreProof.method} />
      </div>
      <PCard title="Restaurări demonstrate" className="mt-4" padded={false}>
        <PTable
          head={["Când", "Ce", "Durată", "Rezultat", "Dovadă"]}
          rows={drills.map((d) => [
            <span key="d" className="num text-xs">{d.date}</span>,
            d.what,
            <span key="t" className="num">{d.duration}</span>,
            <Badge key="r" tone="good">{d.result}</Badge>,
            <code key="i" className="num text-[11px] text-ink-3">{d.id}</code>,
          ])}
        />
      </PCard>
    </div>
  );
}
