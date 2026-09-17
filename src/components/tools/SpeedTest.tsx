"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Download, Loader2, Play, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ErrorBox } from "./fields";

type Phase = "idle" | "ping" | "download" | "upload" | "done" | "error";

interface Results {
  pingMs: number | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
}

const ENDPOINT = "/api/instrumente/viteza";
const PING_ROUNDS = 5;
const DOWNLOAD_ROUNDS = 3;
const DOWNLOAD_BYTES = 4_000_000;
const UPLOAD_ROUNDS = 2;
const UPLOAD_BYTES = 2_000_000;

const phaseLabel: Record<Phase, string> = {
  idle: "Pregătit",
  ping: "Măsurăm latența…",
  download: "Descărcăm 3 × 4 MB…",
  upload: "Încărcăm 2 × 2 MB…",
  done: "Gata",
  error: "Eroare",
};

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(n));
  const step = 65_536;
  for (let off = 0; off < n; off += step) crypto.getRandomValues(out.subarray(off, Math.min(n, off + step)));
  return out;
}

export function SpeedTest() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<Results>({ pingMs: null, downloadMbps: null, uploadMbps: null });
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function run() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const signal = ac.signal;
    setError(null);
    setResults({ pingMs: null, downloadMbps: null, uploadMbps: null });
    setProgress(0);

    try {
      // 1) Latență: cereri HEAD fără corp, mediană din 5.
      setPhase("ping");
      const pings: number[] = [];
      for (let i = 0; i < PING_ROUNDS; i++) {
        const t0 = performance.now();
        const res = await fetch(`${ENDPOINT}?bytes=1000&p=${i}-${Date.now()}`, { method: "HEAD", cache: "no-store", signal });
        if (!res.ok) throw new Error(`Serverul a răspuns ${res.status}.`);
        pings.push(performance.now() - t0);
        setProgress(((i + 1) / PING_ROUNDS) * 100);
      }
      const pingMs = median(pings);
      setResults((r) => ({ ...r, pingMs }));

      // 2) Descărcare: 3 × 4 MB secvențial, biți pe secundă din total.
      setPhase("download");
      setProgress(0);
      let bytes = 0;
      const d0 = performance.now();
      for (let i = 0; i < DOWNLOAD_ROUNDS; i++) {
        const res = await fetch(`${ENDPOINT}?bytes=${DOWNLOAD_BYTES}&d=${i}-${Date.now()}`, { cache: "no-store", signal });
        if (!res.ok) throw new Error(`Serverul a răspuns ${res.status}.`);
        const buf = await res.arrayBuffer();
        bytes += buf.byteLength;
        setProgress(((i + 1) / DOWNLOAD_ROUNDS) * 100);
      }
      const dSec = (performance.now() - d0) / 1000;
      const downloadMbps = (bytes * 8) / dSec / 1e6;
      setResults((r) => ({ ...r, downloadMbps }));

      // 3) Încărcare: 2 × 2 MB aleatori (necomprimabili).
      setPhase("upload");
      setProgress(0);
      const payload = randomBytes(UPLOAD_BYTES);
      let sent = 0;
      const u0 = performance.now();
      for (let i = 0; i < UPLOAD_ROUNDS; i++) {
        const res = await fetch(`${ENDPOINT}?u=${i}-${Date.now()}`, {
          method: "POST",
          body: payload,
          headers: { "content-type": "application/octet-stream" },
          cache: "no-store",
          signal,
        });
        if (!res.ok) throw new Error(`Serverul a răspuns ${res.status}.`);
        const data = (await res.json()) as { received?: number };
        sent += data.received ?? payload.byteLength;
        setProgress(((i + 1) / UPLOAD_ROUNDS) * 100);
      }
      const uSec = (performance.now() - u0) / 1000;
      const uploadMbps = (sent * 8) / uSec / 1e6;
      setResults((r) => ({ ...r, uploadMbps }));
      setPhase("done");
    } catch (e) {
      if (signal.aborted) return;
      setError(e instanceof Error ? e.message : "Testul a eșuat.");
      setPhase("error");
    }
  }

  const running = phase === "ping" || phase === "download" || phase === "upload";

  const tiles = [
    { key: "ping", label: "Latență", icon: Activity, value: results.pingMs, unit: "ms", decimals: 0, active: phase === "ping", hint: "mediana a 5 cereri HEAD; sub 30 ms e foarte bine, peste 100 ms se simte" },
    { key: "download", label: "Descărcare", icon: Download, value: results.downloadMbps, unit: "Mbps", decimals: 1, active: phase === "download", hint: "12 MB în total, o singură conexiune; conexiunile paralele ar da mai mult" },
    { key: "upload", label: "Încărcare", icon: Upload, value: results.uploadMbps, unit: "Mbps", decimals: 1, active: phase === "upload", hint: "4 MB de date aleatorii; contează pentru backup, videoconferințe, e-Factura" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-ink-3">Stare</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-medium text-ink" aria-live="polite">
              {running && <Loader2 className="size-4 animate-spin text-accent" aria-hidden />}
              {phaseLabel[phase]}
            </div>
          </div>
          <Button onClick={() => void run()} disabled={running} size="lg">
            {phase === "done" || phase === "error" ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            {phase === "done" || phase === "error" ? "Repetă testul" : "Pornește testul"}
          </Button>
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <div className={cn("h-full rounded-full bg-accent transition-[width] duration-300", !running && "opacity-0")} style={{ width: `${progress}%` }} />
        </div>
        {error && (
          <div className="mt-4">
            <ErrorBox>{error}</ErrorBox>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.key} className={cn("rounded-2xl border bg-surface p-5 transition-colors", t.active ? "border-accent" : "border-line")}>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-3">
                <Icon className="size-3.5" aria-hidden /> {t.label}
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="num text-4xl font-semibold tracking-tight text-ink">
                  {t.value === null ? (t.active ? "…" : "—") : formatNumber(t.value, t.decimals)}
                </span>
                <span className="text-sm text-ink-3">{t.unit}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-3">{t.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-line-2 bg-surface-2/60 p-4 text-sm text-ink-2">
        <span className="font-medium text-ink">Ce măsurăm, de fapt:</span> conexiunea dintre browserul tău și serverul Nucleu, nu viteza contractată cu furnizorul de internet.
        Distanța până la server, Wi-Fi-ul, VPN-ul sau un alt transfer din rețea schimbă cifrele. Pentru o comparație corectă, repetă testul pe cablu și la ore diferite.
      </div>
    </div>
  );
}
