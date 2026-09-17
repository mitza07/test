export interface DowntimeInput {
  people: number;
  hourlyCostPerPerson: number;
  annualRevenue: number;
  /** 0..1: cât din venit depinde direct de IT. */
  itDependency: number;
  /** Ore de nefuncționare pe incident. */
  hoursPerIncident: number;
  incidentsPerYear: number;
  /** 0..1: cât din venitul întârziat se pierde definitiv. */
  revenueLossShare?: number;
}

export interface DowntimeResult {
  perHour: { productivity: number; revenue: number; total: number };
  perIncident: number;
  perYear: number;
  hoursPerYear: number;
}

export function downtimeCost(i: DowntimeInput): DowntimeResult {
  const revenuePerHour = i.annualRevenue / 2000;
  const productivity = i.people * i.hourlyCostPerPerson * 0.7;
  const revenue = revenuePerHour * i.itDependency * (i.revenueLossShare ?? 0.35);
  const total = productivity + revenue;
  const perIncident = total * i.hoursPerIncident;
  const hoursPerYear = i.hoursPerIncident * i.incidentsPerYear;
  return { perHour: { productivity, revenue, total }, perIncident, perYear: total * hoursPerYear, hoursPerYear };
}
