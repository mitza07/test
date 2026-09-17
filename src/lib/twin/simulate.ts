import { indexNodes, type NodeKind, type Twin, type TwinNode } from "./types";

export type FailureMode = "outage" | "loss";

export interface Mitigation {
  id: string;
  title: string;
  description: string;
  /** Cost lunar estimat (lei). 0 dacă e inclus în abonament. */
  monthlyCost: number;
  /** Cost unic (lei), dacă e cazul. */
  oneTimeCost: number;
  outageHoursAfter: number;
  dataLossHoursAfter: number;
  lossAfter: number;
  /** Cât se reduce pierderea per incident. */
  saved: number;
}

export interface SimulationLoss {
  productivity: number;
  revenue: number;
  data: number;
  incident: number;
  total: number;
}

export interface SimulationResult {
  failed: TwinNode;
  mode: FailureMode;
  affected: TwinNode[];
  affectedServices: TwinNode[];
  affectedPeople: number;
  totalPeople: number;
  stoppedBy: TwinNode[]; // noduri redundante care au oprit propagarea
  outageHours: number;
  dataLossHours: number;
  loss: SimulationLoss;
  mitigations: Mitigation[];
  explanation: string[];
}

const defaultRto: Record<NodeKind, number> = {
  site: 48,
  person: 0,
  device: 8,
  server: 24,
  service: 8,
  data: 24,
  network: 6,
  identity: 4,
  backup: 4,
  vendor: 8,
};

const defaultRpo: Partial<Record<NodeKind, number>> = {
  server: 24,
  service: 24,
  data: 24,
};

function peopleCount(n: TwinNode): number {
  const t = n.meta.total;
  return typeof t === "number" ? t : 1;
}

/** Determină nodurile care cad dacă `rootId` cade. Propagarea se oprește la nodurile redundante. */
export function propagate(twin: Twin, rootId: string): { affected: TwinNode[]; stoppedBy: TwinNode[] } {
  const idx = indexNodes(twin);
  const root = idx.get(rootId);
  if (!root) throw new Error(`Nod necunoscut: ${rootId}`);
  const visited = new Set<string>([rootId]);
  const stopped = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of twin.edges) {
      if (e.to !== cur) continue;
      if (!(e.rel === "depends_on" || e.rel === "runs_on" || e.rel === "stores" || e.rel === "uses")) continue;
      const dep = idx.get(e.from);
      if (!dep || visited.has(dep.id)) continue;
      if (dep.redundant && dep.id !== rootId) {
        stopped.add(dep.id);
        continue;
      }
      visited.add(dep.id);
      // Persoanele nu propagă mai departe.
      if (dep.kind !== "person") queue.push(dep.id);
    }
  }
  visited.delete(rootId);
  const affected = [...visited].map((id) => idx.get(id)!).filter(Boolean);
  const stoppedBy = [...stopped].map((id) => idx.get(id)!).filter(Boolean);
  return { affected, stoppedBy };
}

export interface LossInputs {
  affectedPeople: number;
  totalPeople: number;
  outageHours: number;
  dataLossHours: number;
  mode: FailureMode;
  business: Twin["business"];
}

/** Modelul de pierdere: transparent, cu fiecare componentă explicabilă. */
export function computeLoss(i: LossInputs): SimulationLoss {
  const b = i.business;
  const businessHoursPerYear = 250 * 8;
  const revenuePerHour = b.annualRevenue / businessHoursPerYear;
  const shareAffected = i.totalPeople > 0 ? i.affectedPeople / i.totalPeople : 0;

  // 1) Productivitate: oamenii sunt plătiți, dar lucrează la ~30% capacitate fără sistem.
  const productivity = i.affectedPeople * i.outageHours * b.hourlyCostPerPerson * 0.7;

  // 2) Venit pus în pericol: partea din venit care depinde de IT, proporțional cu oamenii afectați.
  //    Presupunem că doar 35% din venitul întârziat se pierde definitiv (restul se recuperează după).
  const revenue = revenuePerHour * b.itDependencyShare * shareAffected * i.outageHours * 0.35;

  // 3) Date: la pierdere, munca de reintroducere a datelor dintre ultimul backup și incident.
  const data = i.mode === "loss" ? i.affectedPeople * i.dataLossHours * b.hourlyCostPerPerson * 1.0 : 0;

  // 4) Costul incidentului: intervenție, comunicare, eventual expertiză. Crește cu sensibilitatea datelor.
  const incident = i.mode === "loss" ? 2_500 + 900 * b.dataSensitivity : 400;

  const total = productivity + revenue + data + incident;
  return { productivity, revenue, data, incident, total };
}

