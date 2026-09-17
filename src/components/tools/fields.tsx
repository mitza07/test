"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/** Primitive de formular partajate de instrumente. Fără logică de domeniu. */

export const inputCls =
  "num w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none";
export const selectCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

/**
 * Câmp numeric care lasă utilizatorul să șteargă și să tasteze liber;
 * valoarea numerică se propagă doar când e validă, limitată la [min, max].
 */
export function NumberField({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  suffix,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (Number(text) !== value) setText(String(value));
  }
  return (
    <Field label={label} hint={hint} className={className}>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            if (raw === "") return;
            const n = Number(raw);
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          onBlur={() => {
            if (text === "" || !Number.isFinite(Number(text)) || Number(text) !== value) setText(String(value));
          }}
          className={cn(inputCls, suffix && "pr-14")}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-3" aria-hidden>
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

/** Control segmentat (radio vizual) pentru 2–4 opțiuni scurte. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-sm font-medium text-ink">{label}</div>
      <div role="radiogroup" aria-label={label} className="mt-1.5 inline-flex w-full rounded-lg border border-line bg-surface p-0.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors",
                active ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Slider cu valoarea afișată; folosit pentru procente. */
export function RangeField({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  display,
}: {
  label: string;
  hint?: React.ReactNode;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  display?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm font-medium text-ink">
        {label}
        <span className="num text-ink-2">{display ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--accent)]"
        aria-valuetext={display}
      />
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

/** Casetă de eroare pentru rezultatele unui apel API. */
export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-xl border border-bad/40 bg-bad-soft px-4 py-3 text-sm text-bad">
      {children}
    </div>
  );
}
