"use client";

import { Wand2 } from "lucide-react";
import { usePortal } from "../context";
import { PCard, PageTitle } from "../ui";
import { TwinGraph } from "@/components/charts/TwinGraph";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { demoTwin, indexNodes, dependents, dependencies, protectedBy } from "@/lib/twin";

export function Geaman() {
  const { selectedNode, setSelectedNode, simulate } = usePortal();
  const idx = indexNodes(demoTwin);
  const node = selectedNode ? idx.get(selectedNode) : undefined;
  const deps = node ? dependencies(demoTwin, node.id).map((e) => idx.get(e.to)!).filter(Boolean) : [];
  const dependentsOf = node ? dependents(demoTwin, node.id).map((e) => idx.get(e.from)!).filter(Boolean) : [];
  const backups = node ? protectedBy(demoTwin, node.id) : [];
  const spof = demoTwin.nodes.filter((n) => !n.redundant && n.kind !== "person" && n.kind !== "site" && dependents(demoTwin, n.id).length > 0);

  return (
    <div>
      <PageTitle title="Geamănul digital" lead="Modelul viu al IT-ului tău. Click pe un nod: ce depinde de el, ce îl protejează, ce se întâmplă dacă moare. Actualizat automat din inventar, monitorizare și configurații.">
        <Badge>{demoTwin.nodes.filter((n) => n.kind !== "site").length} noduri</Badge>
        <Badge>{demoTwin.edges.length} dependențe</Badge>
        <Badge tone="warn">{spof.length} puncte unice de eșec</Badge>
      </PageTitle>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <PCard padded={false} className="min-w-0 p-3">
          <TwinGraph twin={demoTwin} selectedId={selectedNode} onSelect={(id) => setSelectedNode(id)} />
        </PCard>
        <div className="space-y-4">
          {node ? (
            <PCard title={node.name} action={<Badge tone={node.health === "ok" ? "good" : node.health === "warn" ? "warn" : "bad"}>{node.health === "ok" ? "sănătos" : node.health === "warn" ? "atenție" : "problemă"}</Badge>}>
              <dl className="num grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                {Object.entries(node.meta).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="text-ink">{String(v)}</dd>
                  </div>
                ))}
                {node.rtoHours !== undefined && (<><dt className="text-ink-3">revenire (RTO)</dt><dd className="text-ink">{node.rtoHours} h</dd></>)}
                {node.rpoHours !== undefined && (<><dt className="text-ink-3">date pierdute (RPO)</dt><dd className="text-ink">{node.rpoHours} h</dd></>)}
                {node.redundant && (<><dt className="text-ink-3">redundanță</dt><dd className="text-good">da</dd></>)}
              </dl>
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <div className="font-medium text-ink">Depinde de ({deps.length})</div>
                  <div className="mt-1 flex flex-wrap gap-1">{deps.map((d) => <button key={d.id} type="button" onClick={() => setSelectedNode(d.id)} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-ink-2 hover:text-ink">{d.name}</button>)}{deps.length === 0 && <span className="text-ink-3">nimic (rădăcină)</span>}</div>
                </div>
                <div>
                  <div className="font-medium text-ink">Cad odată cu el ({dependentsOf.length})</div>
                  <div className="mt-1 flex flex-wrap gap-1">{dependentsOf.map((d) => <button key={d.id} type="button" onClick={() => setSelectedNode(d.id)} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-ink-2 hover:text-ink">{d.name}</button>)}{dependentsOf.length === 0 && <span className="text-ink-3">nimeni</span>}</div>
                </div>
                <div>
                  <div className="font-medium text-ink">Protejat de backup</div>
                  <div className="mt-1 flex flex-wrap gap-1">{backups.map((b) => <span key={b.id} className="rounded-md bg-good-soft px-1.5 py-0.5 text-good">{b.name}</span>)}{backups.length === 0 && <span className="text-ink-3">{node.kind === "server" || node.kind === "data" || node.kind === "service" ? "nu" : "n/a"}</span>}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => simulate(node.id, "outage")}><Wand2 className="size-3.5" /> Simulează căderea</Button>
                {(node.kind === "server" || node.kind === "data" || node.kind === "service" || node.kind === "identity") && (
                  <Button size="sm" variant="secondary" onClick={() => simulate(node.id, "loss")}>Simulează distrugerea</Button>
                )}
              </div>
            </PCard>
          ) : (
            <PCard title="Selectează un nod">
              <p className="text-sm text-ink-2">Click pe orice nod din graf ca să vezi detaliile lui și ce s-ar întâmpla dacă ar cădea.</p>
            </PCard>
          )}
          <PCard title="Puncte unice de eșec" padded={false}>
            <ul className="divide-y divide-line">
              {spof.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <button type="button" onClick={() => setSelectedNode(n.id)} className="truncate text-left text-ink hover:text-accent-ink">{n.name}</button>
                  <span className="num shrink-0 text-xs text-ink-3">{dependents(demoTwin, n.id).length} dep.</span>
                </li>
              ))}
            </ul>
          </PCard>
        </div>
      </div>
    </div>
  );
}
