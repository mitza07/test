"use client";

import { PCard, PTable, PageTitle, PStat } from "../ui";
import { Badge } from "@/components/ui/Badge";
import { Proof } from "@/components/ui/Proof";
import { mfaProof } from "@/lib/demo/state";

const accounts = [
  { name: "ana.ionescu", role: "Vânzări", mfa: true, priv: false, last: "azi 09:12", device: "conform" },
  { name: "mihai.popa", role: "Director general", mfa: true, priv: false, last: "azi 08:40", device: "conform" },
  { name: "receptie", role: "Cont partajat · recepție", mfa: false, priv: false, last: "azi 08:01", device: "stație fixă", note: "plan: conturi individuale până la 30 sep" },
  { name: "d.marin", role: "Financiar", mfa: true, priv: false, last: "ieri 17:55", device: "conform" },
  { name: "admin-nucleu", role: "Administrator (Nucleu)", mfa: true, priv: true, last: "15 sep 14:12", device: "conform" },
  { name: "admin-break-glass", role: "Administrator de urgență (client)", mfa: true, priv: true, last: "niciodată", device: "sigilat" },
  { name: "radu.m", role: "Depozit", mfa: true, priv: false, last: "azi 06:58", device: "conform", note: "plecare programată 30 sep · offboarding automat" },
  { name: "scanner-svc", role: "Cont de serviciu · scannere", mfa: false, priv: false, last: "azi 07:00", device: "restricționat la VLAN depozit", note: "fără MFA prin design; parolă rotită lunar" },
];

export function Identitati() {
  return (
    <div>
      <PageTitle title="Identități" lead="Cine are acces la ce, verificat zilnic. Comparat automat cu lista HR: zero conturi orfane e o dovadă, nu o promisiune." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PStat label="Conturi" value="30" hint="+ 3 privilegiate, separate" />
        <PStat label="MFA activ" value="28 / 30" tone="warn" hint="2 rămase: recepție (cont partajat), 1 cont de serviciu" />
        <PStat label="Conturi orfane" value="0" tone="good" hint="verificat azi 06:00 față de HR" />
        <PStat label="Licențe folosite" value="96%" hint="30/30 M365 · 1 în rezervă pentru Ana Pop" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <PCard title="Conturi (extras)" className="xl:col-span-2" padded={false}>
          <PTable
            head={["Cont", "Rol", "MFA", "Privilegiat", "Ultima autentificare", "Dispozitiv"]}
            rows={accounts.map((a) => [
              <div key="n"><span className="num font-medium">{a.name}</span>{a.note && <div className="mt-0.5 text-xs text-ink-3">{a.note}</div>}</div>,
              a.role,
              <Badge key="m" tone={a.mfa ? "good" : "warn"}>{a.mfa ? "da" : "nu"}</Badge>,
              a.priv ? <Badge key="p" tone="accent">da</Badge> : "—",
              <span key="l" className="num text-xs">{a.last}</span>,
              a.device,
            ])}
          />
        </PCard>
        <div className="space-y-4">
          <Proof id={mfaProof.id} title={mfaProof.title} value={mfaProof.value} when={mfaProof.when} method={mfaProof.method} />
          <PCard title="Politici active">
            <ul className="space-y-2 text-sm text-ink-2">
              <li>· MFA obligatoriu; excepții doar pentru conturi de serviciu, restricționate pe rețea</li>
              <li>· Acces condiționat: doar dispozitive conforme (criptate, EDR activ)</li>
              <li>· Conturi privilegiate separate, fără e-mail, revizuite lunar</li>
              <li>· Offboarding: blocare la ora stabilită, verificare la 24 h</li>
              <li>· Parole: manager al firmei, fără parole în chat sau e-mail</li>
            </ul>
          </PCard>
        </div>
      </div>
    </div>
  );
}
