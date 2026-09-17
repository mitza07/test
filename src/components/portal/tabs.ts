export type Tab =
  | "sumar" | "geaman" | "simulari" | "intentii" | "inventar" | "identitati" | "backup" | "securitate" | "risc" | "rapoarte" | "jurnal" | "documente" | "facturare";

export const tabIds: Tab[] = ["sumar", "geaman", "simulari", "intentii", "inventar", "identitati", "backup", "securitate", "risc", "rapoarte", "jurnal", "documente", "facturare"];

export function isTab(v: string): v is Tab {
  return (tabIds as string[]).includes(v);
}
