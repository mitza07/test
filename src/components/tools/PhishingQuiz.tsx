"use client";

import { useState } from "react";
import { ArrowRight, Check, Mail, MessageSquare, Phone, RotateCcw, ShieldAlert, ShieldCheck, Smartphone, X } from "lucide-react";
import { phishingScenarios, phishingScore, type PhishingScenario } from "@/lib/tools/phishing";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Gauge } from "@/components/charts/Gauge";
import { cn } from "@/lib/cn";

const channelIcon: Record<PhishingScenario["channel"], React.ComponentType<{ className?: string }>> = {
  "e-mail": Mail,
  SMS: Smartphone,
  telefon: Phone,
  Teams: MessageSquare,
};

export function PhishingQuiz() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const total = phishingScenarios.length;
  const current = phishingScenarios[index];
  const answered = current ? answers[current.id] : undefined;
  const hasAnswered = answered !== undefined;

  function answer(isPhishing: boolean) {
    if (hasAnswered) return;
    setAnswers((a) => ({ ...a, [current.id]: isPhishing }));
  }
  function next() {
    if (index + 1 >= total) setFinished(true);
    else setIndex(index + 1);
  }
  function restart() {
    setAnswers({});
    setIndex(0);
    setFinished(false);
  }

  if (finished) {
    const s = phishingScore(answers);
    const tone: Tone = s.pct >= 90 ? "good" : s.pct >= 70 ? "accent" : s.pct >= 50 ? "warn" : "bad";
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Gauge value={s.pct} size={150} label="corecte" className="shrink-0 self-center" />
            <div>
              <Badge tone={tone}>
                {s.correct} din {s.total} corecte
              </Badge>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{s.pct}% recunoscute corect</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.verdict}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="text-lg font-semibold text-ink">Recapitulare</h3>
          <ul className="mt-3 divide-y divide-line">
            {phishingScenarios.map((sc, i) => {
              const yours = answers[sc.id];
              const ok = yours === sc.isPhishing;
              return (
                <li key={sc.id} className="flex items-start gap-3 py-3">
                  <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad")} aria-hidden>
                    {ok ? <Check className="size-3" /> : <X className="size-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink">
                      <span className="num mr-2 text-xs text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                      {sc.subject}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-2">
                      Răspunsul tău: <span className="font-medium text-ink">{yours === undefined ? "—" : yours ? "înșelătorie" : "legitim"}</span>
                      {" · "}Corect: <span className="font-medium text-ink">{sc.isPhishing ? "înșelătorie" : "legitim"}</span>
                    </div>
                    {!ok && <p className="mt-1 text-xs text-ink-3">{sc.explanation}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={restart}>
            <RotateCcw className="size-4" aria-hidden /> Reia
          </Button>
          <Button href="/servicii/securitate">
            Cum pregătim echipa împotriva phishing-ului <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  const Icon = channelIcon[current.channel];
  const correct = hasAnswered && answered === current.isPhishing;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between text-sm text-ink-2">
        <span>
          Scenariul <span className="num text-ink">{index + 1}</span> / <span className="num">{total}</span>
        </span>
        <span className="num text-xs text-ink-3">
          {Object.keys(answers).length} răspunsuri · {phishingScore(answers).correct} corecte
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(index / total) * 100}%` }} />
      </div>

      <article className="rounded-2xl border border-line bg-surface p-6 shadow-card" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" mono>
            <Icon className="size-3" aria-hidden /> {current.channel}
          </Badge>
        </div>
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex gap-2">
            <dt className="w-10 shrink-0 text-ink-3">De la</dt>
            <dd className="num break-all text-ink">{current.from}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-10 shrink-0 text-ink-3">Subiect</dt>
            <dd className="font-medium text-ink">{current.subject}</dd>
          </div>
        </dl>
        <div className="mt-4 rounded-xl border border-line bg-surface-2/60 p-4 text-[15px] leading-relaxed text-ink">{current.body}</div>

        {!hasAnswered ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button variant="danger" onClick={() => answer(true)}>
              <ShieldAlert className="size-4" aria-hidden /> E o înșelătorie
            </Button>
            <Button variant="secondary" onClick={() => answer(false)}>
              <ShieldCheck className="size-4" aria-hidden /> E legitim
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className={cn("rounded-xl p-4", correct ? "bg-good-soft" : "bg-bad-soft")}>
              <div className={cn("flex items-center gap-2 text-sm font-semibold", correct ? "text-good" : "text-bad")}>
                {correct ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
                {correct ? "Corect." : "Greșit."} {current.isPhishing ? "Era o înșelătorie." : "Era un mesaj legitim."}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink">{current.explanation}</p>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Indicii</div>
              <ul className="mt-2 space-y-1.5">
                {current.clues.map((c) => (
                  <li key={c} className="flex gap-2 text-sm text-ink-2">
                    <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", current.isPhishing ? "bg-bad" : "bg-good")} aria-hidden />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end">
              <Button onClick={next}>
                {index + 1 >= total ? "Vezi scorul" : "Următorul"} <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
