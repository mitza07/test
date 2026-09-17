import type { Twin, TwinNode, TwinEdge } from "./types";

/**
 * Firma demonstrativă: Meridian Distribuție SRL — distribuție de produse alimentare,
 * 28 de oameni, sediu în București și depozit în Chitila. Date fictive.
 */

const nodes: TwinNode[] = [
  // Locații
  { id: "site-hq", kind: "site", name: "Sediu București", health: "ok", meta: { adresa: "Str. Meridianului 12", oameni: 18 } },
  { id: "site-dep", kind: "site", name: "Depozit Chitila", health: "ok", meta: { adresa: "DN7 km 14", oameni: 10 } },

  // Furnizori
  { id: "vendor-isp", kind: "vendor", name: "ISP fibră (principal)", health: "ok", meta: { contract: "business 1 Gbps", sla: "4h" }, rtoHours: 5 },
  { id: "vendor-isp2", kind: "vendor", name: "ISP backup (4G/5G)", health: "ok", meta: { contract: "LTE 100 Mbps" }, redundant: true },
  { id: "vendor-m365", kind: "vendor", name: "Microsoft 365", health: "ok", meta: { licente: 30, plan: "Business Premium" } },
  { id: "vendor-erp", kind: "vendor", name: "Furnizor ERP", health: "ok", meta: { suport: "L-V 9-18" } },
  { id: "vendor-anaf", kind: "vendor", name: "ANAF SPV / e-Factura", health: "ok", meta: {} },

  // Rețea
  { id: "net-wan-hq", kind: "network", name: "Legătură internet sediu", health: "ok", site: "site-hq", meta: { tip: "fibră + 5G failover" }, redundant: true, rtoHours: 0.25 },
  { id: "net-wan-dep", kind: "network", name: "Legătură internet depozit", health: "warn", site: "site-dep", meta: { tip: "fibră, fără failover" }, rtoHours: 6 },
  { id: "fw-hq", kind: "device", name: "FW-HQ · firewall", health: "ok", site: "site-hq", meta: { model: "OPNsense HA", firmware: "25.7", reguli: 42, "reguli documentate": true }, redundant: true, rtoHours: 0.5 },
  { id: "fw-dep", kind: "device", name: "FW-DEP · firewall depozit", health: "ok", site: "site-dep", meta: { model: "OPNsense", firmware: "25.7", reguli: 18, "reguli documentate": true }, rtoHours: 4 },
  { id: "vpn-s2s", kind: "network", name: "VPN sediu ↔ depozit", health: "ok", meta: { tip: "WireGuard", "cheie rotită": "2026-08-01" }, rtoHours: 1 },
  { id: "sw-hq", kind: "device", name: "SW-HQ-01 · switch core", health: "ok", site: "site-hq", meta: { porturi: 48, vlan: "10,20,30,99" }, rtoHours: 4 },
  { id: "sw-dep", kind: "device", name: "SW-DEP-01 · switch depozit", health: "warn", site: "site-dep", meta: { porturi: 24, firmware: "învechit (2023)" }, rtoHours: 8 },
  { id: "wifi-hq", kind: "network", name: "Wi-Fi sediu (birou + oaspeți)", health: "ok", site: "site-hq", meta: { ap: 4, segmentat: true }, rtoHours: 2 },
  { id: "wifi-dep", kind: "network", name: "Wi-Fi depozit (scannere)", health: "ok", site: "site-dep", meta: { ap: 6, segmentat: true, "roaming 802.11r": true }, rtoHours: 2 },
  { id: "vlan-ot", kind: "network", name: "VLAN echipamente depozit", health: "ok", site: "site-dep", meta: { izolat: true }, rtoHours: 2 },

  // Servere & stocare
  { id: "srv-01", kind: "server", name: "SRV-01 · Hyper-V (sediu)", health: "ok", site: "site-hq", meta: { cpu: "2×12c", ram: "128 GB", "utilizare": "41%", "vârstă ani": 3, garantie: "2027-03" }, rtoHours: 4, rpoHours: 1 },
  { id: "nas-hq", kind: "backup", name: "NAS-HQ · backup local", health: "ok", site: "site-hq", meta: { capacitate: "24 TB", utilizat: "61%", imutabil: true }, rtoHours: 2 },
  { id: "bk-offsite", kind: "backup", name: "Backup offsite (UE, imutabil)", health: "ok", meta: { regiune: "eu-central", retentie: "90 zile", "test restore": "2026-09-16 03:41" }, rtoHours: 6 },
  { id: "vm-ad", kind: "service", name: "Active Directory / identități locale", health: "ok", site: "site-hq", meta: { conturi: 31 }, rtoHours: 2, rpoHours: 1 },
  { id: "vm-files", kind: "service", name: "Server de fișiere", health: "ok", site: "site-hq", meta: { volum: "3.1 TB", criptat: true }, rtoHours: 3, rpoHours: 1 },
  { id: "vm-erp", kind: "service", name: "ERP (facturare, stocuri, WMS)", health: "ok", site: "site-hq", meta: { versiune: "2026.2", "utilizatori": 24 }, rtoHours: 4, rpoHours: 1 },
  { id: "db-erp", kind: "data", name: "Baza de date ERP", health: "ok", site: "site-hq", meta: { marime: "180 GB", sensibilitate: "financiar", "restore testat": "2026-09-16" }, rtoHours: 4, rpoHours: 1 },
  { id: "svc-efactura", kind: "service", name: "Conector e-Factura / SPV", health: "ok", meta: { certificat: "expiră 2027-01" }, rtoHours: 4 },

  // Cloud / SaaS
  { id: "svc-m365", kind: "service", name: "Microsoft 365 (e-mail, Teams, SharePoint)", health: "ok", meta: { conturi: 30, mfa: "28/30", "backup SaaS": true }, rtoHours: 1, rpoHours: 24 },
  { id: "svc-email", kind: "service", name: "E-mail companie (@meridian.ro)", health: "warn", meta: { spf: true, dkim: true, dmarc: "p=quarantine (recomandat p=reject)" }, rtoHours: 1 },
  { id: "data-sharepoint", kind: "data", name: "Documente SharePoint / OneDrive", health: "ok", meta: { marime: "640 GB" }, rpoHours: 24 },

  // Identități (agregat)
  { id: "id-users", kind: "identity", name: "Conturi utilizatori (30)", health: "warn", meta: { total: 30, mfa: 28, "fără MFA": 2, orfane: 0 } },
  { id: "id-admin", kind: "identity", name: "Conturi privilegiate (3)", health: "ok", meta: { total: 3, mfa: 3, separate: true, "revizuite": "2026-09-02" } },

  // Stații & echipamente (agregate + câteva individuale)
  { id: "ws-hq", kind: "device", name: "Stații de lucru sediu (18)", health: "ok", site: "site-hq", meta: { total: 18, criptate: 18, "patch la zi": 17, edr: true }, rtoHours: 2 },
  { id: "ws-dep", kind: "device", name: "Stații depozit (4)", health: "ok", site: "site-dep", meta: { total: 4, criptate: 4, "patch la zi": 4, edr: true }, rtoHours: 2 },
  { id: "scan-dep", kind: "device", name: "Scannere depozit (8)", health: "ok", site: "site-dep", meta: { total: 8, "firmware": "la zi" }, rtoHours: 1 },
  { id: "prn-hq", kind: "device", name: "Multifuncționale (3)", health: "warn", site: "site-hq", meta: { total: 3, "firmware": "1 învechit" }, rtoHours: 24 },

  // Oameni (agregate pe departamente)
  { id: "ppl-vanzari", kind: "person", name: "Vânzări (8)", health: "ok", site: "site-hq", meta: { total: 8 } },
  { id: "ppl-fin", kind: "person", name: "Financiar & contabilitate (4)", health: "ok", site: "site-hq", meta: { total: 4 } },
  { id: "ppl-mgmt", kind: "person", name: "Management & administrativ (6)", health: "ok", site: "site-hq", meta: { total: 6 } },
  { id: "ppl-dep", kind: "person", name: "Depozit & logistică (10)", health: "ok", site: "site-dep", meta: { total: 10 } },
];

