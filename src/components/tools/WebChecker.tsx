"use client";

import { useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import type { WebCheckResult } from "@/lib/tools/webCheck";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ErrorBox, inputCls } from "./fields";
import { GradeBlock } from "./EmailChecker";

const examples = ["example.com", "github.com"];

function Fact({ label, ok, value, note }: { label: string; ok: boolean | null; value: string; note?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line p-3">
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          ok === true ? "bg-good-soft text-good" : ok === false ? "bg-bad-soft text-bad" : "bg-surface-2 text-ink-3",
        )}
        aria-hidden
      >
        {ok === true ? <Check className="size-3" /> : ok === false ? <X className="size-3" /> : <span className="text-[10px]">?</span>}
      </span>
      <div className="min-w-0">
        <div className="text-xs text-ink-3">{label}</div>
        <div className="text-sm font-medium text-ink">{value}</div>
        {note && <div className="mt-0.5 text-xs text-ink-3">{note}</div>}
      </div>
    </div>
  );
}

export function WebChecker() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WebCheckResult | null>(null);

  async function check(url: string) {
    const u = url.trim();
    if (!u || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/instrumente/web", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const data = (await res.json().catch(() => null)) as WebCheckResult | { error: string } | null;
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <form
        className="rounded-2xl border border-line bg-surface p-6 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          void check(value);
        }}
      >
        <label htmlFor="web-url" className="text-sm font-medium text-ink">
          Adresa site-ului
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            id="web-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="firma.ro sau https://www.firma.ro"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={cn(inputCls, "font-sans")}
            aria-describedby="web-hint"
          />
          <Button type="submit" disabled={loading || value.trim().length < 3} className="shrink-0">
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
            {loading ? "Cerem pagina…" : "Verifică"}
          </Button>
        </div>
        <div id="web-hint" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-3">
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
          <span className="ml-auto">Două cereri GET, ca un browser obișnuit. Nimic nu e stocat.</span>
        </div>
      </form>

      {loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-sm text-ink-2" aria-live="polite">
          <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
          Cerem pagina prin HTTPS, apoi prin HTTP ca să vedem redirecționarea. Până la 20 de secunde.
        </div>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}

      {result && (
        <div className="space-y-6" aria-live="polite">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
            <GradeBlock grade={result.grade} score={result.score} summary={result.summary} domain={result.finalUrl} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="HTTPS" ok={result.https} value={result.https ? "servit criptat" : "necriptat"} note={`răspuns HTTP ${result.status}`} />
            <Fact
              label="HTTP → HTTPS"
              ok={result.redirectsToHttps}
              value={result.redirectsToHttps === null ? "nu am putut testa" : result.redirectsToHttps ? "redirecționează" : "nu redirecționează"}
              note={result.redirectsToHttps === false ? "versiunea HTTP răspunde fără să trimită la HTTPS" : undefined}
            />
            <Fact
              label="Cookie-uri la prima cerere"
              ok={result.cookies.total === 0 ? null : result.cookies.insecure === 0}
              value={result.cookies.total === 0 ? "niciunul" : `${result.cookies.total}, ${result.cookies.insecure} fără Secure/HttpOnly`}
            />
            <Fact
              label="Server / X-Powered-By"
              ok={!result.poweredBy && !(result.server && /\d+\.\d+/.test(result.server))}
              value={[result.server, result.poweredBy].filter(Boolean).join(" · ") || "nedezvăluit"}
            />
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-lg font-semibold text-ink">Antetele de securitate</h3>
            <p className="mt-1 text-sm text-ink-2">Fiecare antet are o pondere în scor. „Prezent” nu înseamnă neapărat „corect”: HSTS scurt sau CSP gol nu trec.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-ink-3">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3 font-medium">Antet</th>
                    <th className="py-2 pr-3 font-medium">Prezent</th>
                    <th className="py-2 pr-3 font-medium">OK</th>
                    <th className="py-2 pr-3 font-medium">Valoare</th>
                    <th className="py-2 font-medium">Recomandare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.headers.map((h) => (
                    <tr key={h.header} className="align-top">
                      <td className="py-2.5 pr-3 font-medium text-ink">
                        {h.header}
                        <div className="num text-[10px] text-ink-3">pondere {h.weight}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={h.present ? "neutral" : "bad"}>{h.present ? "da" : "nu"}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        {h.ok ? (
                          <span className="inline-flex items-center gap-1 text-good"><Check className="size-4" aria-hidden /><span className="sr-only">da</span></span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-bad"><X className="size-4" aria-hidden /><span className="sr-only">nu</span></span>
                        )}
                      </td>
                      <td className="num max-w-[220px] py-2.5 pr-3 text-xs text-ink-2">
                        <span className="block truncate" title={h.value}>{h.value ?? "—"}</span>
                      </td>
                      <td className="py-2.5 text-xs text-ink-2">{h.advice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-ink-3">
              Scor: suma ponderilor antetelor corecte; ×0,4 fără HTTPS; −15 dacă HTTP nu redirecționează; −10 pentru cookie-uri fără Secure/HttpOnly. A ≥ 85, B ≥ 70, C ≥ 50, D ≥ 30.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