function buildMitigations(twin: Twin, failed: TwinNode, base: SimulationResult): Mitigation[] {
  const out: Mitigation[] = [];
  const recompute = (outage: number, dataLoss: number) =>
    computeLoss({
      affectedPeople: base.affectedPeople,
      totalPeople: base.totalPeople,
      outageHours: outage,
      dataLossHours: dataLoss,
      mode: base.mode,
      business: twin.business,
    }).total;

  const push = (m: Omit<Mitigation, "lossAfter" | "saved">) => {
    const lossAfter = recompute(m.outageHoursAfter, m.dataLossHoursAfter);
    out.push({ ...m, lossAfter, saved: Math.max(0, base.loss.total - lossAfter) });
  };

  if (!failed.redundant && (failed.kind === "network" || failed.kind === "vendor")) {
    push({
      id: "failover",
      title: "Legătură de rezervă automată (4G/5G)",
      description: "Un al doilea drum către internet, comutat automat în sub un minut.",
      monthlyCost: 150,
      oneTimeCost: 900,
      outageHoursAfter: Math.min(base.outageHours, 0.25),
      dataLossHoursAfter: base.dataLossHours,
    });
  }
  if (failed.kind === "device" && !failed.redundant) {
    push({
      id: "cold-spare",
      title: "Echipament de rezervă preconfigurat",
      description: "Configurația e salvată; înlocuirea durează cât un drum și un cablu.",
      monthlyCost: 0,
      oneTimeCost: 2_400,
      outageHoursAfter: Math.min(base.outageHours, 1),
      dataLossHoursAfter: base.dataLossHours,
    });
  }
  if (failed.kind === "server" || failed.kind === "service" || failed.kind === "data") {
    if (base.outageHours > 1) {
      push({
        id: "restore-drill",
        title: "Restaurare demonstrată lunar + imagine de rezervă",
        description: "Restore-ul e exersat, nu sperat: timpul de revenire devine măsurat, sub o oră.",
        monthlyCost: 0,
        oneTimeCost: 0,
        outageHoursAfter: Math.min(base.outageHours, 1),
        dataLossHoursAfter: base.dataLossHours,
      });
    }
    if (base.dataLossHours > 0.25) {
      push({
        id: "rpo-15",
        title: "Backup incremental la 15 minute",
        description: "Snapshot-uri frecvente pentru bazele de date critice; pierderea de date scade la un sfert de oră.",
        monthlyCost: 90,
        oneTimeCost: 0,
        outageHoursAfter: base.outageHours,
        dataLossHoursAfter: 0.25,
      });
    }
    if (failed.kind === "server" && !failed.redundant) {
      push({
        id: "warm-replica",
        title: "Replica la cald pe al doilea host",
        description: "Mașinile virtuale critice pornesc pe alt server în câteva minute.",
        monthlyCost: 320,
        oneTimeCost: 9_800,
        outageHoursAfter: Math.min(base.outageHours, 0.25),
        dataLossHoursAfter: Math.min(base.dataLossHours, 0.25),
      });
    }
  }
  if (failed.kind === "identity") {
    push({
      id: "mfa-all",
      title: "MFA obligatoriu + acces condiționat",
      description: "Un cont compromis nu mai deschide nimic fără al doilea factor și dispozitiv cunoscut.",
      monthlyCost: 0,
      oneTimeCost: 0,
      outageHoursAfter: Math.min(base.outageHours, 1),
      dataLossHoursAfter: 0,
    });
  }
  return out.sort((a, b) => b.saved - a.saved);
}

