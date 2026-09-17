"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/** Linie simplă, o singură serie: 2px, umbră de arie 10%, punct final ≥ 8px, tooltip la hover. */
export function Sparkline({
  data,
  width = 220,
  height = 56,
  className,
  suffix = "",
  decimals = 0,
  labels,
  tone = "accent",
  ariaLabel,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  suffix?: string;
  decimals?: number;
  labels?: string[];
  tone?: "accent" | "good" | "warn" | "bad" | "muted";
  ariaLabel?: string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2) return null;
  const pad = 6;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);
  const path = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${path} L${x(data.length - 1).toFixed(1)},${height - pad} L${x(0).toFixed(1)},${height - pad} Z`;
  const color = {
    accent: "var(--accent)",
    good: "var(--good)",
    warn: "var(--warn)",
    bad: "var(--bad)",
    muted: "var(--ink-3)",
  }[tone];
  const last = data.length - 1;
  const hi = hover ?? last;
  const format = (v: number) => `${v.toLocaleString("ro-RO", { maximumFractionDigits: decimals })}${suffix}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("block max-w-full", className)}
      role="img"
      aria-label={ariaLabel ?? `Evoluție: ultima valoare ${format(data[last])}`}
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const rel = (e.clientX - rect.left) / rect.width;
        setHover(Math.round(Math.max(0, Math.min(1, rel)) * last));
      }}
    >
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.16" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {hover !== null && (
        <line x1={x(hi)} x2={x(hi)} y1={pad} y2={height - pad} stroke="var(--line-2)" strokeWidth="1" />
      )}
      <circle cx={x(hi)} cy={y(data[hi])} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" />
      {hover !== null && (
        <title>{`${labels?.[hi] ? `${labels[hi]}: ` : ""}${format(data[hi])}`}</title>
      )}
    </svg>
  );
}
