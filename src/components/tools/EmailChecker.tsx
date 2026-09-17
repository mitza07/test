"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import type { EmailCheckResult } from "@/lib/tools/emailCheck";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ErrorBox, inputCls } from "./fields";

const examples = ["gmail.com", "microsoft.com"];

export function gradeTone(grade: string): Tone {
  return grade === "A" || grade === "B" ? "good" : grade === "C" ? "warn" : "bad";
}

const gradeText: Record<Tone, string> = { good: "text-good", warn: "text-warn", bad: "text-bad", neutral: "text-ink", accent: "text-accent-ink" };
const gradeBg: Record<Tone, string> = { good: "bg-good-soft", warn: "bg-warn-soft", bad: "bg-bad-soft", neutral: "bg-surface-2", accent: "bg-accent-soft" };

export function GradeBlock({ grade, score, summary, domain }: { grade: string; score: number; summary: string; domain: string }) {
  const tone = gradeTone(grade);
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className={cn("flex size-24 shrink-0 items-center justify-center rounded-2xl", gradeBg[tone])} aria-label={`Notă ${grade}`} role="img">
        <span className={cn("text-6xl font-semibold tracking-tight", gradeText[tone])}>{grade}</span>
      </div>
      <div className="min-w-0">
        <div className="num text-xs text-ink-3">
          {domain} · scor {score}/100
        </div>
        <p className="mt-1 text-lg font-medium leading-snug text-ink">{summary}</p>
      </div>
    </div>
  );
}

export function EmailChecker() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmailCheckResult | null>(null);

  async function check(domain: string) {
    const d = domain.trim();
    if (!d || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/instrumente/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain: d }),
      });
      const data = (await res.json().catch(() => null)) as EmailCheckResult | { error: string } | null;
      if (!res.ok || !data || "error" in data) {
        setError((data && "error" in data && data.error) || `Verificarea a eșuat (HTTP ${res.status}).`);
      } else {
        setResult(data);
      }
    } catch {
      setError("Nu am putut contacta serverul. Verifică-ți conexiunea și încearcă din nou.");
    } finally {
      setLoading(false);
    }
  }

  const cards = result
    ? [
        {
          key: "mx",
          title: "MX",
          what: "Cine primește e-mailul domeniului.",
          ok: result.mx.ok,
          status: result.mx.ok ? "prezent" : "lipsă",
          record: result.mx.records.join("\n") || undefined,
          issues: result.mx.ok ? [] : ["Domeniul nu are servere de e-mail; nu poate primi mesaje."],
        },
        {
          key: "spf",
          title: "SPF",
          what: "Lista serverelor care au voie să trimită în numele domeniului.",
          ok: result.spf.ok,
          status: result.spf.ok ? "corect" : result.spf.record ? "cu probleme" : "lipsă",
          record: result.spf.record,
          issues: result.spf.issues,
        },
        {
          key: "dkim",
          title: "DKIM",
          what: "Semnătura criptografică a fiecărui mesaj trimis.",
          ok: result.dkim.ok,
          status: result.dkim.ok ? "găsit" : "negăsit",
          record: result.dkim.selectors.length ? result.dkim.selectors.map((s) => `${s}._domainkey.${result.domain}`).join("\n") : undefined,
          issues: [result.dkim.note],
        },
        {
          key: "dmarc",
          title: "DMARC",
          what: "Ce fac destinatarii cu mesajele care pică SPF/DKIM, și cui raportează.",
          ok: result.dmarc.ok,
          status: result.dmarc.ok ? "reject" : result.dmarc.policy ? `p=${result.dmarc.policy}` : "lipsă",
          record: result.dmarc.record,
          issues: result.dmarc.issues,
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <form
        className="rounded-2xl border border-line bg-surface p-6 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          void check(value);
        }}
      >
        <label htmlFor="email-domain" className="text-sm font-medium text-ink">
          Domeniul sau adresa de e-mail
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            id="email-domain"
            type="text"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            placeholder="firma.ro sau nume@firma.ro"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={cn(inputCls, "font-sans")}
            aria-describedby="email-hint"
          />
          <Button type="submit" disabled={loading || value.trim().length < 3} className="shrink-0">
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
            {loading ? "Interogăm DNS-ul…" : "Verifică"}
          </Button>
        </div>
        <div id="email-hint" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <span>Exemple:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setValue(ex);
                void check(ex);
              }}
              className="num rounded-full border border-line px-2.5 py-0.5 text-ink-2 hover:bg-surface-2"
            >
              {ex}
            </button>
          ))}
          <span className="ml-auto">Interogăm doar DNS-ul public; nu trimitem niciun e-mail.</span>
        </div>
      </form>

      {loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-sm text-ink-2" aria-live="polite">
          <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
          Căutăm MX, SPF, DMARC și 14 selectori DKIM uzuali. Durează câteva secunde.
        </div>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}

      {result && (
        <div className="space-y-6" aria-live="polite">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
            <GradeBlock grade={result.grade} score={result.score} summary={result.summary} domain={result.domain} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((c) => (
              <div key={c.key} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-ink">{c.title}</h3>
                  <Badge tone={c.ok ? "good" : c.record ? "warn" : "bad"}>{c.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-3">{c.what}</p>
                {c.record ? (
                  <pre className="num mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-surface-2 p-3 text-xs text-ink">{c.record}</pre>
                ) : (
                  <div className="num mt-3 rounded-lg border border-dashed border-line-2 p-3 text-xs text-ink-3">nicio înregistrare</div>
                )}
                {c.issues.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-ink-2">
                    {c.issues.map((i) => (
                      <li key={i} className="flex gap-2">
                        <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", c.ok ? "bg-ink-3" : "bg-warn")} aria-hidden />
                        {i}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-lg font-semibold text-ink">Ce trebuie făcut</h3>
            {result.recommendations.length === 0 ? (
              <p className="mt-2 text-sm text-good">Nimic. Menține DMARC pe reject și citește rapoartele lunar.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {result.recommendations.map((r, i) => (
                  <li key={r} className="flex gap-3 text-sm text-ink-2">
                    <span className="num w-6 shrink-0 text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                    {r}
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-4 text-xs text-ink-3">
              Scor: MX 10 · SPF 30 (15 dacă are probleme) · DKIM 25 · DMARC 35 pentru reject, 25 quarantine, 10 none. A ≥ 90, B ≥ 75, C ≥ 55, D ≥ 35.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
