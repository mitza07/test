"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Printer, RotateCcw, UserRound } from "lucide-react";
import { auditQuestions, scoreAudit, type AuditAnswers, type AuditProfile } from "@/lib/audit";
import { layerLabels, layerOrder } from "@/lib/twin/risk";
import type { Layer } from "@/lib/twin/types";
import { formatLei, formatNumber, formatPercent } from "@/lib/format";
import { Gauge } from "@/components/charts/Gauge";
import { HBars } from "@/components/charts/HBars";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Meter } from "@/components/ui/Meter";
import { cn } from "@/lib/cn";
import { NumberField, Field, selectCls } from "./fields";

const STORAGE_KEY = "nucleu-audit";
const RESULTS_STEP = layerOrder.length + 1;
const TOTAL_STEPS = RESULTS_STEP + 1;

const sectors = ["Servicii", "Comerț/distribuție", "Producție", "Sănătate", "Contabilitate/juridic", "IT/creativ", "Altele"];
type Sensitivity = AuditProfile["dataSensitivity"];
const sensitivities: Array<{ value: Sensitivity; label: string; hint: string }> = [
  { value: 1, label: "Publice", hint: "nimic secret" },
  { value: 2, label: "Interne", hint: "documente de lucru" },
  { value: 3, label: "Comerciale", hint: "clienți, prețuri, contracte" },
  { value: 4, label: "Personale", hint: "date GDPR ale clienților" },
  { value: 5, label: "Medicale / financiare", hint: "reglementate, sensibile" },
];
const effortLabels: Record<1 | 2 | 3, string> = { 1: "o zi", 2: "o săptămână", 3: "un proiect" };
const defaultProfile: AuditProfile = { people: 15, annualRevenue: 5_000_000, sector: "Servicii", dataSensitivity: 3 };

interface Saved {
  profile: AuditProfile;
  answers: AuditAnswers;
  step: number;
  savedAt: string;
}

function sanitize(raw: unknown): Saved | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Saved>;
  const p = r.profile;
  if (!p || typeof p.people !== "number" || typeof p.annualRevenue !== "number") return null;
  const sens = ([1, 2, 3, 4, 5] as const).includes(p.dataSensitivity as Sensitivity) ? (p.dataSensitivity as Sensitivity) : 3;
  const profile: AuditProfile = {
    people: Math.max(1, Math.round(p.people)),
    annualRevenue: Math.max(0, p.annualRevenue),
    sector: typeof p.sector === "string" && sectors.includes(p.sector) ? p.sector : "Altele",
    dataSensitivity: sens,
  };
  const answers: AuditAnswers = {};
  if (r.answers && typeof r.answers === "object") {
    for (const q of auditQuestions) {
      const v = (r.answers as Record<string, unknown>)[q.id];
      if (typeof v === "string" && q.options.some((o) => o.value === v)) answers[q.id] = v;
    }
  }
  const step = typeof r.step === "number" && r.step >= 0 && r.step <= RESULTS_STEP ? Math.floor(r.step) : 0;
  return { profile, answers, step, savedAt: typeof r.savedAt === "string" ? r.savedAt : "" };
}

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitize(JSON.parse(raw));
  } catch {
    return null;
  }
}

/* Citire o singură dată per montare, sigură la hidratare: pe server nu există audit salvat. */
let savedSnapshot: Saved | null | undefined;
function getSnapshot(): Saved | null {
  if (savedSnapshot === undefined) savedSnapshot = readSaved();
  return savedSnapshot;
}
const getServerSnapshot = () => null;
const subscribe = () => () => {};

function persist(s: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}
function clearSaved() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function scoreTone(score: number): "good" | "warn" | "bad" {
  return score >= 85 ? "good" : score >= 60 ? "warn" : "bad";
}
const maturityTone: Record<string, Tone> = { Controlat: "good", Ordonat: "accent", Fragil: "warn", Expus: "bad" };

function probabilityText(p: number): string {
  return p >= 1 ? `${formatNumber(p, 1)} × pe an` : `${formatPercent(p * 100)} pe an`;
}

