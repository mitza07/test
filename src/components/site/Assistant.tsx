"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { site } from "@/lib/content/site";
import { cn } from "@/lib/cn";

type Msg = { role: "user" | "assistant"; content: string; sources?: { title: string; url: string }[] };

const starters = ["Cât costă pentru 12 oameni?", "Ce e clauza de divorț?", "Cum demonstrați backup-ul?", "Ce e diferit față de un furnizor clasic?"];

function renderText(t: string) {
  // Minimal: **bold** și link-uri relative /pagina
  const parts = t.split(/(\*\*[^*]+\*\*|\/[a-z0-9\-\/#?=]+)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^\/[a-z0-9\-\/#?=]+$/.test(p) && p.length > 1) return <Link key={i} href={p} className="underline decoration-line-2 underline-offset-2">{p}</Link>;
    return <span key={i}>{p}</span>;
  });
}

export function Assistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"local" | "model" | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, open]);

  if (pathname?.startsWith("/portal")) return null;

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history = [...msgs, { role: "user" as const, content: q }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/asistent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history.slice(-10).map((m) => ({ role: m.role, content: m.content })) }) });
      const ct = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Nu am putut răspunde.");
      }
      if (ct.includes("application/json")) {
        const j = (await res.json()) as { text: string; sources: Msg["sources"]; mode: "local" };
        setMode("local");
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: j.text, sources: j.sources }]);
      } else {
        setMode("model");
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let acc = "";
        let sources: Msg["sources"] = [];
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const ev = JSON.parse(line) as { type: string; text?: string; sources?: Msg["sources"] };
            if (ev.type === "sources") sources = ev.sources ?? [];
            if (ev.type === "delta") {
              acc += ev.text ?? "";
              const snapshot = acc;
              setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: snapshot, sources }]);
            }
          }
        }
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: acc || "Nu am găsit un răspuns. Scrie-ne la /contact.", sources }]);
      }
    } catch (err) {
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: err instanceof Error ? err.message : "Nu am putut răspunde." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="vega"
        className="no-print fixed bottom-4 right-4 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-bg shadow-lg hover:brightness-110 sm:bottom-6 sm:right-6"
      >
        {open ? <X className="size-4" /> : <MessageCircle className="size-4" />}
        {open ? "Închide" : `Întreabă pe ${site.assistantName}`}
      </button>

      {open && (
        <section id="vega" aria-label={`Asistentul ${site.assistantName}`} className="no-print fixed bottom-20 right-4 z-50 flex max-h-[min(640px,calc(100vh-6.5rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl sm:bottom-22 sm:right-6">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Sparkles className="size-4 text-accent-ink" /> {site.assistantName}</div>
              <div className="text-[11px] text-ink-3">{mode === "model" ? "răspunsuri generate, ancorate în conținutul site-ului" : "răspunde din conținutul site-ului · nu inventează"}</div>
            </div>
          </header>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {msgs.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-ink-2">Salut. Pot răspunde despre prețuri, garanții, capabilități, portal, instrumente sau manifestul 2126. Nu introduce date personale.</p>
                <div className="flex flex-wrap gap-1.5">
                  {starters.map((s) => (
                    <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs text-ink-2 hover:text-ink">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={cn("max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed", m.role === "user" ? "ml-auto bg-ink text-bg" : "bg-surface-2 text-ink")}>
                {m.role === "assistant" && !m.content && busy ? <Loader2 className="size-4 animate-spin text-ink-3" /> : <div className="whitespace-pre-wrap">{renderText(m.content)}</div>}
                {m.sources && m.sources.length > 0 && m.content && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.sources.map((s) => (
                      <Link key={s.url} href={s.url} className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] text-accent-ink">{s.title}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 border-t border-line p-2"
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Întreabă ceva…" aria-label="Mesaj" className="min-w-0 flex-1 rounded-full border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none" maxLength={1000} />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Trimite" className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-white disabled:opacity-50">
              <Send className="size-4" />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
