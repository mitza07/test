"use client";

import { useMemo } from "react";
import type { Twin, TwinNode } from "@/lib/twin/types";
import { cn } from "@/lib/cn";

const NODE_W = 168;
const NODE_H = 38;
const COL_GAP = 64;
const ROW_GAP = 14;
const PAD = 12;

interface Placed {
  node: TwinNode;
  col: number;
  row: number;
  x: number;
  y: number;
}

/** Așezare pe straturi: adâncimea = cel mai lung lanț de dependențe. Furnizorii în stânga, oamenii în dreapta. */
export function layoutTwin(twin: Twin): { placed: Placed[]; width: number; height: number; byId: Map<string, Placed> } {
  const nodes = twin.nodes.filter((n) => n.kind !== "site");
  const idSet = new Set(nodes.map((n) => n.id));
  const deps = new Map<string, string[]>();
  for (const n of nodes) deps.set(n.id, []);
  for (const e of twin.edges) {
    if (!idSet.has(e.from) || !idSet.has(e.to)) continue;
    if (e.rel === "depends_on" || e.rel === "runs_on" || e.rel === "stores" || e.rel === "uses" || e.rel === "provided_by") {
      deps.get(e.from)!.push(e.to);
    }
    if (e.rel === "backs_up") deps.get(e.from)!.push(e.to);
  }
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const dfs = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const d = deps.get(id)!;
    const v = d.length ? Math.max(...d.map(dfs)) + 1 : 0;
    visiting.delete(id);
    depth.set(id, v);
    return v;
  };
  nodes.forEach((n) => dfs(n.id));
  // Persoanele pe ultima coloană, backup-urile lângă ce protejează.
  const maxDepth = Math.max(...nodes.map((n) => depth.get(n.id)!));
  for (const n of nodes) if (n.kind === "person") depth.set(n.id, maxDepth + 1);
  const cols = new Map<number, TwinNode[]>();
  for (const n of nodes) {
    const c = depth.get(n.id)!;
    if (!cols.has(c)) cols.set(c, []);
    cols.get(c)!.push(n);
  }
  const colKeys = [...cols.keys()].sort((a, b) => a - b);
  const placed: Placed[] = [];
  const byId = new Map<string, Placed>();
  // Ordonare în coloană după baricentrul dependențelor (o trecere), pentru mai puține încrucișări.
  colKeys.forEach((c, ci) => {
    const list = cols.get(c)!;
    const score = (n: TwinNode) => {
      const ds = deps.get(n.id)!.map((d) => byId.get(d)?.row).filter((r): r is number => r !== undefined);
      return ds.length ? ds.reduce((s, r) => s + r, 0) / ds.length : list.indexOf(n);
    };
    const sorted = [...list].sort((a, b) => score(a) - score(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    sorted.forEach((n, ri) => {
      const p: Placed = { node: n, col: ci, row: ri, x: PAD + ci * (NODE_W + COL_GAP), y: PAD + ri * (NODE_H + ROW_GAP) };
      placed.push(p);
      byId.set(n.id, p);
    });
  });
  const rows = Math.max(...colKeys.map((c) => cols.get(c)!.length));
  const width = PAD * 2 + colKeys.length * NODE_W + (colKeys.length - 1) * COL_GAP;
  const height = PAD * 2 + rows * NODE_H + (rows - 1) * ROW_GAP;
  return { placed, width, height, byId };
}

const kindLabel: Record<TwinNode["kind"], string> = {
  site: "locație",
  person: "oameni",
  device: "echipament",
  server: "server",
  service: "serviciu",
  data: "date",
  network: "rețea",
  identity: "identități",
  backup: "backup",
  vendor: "furnizor",
};

export function TwinGraph({
  twin,
  failedId,
  affectedIds,
  stoppedIds,
  selectedId,
  onSelect,
  className,
  compact = false,
}: {
  twin: Twin;
  failedId?: string | null;
  affectedIds?: Set<string>;
  stoppedIds?: Set<string>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const { placed, width, height, byId } = useMemo(() => layoutTwin(twin), [twin]);
  const active = Boolean(failedId);
  const edges = twin.edges.filter((e) => byId.has(e.from) && byId.has(e.to) && e.rel !== "connects");

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={compact ? undefined : width}
        className={cn("block", compact ? "w-full h-auto" : "max-w-none")}
        style={compact ? undefined : { minWidth: width }}
        role="img"
        aria-label={`Geamănul digital: ${placed.length} noduri, ${edges.length} dependențe`}
      >
        <g fill="none" strokeLinecap="round">
          {edges.map((e, i) => {
            const a = byId.get(e.from)!; // dependent (dreapta)
            const b = byId.get(e.to)!; // dependență (stânga)
            const isBackup = e.rel === "backs_up";
            const x1 = b.x + NODE_W;
            const y1 = b.y + NODE_H / 2;
            const x2 = a.x;
            const y2 = a.y + NODE_H / 2;
            const dx = Math.max(24, (x2 - x1) / 2);
            const d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
            const hot = active && affectedIds && (affectedIds.has(e.from) || e.from === failedId) && (affectedIds.has(e.to) || e.to === failedId);
            return (
              <path
                key={i}
                d={d}
                stroke={hot ? "var(--bad)" : isBackup ? "var(--good)" : "var(--line-2)"}
                strokeWidth={hot ? 2 : 1.25}
                strokeDasharray={isBackup ? "3 3" : undefined}
                opacity={active && !hot ? 0.35 : 0.9}
              />
            );
          })}
        </g>
        {placed.map((p) => {
          const isFailed = p.node.id === failedId;
          const isAffected = affectedIds?.has(p.node.id);
          const isStopped = stoppedIds?.has(p.node.id);
          const isSelected = p.node.id === selectedId;
          const dim = active && !isFailed && !isAffected && !isStopped;
          const fill = isFailed ? "var(--bad)" : isAffected ? "var(--bad-soft)" : isStopped ? "var(--good-soft)" : "var(--surface)";
          const stroke = isFailed ? "var(--bad)" : isAffected ? "var(--bad)" : isStopped ? "var(--good)" : isSelected ? "var(--accent)" : "var(--line-2)";
          const health = p.node.health === "ok" ? "var(--good)" : p.node.health === "warn" ? "var(--warn)" : "var(--bad)";
          return (
            <g
              key={p.node.id}
              transform={`translate(${p.x},${p.y})`}
              opacity={dim ? 0.45 : 1}
              onClick={() => onSelect?.(p.node.id)}
              style={{ cursor: onSelect ? "pointer" : "default" }}
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onKeyDown={(e) => {
                if (onSelect && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect(p.node.id);
                }
              }}
            >
              <title>{`${p.node.name} · ${kindLabel[p.node.kind]}${isFailed ? " · CĂZUT" : isAffected ? " · afectat" : isStopped ? " · a oprit propagarea (redundant)" : ""}`}</title>
              <rect width={NODE_W} height={NODE_H} rx="8" fill={fill} stroke={stroke} strokeWidth={isSelected || isFailed ? 2 : 1} />
              <circle cx="14" cy={NODE_H / 2} r="3.5" fill={isFailed ? "#fff" : health} />
              <text x="26" y={NODE_H / 2 - 3} fontSize="11" fontWeight="600" fill={isFailed ? "#fff" : "var(--ink)"} fontFamily="var(--font-sans)">
                {p.node.name.length > 24 ? p.node.name.slice(0, 23) + "…" : p.node.name}
              </text>
              <text x="26" y={NODE_H / 2 + 10} fontSize="9" fill={isFailed ? "rgba(255,255,255,0.8)" : "var(--ink-3)"} fontFamily="var(--font-mono)" letterSpacing="0.06em">
                {kindLabel[p.node.kind].toUpperCase()}
                {p.node.redundant ? " · REDUNDANT" : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 bg-line-2" /> depinde de</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 border-t border-dashed border-good" /> protejat de backup</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-good" /> sănătos</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-warn" /> atenție</span>
        {active && <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-bad" /> afectat de cădere</span>}
      </div>
    </div>
  );
}