export function AuditWizard() {
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<AuditProfile>(defaultProfile);
  const [answers, setAnswers] = useState<AuditAnswers>({});
  const [touched, setTouched] = useState(false);
  const [resumeDismissed, setResumeDismissed] = useState(false);

  const answeredCount = useMemo(() => auditQuestions.filter((q) => answers[q.id] !== undefined).length, [answers]);
  const savedCount = saved ? Object.keys(saved.answers).length : 0;
  const showResume = Boolean(saved) && savedCount > 0 && !touched && !resumeDismissed;

  useEffect(() => {
    if (!touched) return;
    persist({ profile, answers, step, savedAt: new Date().toISOString() });
  }, [profile, answers, step, touched]);

  // La demontare, uită instantaneul: la următoarea montare se recitește din localStorage.
  useEffect(() => () => {
    savedSnapshot = undefined;
  }, []);

  function updateProfile(patch: Partial<AuditProfile>) {
    setTouched(true);
    setProfile((p) => ({ ...p, ...patch }));
  }
  function answer(id: string, value: string) {
    setTouched(true);
    setAnswers((a) => ({ ...a, [id]: value }));
  }
  function go(next: number) {
    setTouched(true);
    setStep(Math.max(0, Math.min(RESULTS_STEP, next)));
    if (typeof window !== "undefined") window.scrollTo({ top: Math.max(0, (document.getElementById("audit")?.offsetTop ?? 0) - 24), behavior: "smooth" });
  }
  function resume() {
    if (!saved) return;
    setProfile(saved.profile);
    setAnswers(saved.answers);
    setStep(saved.step);
    setTouched(true);
  }
  function startFresh() {
    clearSaved();
    setResumeDismissed(true);
  }
  function restart() {
    clearSaved();
    setAnswers({});
    setProfile(defaultProfile);
    setStep(0);
    setTouched(false);
    setResumeDismissed(true);
  }

  const result = useMemo(() => (step === RESULTS_STEP ? scoreAudit(answers, profile) : null), [answers, profile, step]);

  return (
    <div id="audit" className="mx-auto max-w-3xl">
      {showResume && saved && (
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent-soft/50 px-4 py-3 text-sm">
          <div>
            <span className="font-medium text-ink">Ai un audit început.</span>{" "}
            <span className="text-ink-2">
              <span className="num">{savedCount}</span> din <span className="num">{auditQuestions.length}</span> răspunsuri, salvate doar în browserul tău.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={resume}>Continuă auditul început</Button>
            <Button size="sm" variant="ghost" onClick={startFresh}>Începe de la zero</Button>
          </div>
        </div>
      )}

      {step < RESULTS_STEP && (
        <div className="no-print mb-6">
          <div className="flex items-center justify-between text-xs text-ink-2">
            <span>
              Pasul <span className="num text-ink">{step + 1}</span> din <span className="num text-ink">{TOTAL_STEPS}</span>
              {step > 0 && <span className="text-ink-3"> · {layerLabels[layerOrder[step - 1]].name}</span>}
            </span>
            <span>
              <span className="num text-ink">{answeredCount}</span>/<span className="num">{auditQuestions.length}</span> răspunsuri
            </span>
          </div>
          <Meter value={answeredCount} max={auditQuestions.length} showValue={false} label="" className="mt-2" />
        </div>
      )}

      {step === 0 && <ProfileStep profile={profile} onChange={updateProfile} />}
      {step > 0 && step < RESULTS_STEP && <LayerStep layer={layerOrder[step - 1]} answers={answers} onAnswer={answer} />}
      {step === RESULTS_STEP && result && (
        <Results result={result} profile={profile} onRestart={restart} unanswered={auditQuestions.length - answeredCount} />
      )}

      {step < RESULTS_STEP && (
        <div className="no-print mt-8 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}>
            <ArrowLeft className="size-4" aria-hidden /> Înapoi
          </Button>
          <div className="flex items-center gap-3">
            {step > 0 && (
              <span className="hidden text-xs text-ink-3 sm:inline">Întrebările lăsate fără răspuns sunt considerate control lipsă.</span>
            )}
            <Button onClick={() => go(step + 1)}>
              {step === RESULTS_STEP - 1 ? "Vezi rezultatul" : "Continuă"} <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileStep({ profile, onChange }: { profile: AuditProfile; onChange: (p: Partial<AuditProfile>) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
      <h2 className="text-xl font-semibold text-ink">Profilul firmei</h2>
      <p className="mt-1 text-sm text-ink-2">Patru date. Din ele calculăm impactul fiecărui scenariu în lei; nu le trimitem nicăieri.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <NumberField label="Oameni în firmă" hint="Angajați și colaboratori care folosesc sisteme." value={profile.people} onChange={(n) => onChange({ people: Math.round(n) })} min={1} max={5000} />
        <NumberField label="Venit anual" hint="Cifra de afaceri, aproximativ." value={profile.annualRevenue} onChange={(n) => onChange({ annualRevenue: n })} min={0} max={10_000_000_000} step={100_000} suffix="lei" />
        <Field label="Sector" hint="Influențează doar interpretarea, nu formula.">
          <select className={selectCls} value={profile.sector} onChange={(e) => onChange({ sector: e.target.value })}>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-ink">Sensibilitatea datelor</legend>
        <p className="mt-1 text-xs text-ink-3">De la 1 (publice) la 5 (medicale sau financiare). Crește costul unei scurgeri de date.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {sensitivities.map((s) => {
            const active = profile.dataSensitivity === s.value;
            return (
              <label
                key={s.value}
                className={cn(
                  "flex cursor-pointer flex-col rounded-xl border p-3 text-left text-sm transition-colors",
                  active ? "border-accent bg-accent-soft/50" : "border-line hover:bg-surface-2",
                )}
              >
                <input
                  type="radio"
                  name="sensibilitate"
                  value={s.value}
                  checked={active}
                  onChange={() => onChange({ dataSensitivity: s.value })}
                  className="sr-only"
                />
                <span className="num text-xs text-ink-3">{s.value}</span>
                <span className="mt-0.5 font-medium text-ink">{s.label}</span>
                <span className="text-xs text-ink-3">{s.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function LayerStep({ layer, answers, onAnswer }: { layer: Layer; answers: AuditAnswers; onAnswer: (id: string, value: string) => void }) {
  const questions = auditQuestions.filter((q) => q.layer === layer);
  const idx = layerOrder.indexOf(layer);
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
      <div className="num text-xs text-ink-3">Stratul {idx + 1} din {layerOrder.length} · {layerLabels[layer].short}</div>
      <h2 className="mt-1 text-xl font-semibold text-ink">{layerLabels[layer].name}</h2>
      <p className="mt-1 text-sm text-ink-2">{layerLabels[layer].description}</p>
      <ol className="mt-6 space-y-7">
        {questions.map((q, qi) => {
          const groupId = `q-${q.id}`;
          return (
            <li key={q.id}>
              <div id={groupId} className="text-[15px] font-medium leading-snug text-ink">
                <span className="num mr-2 text-xs text-ink-3">{qi + 1}.</span>
                {q.text}
              </div>
              {q.help && <p className="mt-1 pl-6 text-xs text-ink-3">{q.help}</p>}
              <div role="radiogroup" aria-labelledby={groupId} className="mt-3 grid gap-2">
                {q.options.map((o) => {
                  const active = answers[q.id] === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onAnswer(q.id, o.value)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                        active ? "border-accent bg-accent-soft/50 text-ink" : "border-line text-ink-2 hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn("size-3.5 shrink-0 rounded-full border-2", active ? "border-accent bg-accent" : "border-line-2")}
                      />
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Results({
  result,
  profile,
  onRestart,
  unanswered,
}: {
  result: ReturnType<typeof scoreAudit>;
  profile: AuditProfile;
  onRestart: () => void;
  unanswered: number;
}) {
  const saving = Math.max(0, result.totalEal - result.totalEalIfFixed);
  const topActions = result.actions.slice(0, 5);
  const sensitivity = sensitivities.find((s) => s.value === profile.dataSensitivity)?.label ?? String(profile.dataSensitivity);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Gauge value={result.overall} size={150} label="scor" className="shrink-0 self-center" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={maturityTone[result.maturity.label] ?? "neutral"}>{result.maturity.label}</Badge>
              <span className="num text-xs text-ink-3">
                {formatNumber(profile.people)} oameni · {formatLei(profile.annualRevenue)} · {profile.sector} · date: {sensitivity.toLowerCase()}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Scor {result.overall} din 100</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{result.maturity.description}</p>
            {unanswered > 0 && (
              <p className="mt-2 text-xs text-warn">
                <span className="num">{unanswered}</span> {unanswered === 1 ? "întrebare fără răspuns, considerată" : "întrebări fără răspuns, considerate"} control lipsă. Poți reveni cu „Înapoi”.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface-2/60 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Pierdere anuală așteptată</div>
            <div className="num mt-1 text-3xl font-semibold tracking-tight text-bad">{formatLei(result.totalEal)}</div>
            <p className="mt-1 text-xs text-ink-3">Suma pe scenarii: probabilitate anuală × impact, cu controalele tale de azi.</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/60 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Dacă toate controalele ar fi complete</div>
            <div className="num mt-1 text-3xl font-semibold tracking-tight text-good">{formatLei(result.totalEalIfFixed)}</div>
            <p className="mt-1 text-xs text-ink-3">
              Riscul rezidual; niciun control nu duce la zero. Diferența: <span className="num text-ink">{formatLei(saving)}</span> pe an.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-lg font-semibold text-ink">Cele 7 straturi</h3>
        <p className="mt-1 text-sm text-ink-2">Scorul unui strat e media răspunsurilor lui: complet = 100, lipsă = 0.</p>
        <div className="mt-5">
          <HBars
            max={100}
            labelWidth={110}
            data={result.layers.map((l) => ({ label: l.name, value: l.score, display: `${l.score}%`, tone: scoreTone(l.score), hint: `${l.answered}/${l.total} răspunsuri` }))}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-lg font-semibold text-ink">Scenariile de risc, în lei</h3>
        <p className="mt-1 text-sm text-ink-2">Sortate după pierderea anuală așteptată (EAL = probabilitate × impact). Ipoteza fiecăruia e scrisă dedesubt.</p>
        <div className="mt-4 hidden grid-cols-[1fr_120px_120px_120px] gap-3 border-b border-line pb-2 text-xs font-medium uppercase tracking-wider text-ink-3 sm:grid">
          <div>Scenariu</div>
          <div className="text-right">Probabilitate</div>
          <div className="text-right">Impact</div>
          <div className="text-right">Pierdere / an</div>
        </div>
        <ul className="divide-y divide-line">
          {result.risks.map((r) => (
            <li key={r.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_120px_120px_120px] sm:gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                  {r.title}
                  <Badge tone="neutral" mono>{layerLabels[r.layer].short}</Badge>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-3">Ipoteză: {r.assumption}</p>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm sm:contents">
                <div className="sm:text-right">
                  <dt className="text-[10px] uppercase tracking-wider text-ink-3 sm:hidden">Probabilitate</dt>
                  <dd className="num text-ink-2">{probabilityText(r.probability)}</dd>
                </div>
                <div className="sm:text-right">
                  <dt className="text-[10px] uppercase tracking-wider text-ink-3 sm:hidden">Impact</dt>
                  <dd className="num text-ink-2">{formatLei(r.impact)}</dd>
                </div>
                <div className="sm:text-right">
                  <dt className="text-[10px] uppercase tracking-wider text-ink-3 sm:hidden">Pierdere / an</dt>
                  <dd className="num font-medium text-ink">{formatLei(r.eal)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-line pt-3 text-sm">
          <span className="font-medium text-ink">Total</span>
          <span className="num font-semibold text-ink">{formatLei(result.totalEal)} / an</span>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-lg font-semibold text-ink">Primele {topActions.length} acțiuni</h3>
        <p className="mt-1 text-sm text-ink-2">Ordonate după economia anuală raportată la efort. Economia = cât scade pierderea așteptată dacă acel control devine complet.</p>
        {topActions.length === 0 ? (
          <p className="mt-4 text-sm text-good">Toate controalele sunt complete. Rămâne de întreținut și de exersat.</p>
        ) : (
          <ol className="mt-4 divide-y divide-line">
            {topActions.map((a, i) => (
              <li key={a.questionId} className="grid gap-2 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-4">
                <span className="num text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="text-sm font-medium text-ink">{a.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone="neutral" mono>{layerLabels[a.layer].short}</Badge>
                    <Badge tone={a.effort === 1 ? "good" : a.effort === 2 ? "warn" : "neutral"}>efort: {effortLabels[a.effort]}</Badge>
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="num text-base font-semibold text-good">−{formatLei(a.savedPerYear)}</div>
                  <div className="text-xs text-ink-3">pe an</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="no-print flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden /> Tipărește / salvează PDF
        </Button>
        <Button variant="ghost" onClick={onRestart}>
          <RotateCcw className="size-4" aria-hidden /> Reia auditul
        </Button>
        <Link
          href="/contact?subiect=audit"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[15px] font-medium text-white hover:brightness-110"
        >
          <UserRound className="size-4" aria-hidden /> Vreau auditul complet, cu un om (gratuit)
        </Link>
      </div>
      <p className="text-xs text-ink-3">
        Model transparent: cost orar 90 lei/persoană, 2.000 de ore lucrătoare pe an, întrebările fără răspuns tratate pesimist. Rezultatul e o estimare de ordin de mărime, nu o ofertă.
      </p>
    </div>
  );
}