export function simulateFailure(
  twin: Twin,
  nodeId: string,
  mode: FailureMode = "outage",
  overrides: { outageHours?: number; dataLossHours?: number } = {},
): SimulationResult {
  const idx = indexNodes(twin);
  const failed = idx.get(nodeId);
  if (!failed) throw new Error(`Nod necunoscut: ${nodeId}`);

  const { affected, stoppedBy } = failed.redundant && mode === "outage" ? { affected: [], stoppedBy: [] } : propagate(twin, nodeId);
  const affectedServices = affected.filter((n) => n.kind === "service" || n.kind === "data" || n.kind === "server");
  const totalPeople = twin.business.people;
  const affectedPeople = Math.min(
    totalPeople,
    affected.filter((n) => n.kind === "person").reduce((s, n) => s + peopleCount(n), 0),
  );

  let outageHours = overrides.outageHours ?? (failed.redundant && mode === "outage" ? 0.1 : (failed.rtoHours ?? defaultRto[failed.kind]));
  if (mode === "loss") outageHours = Math.max(outageHours, failed.rtoHours ?? defaultRto[failed.kind]);
  const dataLossHours =
    overrides.dataLossHours ?? (mode === "loss" ? (failed.rpoHours ?? defaultRpo[failed.kind] ?? 0) : 0);

  const loss = computeLoss({ affectedPeople, totalPeople, outageHours, dataLossHours, mode, business: twin.business });

  const explanation: string[] = [];
  if (failed.redundant && mode === "outage") {
    explanation.push(`${failed.name} are redundanță: căderea unei căi nu oprește pe nimeni.`);
  } else {
    explanation.push(
      `${failed.name} ${mode === "loss" ? "este distrus(ă) sau criptat(ă)" : "cade"} → ${affectedServices.length} servicii afectate, ${affectedPeople} din ${totalPeople} oameni nu pot lucra normal.`,
    );
    if (stoppedBy.length) explanation.push(`Propagarea s-a oprit la: ${stoppedBy.map((n) => n.name).join(", ")} (redundanță).`);
    explanation.push(`Timp estimat de revenire: ${outageHours} h${dataLossHours ? ` · date pierdute: ultimele ${dataLossHours} h` : ""}.`);
  }

  const base: SimulationResult = {
    failed,
    mode,
    affected,
    affectedServices,
    affectedPeople,
    totalPeople,
    stoppedBy,
    outageHours,
    dataLossHours,
    loss,
    mitigations: [],
    explanation,
  };
  base.mitigations = buildMitigations(twin, failed, base);
  return base;
}

export interface Scenario {
  id: string;
  title: string;
  nodeId: string;
  mode: FailureMode;
  story: string;
}

export const demoScenarios: Scenario[] = [
  { id: "ransomware", title: "Ransomware pe serverul principal", nodeId: "srv-01", mode: "loss", story: "Un atașament deschis vineri seara criptează SRV-01 și mașinile virtuale de pe el." },
  { id: "isp", title: "Cade fibra la depozit", nodeId: "net-wan-dep", mode: "outage", story: "Un excavator taie fibra pe DN7. Depozitul rămâne fără internet și fără ERP." },
  { id: "switch", title: "Moare switch-ul din depozit", nodeId: "sw-dep", mode: "outage", story: "Switch-ul din 2019 se oprește definitiv la ora 7, când încep încărcările." },
  { id: "erp-db", title: "Baza de date ERP coruptă", nodeId: "db-erp", mode: "loss", story: "Un update eșuat lasă baza ERP inconsistentă. Trebuie restaurată." },
  { id: "m365", title: "Microsoft 365 indisponibil", nodeId: "svc-m365", mode: "outage", story: "Incident global Microsoft. E-mail, Teams și SharePoint nu răspund." },
  { id: "account", title: "Cont de utilizator compromis", nodeId: "id-users", mode: "loss", story: "Un coleg introduce parola pe un site fals. Atacatorul intră în e-mail." },
  { id: "isp-hq", title: "Cade fibra la sediu", nodeId: "vendor-isp", mode: "outage", story: "Furnizorul principal are o pană regională de 5 ore." },
];
