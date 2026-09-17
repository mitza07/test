/**
 * Geamănul digital („twin”): modelul viu al IT-ului unei firme.
 * Noduri = tot ce poate să cadă sau să fie compromis; muchii = cine depinde de cine.
 * Din acest graf derivăm riscul în lei, simulările și postura de securitate.
 */

export type NodeKind =
  | "site"
  | "person"
  | "device"
  | "server"
  | "service"
  | "data"
  | "network"
  | "identity"
  | "backup"
  | "vendor";

export type Health = "ok" | "warn" | "bad";

export type Layer =
  | "identity"
  | "devices"
  | "network"
  | "email"
  | "backup"
  | "monitoring"
  | "response";

export interface TwinNode {
  id: string;
  kind: NodeKind;
  name: string;
  /** ID-ul site-ului (locației) unde se află nodul, dacă e fizic. */
  site?: string;
  health: Health;
  /** Etichete libere folosite de UI și de reguli. */
  tags?: string[];
  /** Metadate specifice tipului (versiune, garanție, criptare, MFA...). */
  meta: Record<string, string | number | boolean>;
  /**
   * Capabilitate de recuperare a nodului în sine (în ore), dacă e relevant.
   * Ex.: un server cu backup testat are rto 4, fără backup poate avea 72+.
   */
  rtoHours?: number;
  /** Cât de multe date se pot pierde (ore de la ultimul backup verificat). */
  rpoHours?: number;
  /** Nodul are redundanță (o cădere nu opreste dependenții). */
  redundant?: boolean;
}

export type Relation =
  | "depends_on" // A depinde de B (A cade dacă B cade)
  | "runs_on" // serviciul A rulează pe serverul B
  | "stores" // serviciul A stochează datele B
  | "uses" // persoana A folosește serviciul B
  | "backs_up" // backup-ul A protejează nodul B
  | "connects" // rețeaua A conectează nodul B
  | "provided_by"; // serviciul A e furnizat de vendorul B

export interface TwinEdge {
  from: string;
  to: string;
  rel: Relation;
}

export interface BusinessProfile {
  /** Număr de oameni protejați (angajați + colaboratori cu cont). */
  people: number;
  /** Venit anual (lei), folosit pentru costul unei ore de nefuncționare. */
  annualRevenue: number;
  /** Ore lucrătoare pe an per persoană. */
  workHoursPerYear: number;
  /** Cost mediu orar cu un angajat (lei), inclusiv taxe. */
  hourlyCostPerPerson: number;
  /** Cât la sută din venit depinde direct de IT (ERP, e-mail, comenzi...). */
  itDependencyShare: number;
  /** Sensibilitatea datelor: 1 (publice) … 5 (date medicale / financiare). */
  dataSensitivity: 1 | 2 | 3 | 4 | 5;
  sector: string;
}

export interface Twin {
  company: {
    name: string;
    slug: string;
    since: string;
    plan: string;
  };
  business: BusinessProfile;
  nodes: TwinNode[];
  edges: TwinEdge[];
}

export type NodeIndex = Map<string, TwinNode>;

export function indexNodes(twin: Twin): NodeIndex {
  return new Map(twin.nodes.map((n) => [n.id, n]));
}

export function nodesOfKind(twin: Twin, kind: NodeKind): TwinNode[] {
  return twin.nodes.filter((n) => n.kind === kind);
}

/** Noduri care depind (direct) de `id`: A depends_on/runs_on/uses/stores id. */
export function dependents(twin: Twin, id: string): TwinEdge[] {
  return twin.edges.filter(
    (e) => e.to === id && (e.rel === "depends_on" || e.rel === "runs_on" || e.rel === "uses" || e.rel === "stores"),
  );
}

/** Noduri de care depinde (direct) `id`. */
export function dependencies(twin: Twin, id: string): TwinEdge[] {
  return twin.edges.filter(
    (e) => e.from === id && (e.rel === "depends_on" || e.rel === "runs_on" || e.rel === "stores"),
  );
}

export function protectedBy(twin: Twin, id: string): TwinNode[] {
  const idx = indexNodes(twin);
  return twin.edges
    .filter((e) => e.rel === "backs_up" && e.to === id)
    .map((e) => idx.get(e.from))
    .filter((n): n is TwinNode => Boolean(n));
}
