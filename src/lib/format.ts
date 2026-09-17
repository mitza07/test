const lei = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 });
const leiDec = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 });

export function formatLei(value: number, opts: { decimals?: boolean } = {}): string {
  const n = opts.decimals ? leiDec.format(value) : lei.format(Math.round(value));
  return `${n} lei`;
}

export function formatNumber(value: number, maxFraction = 0): string {
  return new Intl.NumberFormat("ro-RO", { maximumFractionDigits: maxFraction }).format(value);
}

export function formatPercent(value: number, maxFraction = 0): string {
  return `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: maxFraction }).format(value)}%`;
}

export function formatPct1(value: number): string {
  return `${pct.format(value)}%`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`;
  if (minutes < 60) {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return s ? `${m} min ${s} s` : `${m} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return hh ? `${d} z ${hh} h` : `${d} zile`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function proofId(kind: string, iso: string, seq: number): string {
  const d = iso.slice(0, 10).replaceAll("-", "");
  return `DOV-${kind.toUpperCase()}-${d}-${String(seq).padStart(3, "0")}`;
}