const edges: TwinEdge[] = [
  // Internet / rețea
  { from: "net-wan-hq", to: "vendor-isp", rel: "depends_on" },
  { from: "net-wan-dep", to: "vendor-isp", rel: "depends_on" },
  { from: "fw-hq", to: "net-wan-hq", rel: "depends_on" },
  { from: "fw-dep", to: "net-wan-dep", rel: "depends_on" },
  { from: "vpn-s2s", to: "fw-hq", rel: "depends_on" },
  { from: "vpn-s2s", to: "fw-dep", rel: "depends_on" },
  { from: "sw-hq", to: "fw-hq", rel: "depends_on" },
  { from: "sw-dep", to: "fw-dep", rel: "depends_on" },
  { from: "wifi-hq", to: "sw-hq", rel: "depends_on" },
  { from: "wifi-dep", to: "sw-dep", rel: "depends_on" },
  { from: "vlan-ot", to: "sw-dep", rel: "depends_on" },

  // Servere
  { from: "srv-01", to: "sw-hq", rel: "depends_on" },
  { from: "vm-ad", to: "srv-01", rel: "runs_on" },
  { from: "vm-files", to: "srv-01", rel: "runs_on" },
  { from: "vm-erp", to: "srv-01", rel: "runs_on" },
  { from: "vm-erp", to: "db-erp", rel: "stores" },
  { from: "vm-erp", to: "vm-ad", rel: "depends_on" },
  { from: "vm-files", to: "vm-ad", rel: "depends_on" },
  { from: "vm-erp", to: "vendor-erp", rel: "provided_by" },
  { from: "svc-efactura", to: "vm-erp", rel: "depends_on" },
  { from: "svc-efactura", to: "vendor-anaf", rel: "depends_on" },

  // Backup
  { from: "nas-hq", to: "srv-01", rel: "backs_up" },
  { from: "nas-hq", to: "db-erp", rel: "backs_up" },
  { from: "nas-hq", to: "vm-files", rel: "backs_up" },
  { from: "bk-offsite", to: "srv-01", rel: "backs_up" },
  { from: "bk-offsite", to: "db-erp", rel: "backs_up" },
  { from: "bk-offsite", to: "vm-files", rel: "backs_up" },
  { from: "bk-offsite", to: "data-sharepoint", rel: "backs_up" },
  { from: "nas-hq", to: "sw-hq", rel: "depends_on" },

  // Cloud
  { from: "svc-m365", to: "vendor-m365", rel: "provided_by" },
  { from: "svc-email", to: "svc-m365", rel: "depends_on" },
  { from: "svc-m365", to: "data-sharepoint", rel: "stores" },
  { from: "svc-m365", to: "id-users", rel: "depends_on" },

  // Stații & oameni
  { from: "ws-hq", to: "sw-hq", rel: "depends_on" },
  { from: "ws-dep", to: "sw-dep", rel: "depends_on" },
  { from: "scan-dep", to: "wifi-dep", rel: "depends_on" },
  { from: "scan-dep", to: "vlan-ot", rel: "depends_on" },
  { from: "scan-dep", to: "vm-erp", rel: "depends_on" },
  { from: "ws-dep", to: "vpn-s2s", rel: "depends_on" },
  { from: "prn-hq", to: "sw-hq", rel: "depends_on" },

  { from: "ppl-vanzari", to: "vm-erp", rel: "uses" },
  { from: "ppl-vanzari", to: "svc-m365", rel: "uses" },
  { from: "ppl-vanzari", to: "ws-hq", rel: "uses" },
  { from: "ppl-fin", to: "vm-erp", rel: "uses" },
  { from: "ppl-fin", to: "svc-efactura", rel: "uses" },
  { from: "ppl-fin", to: "vm-files", rel: "uses" },
  { from: "ppl-fin", to: "svc-m365", rel: "uses" },
  { from: "ppl-fin", to: "ws-hq", rel: "uses" },
  { from: "ppl-mgmt", to: "svc-m365", rel: "uses" },
  { from: "ppl-mgmt", to: "vm-files", rel: "uses" },
  { from: "ppl-mgmt", to: "ws-hq", rel: "uses" },
  { from: "ppl-dep", to: "vm-erp", rel: "uses" },
  { from: "ppl-dep", to: "scan-dep", rel: "uses" },
  { from: "ppl-dep", to: "ws-dep", rel: "uses" },
];

export const demoTwin: Twin = {
  company: {
    name: "Meridian Distribuție SRL",
    slug: "meridian",
    since: "2026-03-01",
    plan: "Nucleu Continuu",
  },
  business: {
    people: 28,
    annualRevenue: 18_500_000,
    workHoursPerYear: 1_800,
    hourlyCostPerPerson: 95,
    itDependencyShare: 0.55,
    dataSensitivity: 4,
    sector: "Distribuție alimentară",
  },
  nodes,
  edges,
};
