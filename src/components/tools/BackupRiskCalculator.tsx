"use client";

import { useMemo, useState } from "react";
import { backupRisk } from "@/lib/tools/backupRisk";
import { formatDuration, formatLei, formatNumber, formatPercent } from "@/lib/format";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Field, NumberField, Segmented, selectCls } from "./fields";

const frequencies = [
  { value: "1", label: "La fiecare oră" },
  { value: "4", label: "La 4 ore" },
  { value: "24", label: "Zilnic" },
  { value: "168", label: "Săptămânal" },
  { value: "8760", label: "Niciodată / nu știu" },
];
const restores = [
  { value: "20", label: "În ultimele 30 de zile" },
  { value: "60", label: "Acum 1–3 luni" },
  { value: "200", label: "Acum 3–12 luni" },
  { value: "500", label: "Acum mai mult de un an" },
  { value: "never", label: "Niciodată" },
];

const verdictTone: Record<"solid" | "fragil" | "critic", Tone> = { solid: "good", fragil: "warn", critic: "bad" };
const verdictText = {
  solid: "Lanțul de backup e solid. Rămâne de testat lunar și de urmărit retenția.",
  fragil: "Backup-ul există, dar are un punct slab care îl poate face inutil exact când contează.",
  critic: "Într-un incident real, șansele să pierzi totul sunt mari. Remedierea e ieftină față de pierdere.",
};

export function BackupRiskCalculator() {
  const [frequency, setFrequency] = useState("24");
  const [restore, setRestore] = useState("never");
  const [offsite, setOffsite] = useState<"da" | "nu">("nu");
  const [immutable, setImmutable] = useState<"da" | "nu">("nu");
  const [retention, setRetention] = useState(30);
  const [people, setPeople] = useState(15);
  const [hourlyCost, setHourlyCost] = useState(90);

  const r = useMemo(
    () =>
      backupRisk({
        frequencyHours: Number(frequency),
        lastRestoreDays: restore === "never" ? Infinity : Number(restore),
        offsite: offsite === "da",
        immutable: immutable === "da",
        retentionDays: retention,
        people,
        hourlyCostPerPerson: hourlyCost,
      }),
    [frequency, restore, offsite, immutable, retention, people, hourlyCost],
  );

  const pCatastrophic = 1 - (1 - r.restoreFailureProbability) * (1 - r.backupDestroyedProbability);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Cât de des se face backup">
            <select className={selectCls} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {frequencies.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Ultimul test de restaurare" hint="Restaurat efectiv ceva, nu doar „backup-ul a rulat”.">
            <select className={selectCls} value={restore} onChange={(e) => setRestore(e.target.value)}>
              {restores.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </Field>
          <Segmented<"da" | "nu"> label="Copie în altă locație (offsite)" value={offsite} onChange={setOffsite} options={[{ value: "da", label: "Da" }, { value: "nu", label: "Nu" }]} />
          <Segmented<"da" | "nu"> label="Copie imutabilă sau deconectată" value={immutable} onChange={setImmutable} options={[{ value: "da", label: "Da" }, { value: "nu", label: "Nu" }]} />
          <NumberField label="Retenție" hint="Câte zile în urmă poți restaura." value={retention} onChange={(n) => setRetention(Math.round(n))} min={1} max={3650} suffix="zile" />
          <NumberField label="Oameni care produc date" value={people} onChange={(n) => setPeople(Math.round(n))} min={1} max={5000} />
          <NumberField label="Cost orar pe persoană" value={hourlyCost} onChange={setHourlyCost} min={1} max={10_000} suffix="lei/h" className="sm:col-span-2" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={verdictTone[r.verdict]} className="text-sm">{r.verdict}</Badge>
            <span className="text-sm text-ink-2">{verdictText[r.verdict]}</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Pierdere anuală așteptată</div>
              <div className="num mt-1 text-3xl font-semibold tracking-tight text-bad">{formatLei(r.expectedAnnualLoss)}</div>
              <div className="text-xs text-ink-3">la 15% probabilitate anuală de incident</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Pierdere pe incident</div>
              <div className="num mt-1 text-3xl font-semibold tracking-tight text-ink">{formatLei(r.lossPerIncident)}</div>
              <div className="text-xs text-ink-3">medie ponderată: reintroducere sau reconstituire totală</div>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-3">RPO (ce poți pierde)</dt>
              <dd className="num mt-0.5 text-lg font-semibold text-ink">{formatDuration(r.rpoHours * 60)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Ore pierdute, în medie</dt>
              <dd className="num mt-0.5 text-lg font-semibold text-ink">{formatNumber(r.expectedLostHours, 1)} h</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Restaurarea eșuează</dt>
              <dd className="num mt-0.5 text-lg font-semibold text-ink">{formatPercent(r.restoreFailureProbability * 100)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Backup-ul e distrus</dt>
              <dd className="num mt-0.5 text-lg font-semibold text-ink">{formatPercent(r.backupDestroyedProbability * 100)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-ink-3">
            Șansa ca într-un incident să nu ai nimic de restaurat: <span className="num text-ink">{formatPercent(pCatastrophic * 100)}</span>. Peste 30% e „critic”, peste 8% (sau backup mai rar decât zilnic) e „fragil”.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="text-sm font-semibold text-ink">Ce spun cifrele tale</h3>
          {r.notes.length === 0 ? (
            <p className="mt-2 text-sm text-good">Niciun semnal de alarmă. Următorul pas e să consemnezi durata fiecărei restaurări de test.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {r.notes.map((n) => (
                <li key={n} className="flex gap-2 text-sm text-ink-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
                  {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
