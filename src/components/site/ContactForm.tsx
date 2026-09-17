"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/content/site";

const subjects = [
  { value: "audit", label: "Vreau auditul IT gratuit" },
  { value: "oferta", label: "Vreau o ofertă pentru un plan" },
  { value: "apel", label: "Vreau un apel de 20 de minute" },
  { value: "contabili", label: "Sunt cabinet de contabilitate" },
  { value: "intrebare", label: "Am o întrebare" },
  { value: "altceva", label: "Altceva" },
];

const inputCls = "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none";

export function ContactForm({ initialSubject = "intrebare", initialPlan = "", prefill = "" }: { initialSubject?: string; initialPlan?: string; prefill?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [ref, setRef] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const json = (await res.json()) as { ok?: boolean; error?: string; ref?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Nu am putut trimite mesajul.");
      setRef(json.ref ?? "");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut trimite mesajul.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-good/40 bg-good-soft/50 p-6">
        <div className="flex items-center gap-2 text-good"><CheckCircle2 className="size-5" /> <span className="font-medium">Mesaj primit.</span></div>
        <p className="mt-2 text-sm text-ink-2">Răspundem în maximum {site.responseTime}, de la o adresă @nucleu.ro. Nu vei primi niciodată de la noi un link de autentificare pe e-mail.</p>
        {ref && <p className="num mt-2 text-xs text-ink-3">referință: {ref}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-ink">Nume *</span>
          <input name="name" required minLength={2} className={`${inputCls} mt-1.5`} autoComplete="name" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">Firma</span>
          <input name="company" className={`${inputCls} mt-1.5`} autoComplete="organization" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">E-mail *</span>
          <input name="email" type="email" required className={`${inputCls} mt-1.5`} autoComplete="email" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">Telefon</span>
          <input name="phone" type="tel" className={`${inputCls} mt-1.5`} autoComplete="tel" />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-ink">Subiect</span>
        <select name="subject" defaultValue={subjects.some((s) => s.value === initialSubject) ? initialSubject : "intrebare"} className={`${inputCls} mt-1.5`}>
          {subjects.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>
      <input type="hidden" name="plan" value={initialPlan} />
      <label className="block text-sm">
        <span className="font-medium text-ink">Mesaj</span>
        <textarea name="message" rows={5} defaultValue={prefill} className={`${inputCls} mt-1.5`} placeholder="Câți oameni sunteți, ce vă doare, ce ați vrea să fie altfel." />
      </label>
      <div className="hidden" aria-hidden>
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {state === "error" && <p className="text-sm text-bad">{error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={state === "sending"}>
          {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Trimite
        </Button>
        <span className="text-xs text-ink-3">Răspuns în maximum {site.responseTime}. Datele sunt folosite doar ca să îți răspundem.</span>
      </div>
    </form>
  );
}
