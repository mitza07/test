export interface BackupInput {
  /** Frecvența backup-ului, în ore (24 = zilnic). */
  frequencyHours: number;
  /** Ultimul test de restaurare: zile în urmă (Infinity = niciodată). */
  lastRestoreDays: number;
  offsite: boolean;
  immutable: boolean;
  retentionDays: number;
  people: number;
  hourlyCostPerPerson: number;
  /** Probabilitate anuală a unui incident care distruge datele primare (ransomware, defect). */
  incidentProbability?: number;
}

export interface BackupResult {
  /** Câte ore de muncă se pot pierde în cel mai rău caz (RPO). */
  rpoHours: number;
  /** Ore medii pierdute (jumătate din interval). */
  expectedLostHours: number;
  /** Probabilitatea ca restaurarea să eșueze, pe baza testării. */
  restoreFailureProbability: number;
  /** Probabilitatea ca backup-ul să fie distrus odată cu datele (ransomware / incendiu). */
  backupDestroyedProbability: number;
  /** Pierdere estimată per incident (lei). */
  lossPerIncident: number;
  /** Pierdere anuală așteptată (lei). */
  expectedAnnualLoss: number;
  verdict: "solid" | "fragil" | "critic";
  notes: string[];
}

export function backupRisk(i: BackupInput): BackupResult {
  const rpoHours = i.frequencyHours;
  const expectedLostHours = i.frequencyHours / 2;
  const restoreFailureProbability =
    !Number.isFinite(i.lastRestoreDays) ? 0.35 : i.lastRestoreDays > 365 ? 0.25 : i.lastRestoreDays > 90 ? 0.12 : i.lastRestoreDays > 31 ? 0.06 : 0.02;
  const backupDestroyedProbability = i.immutable ? 0.02 : i.offsite ? 0.12 : 0.45;
  const incidentProbability = i.incidentProbability ?? 0.15;

  // Ore de muncă lucrătoare pierdute, proporțional cu oamenii care produc date.
  const workHoursFactor = Math.min(1, 8 / 24); // datele se produc în ~8 din 24 ore
  const dataReentry = i.people * expectedLostHours * workHoursFactor * i.hourlyCostPerPerson;
  // Dacă restaurarea eșuează sau backup-ul e distrus, pierderea e „tot”: reconstituire ~30 zile de muncă.
  const totalLoss = i.people * 8 * 30 * i.hourlyCostPerPerson * 0.5;
  const pCatastrophic = 1 - (1 - restoreFailureProbability) * (1 - backupDestroyedProbability);
  const lossPerIncident = (1 - pCatastrophic) * dataReentry + pCatastrophic * totalLoss;
  const expectedAnnualLoss = lossPerIncident * incidentProbability;

  const notes: string[] = [];
  if (!i.offsite) notes.push("Fără copie în altă locație, un incendiu sau un furt ia și datele, și backup-ul.");
  if (!i.immutable) notes.push("Backup-ul poate fi criptat de ransomware odată cu datele. O copie imutabilă elimină scenariul.");
  if (!Number.isFinite(i.lastRestoreDays)) notes.push("Un backup nerestaurat niciodată e o speranță, nu o procedură. Prima restaurare de test durează o oră.");
  else if (i.lastRestoreDays > 90) notes.push("Testul de restaurare e vechi. Configurațiile se schimbă; testul trebuie repetat lunar.");
  if (i.frequencyHours > 24) notes.push("Fiecare zi între backup-uri e o zi de muncă pe care o poți pierde.");
  if (i.retentionDays < 30) notes.push("Retenția scurtă înseamnă că o corupere descoperită târziu nu mai are o versiune bună.");

  const verdict: BackupResult["verdict"] = pCatastrophic > 0.3 ? "critic" : pCatastrophic > 0.08 || i.frequencyHours > 24 ? "fragil" : "solid";
  return { rpoHours, expectedLostHours, restoreFailureProbability, backupDestroyedProbability, lossPerIncident, expectedAnnualLoss, verdict, notes };
}
