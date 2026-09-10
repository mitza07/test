# Diagnostic complet: de ce nu mai e găsit PC-ul

Referință pentru situațiile în care instalarea din [README](../README.md) nu a
fost de ajuns, sau pur și simplu vrei să înțelegi ce se întâmplă sub capotă.

---

## 1. Tabelul cauzelor

Ordonat după cât de des e vinovatul real.

| Cauză | Cum se manifestă | Remediu |
|---|---|---|
| **Somn după N minute pe priză** | Merge perfect cât ești la calculator, cade după pauza de masă | `powercfg /change standby-timeout-ac 0`, plus agentul |
| **Modern Standby (S0)** | PC-ul „nu doarme" — LED aprins, ventilator oprit — dar sesiunea tot moare | Agentul; în ultimă instanță secțiunea 3 de mai jos |
| **Economie de energie pe placa de rețea** | Cade doar după inactivitate lungă, deși PC-ul e treaz | Debifează *Allow the computer to turn off this device* |
| **Wi-Fi pe Power Saving** | Cade aleatoriu pe wireless, niciodată pe cablu | Wireless Adapter Settings → *Maximum Performance* |
| **USB selective suspend** | Doar pe mașini cu adaptor de rețea pe USB: pică deși PC-ul e clar treaz | Instalatorul îl oprește pe priză când detectează placă USB |
| **Claude Desktop închis / delogat** | Cade instant, la orice oră, indiferent de energie | Ține aplicația pornită și logată |
| **Windows Update a repornit** | Cade întotdeauna noaptea, la aceeași oră | Active hours; diagnosticul arată `User32 1074` |
| **Pană de curent / crash** | Cade brusc, `Kernel-Power 41` în jurnal | `perfmon /rel` în jurul acelui moment |
| **VPN / firewall / proxy** | `TCP 443 to claude.ai: NOT reachable` | Rețeaua, nu somnul |

Diagnosticul (`Test-ClaudeReachability.ps1`) verifică toate rândurile de mai sus
și îți spune care se aplică, cu comanda de reparat lângă fiecare.

---

## 2. Cum citești raportul

**Sleep capability** — modelul de somn al mașinii. `Modern Standby` înseamnă că
Windows nu mai folosește S3 clasic, ci o stare din care aplicațiile pot fi
suspendate. Contează pentru secțiunea 3.

**Power plan** — `Sleep after (plugged in)` trebuie să fie `Never` dacă vrei
sesiuni lungi. Restul valorilor sunt informative; comportamentul pe baterie e
lăsat intenționat neatins de instalator.

**Network adapters** — pentru fiecare placă activă: MAC-ul (necesar la
Wake-on-LAN), dacă e armată pentru pachet magic și dacă Windows are voie să o
oprească.

**What happened recently** — jurnalul de evenimente power din ultimele 48h,
tradus în limbaj omenesc. Aici vezi negru pe alb dacă mașina a adormit, a
repornit sau a picat.

| ID | Sursă | Înseamnă |
|---|---|---|
| 42 | Kernel-Power | A intrat în somn — orice sesiune atașată a murit acolo |
| 107 | Kernel-Power | A revenit din somn |
| 41 | Kernel-Power | A repornit fără oprire curată: curent, temperatură sau driver |
| 109 | Kernel-Power | Kernelul a inițiat oprirea/repornirea |
| 1 | Power-Troubleshooter | Revenire din somn, cu sursa trezirii |
| 1074 | User32 | O aplicație a cerut oprirea — de regulă Windows Update |

**Claude** — dacă rulează vreun proces Claude și dacă ține efectiv o conexiune
HTTPS. Un proces pornit dar fără conexiune înseamnă delogat sau blocat de rețea.

**Keep-alive agent** — dacă agentul e instalat și dacă bate inima. Un heartbeat
mai vechi de 5 minute înseamnă că nu rulează.

---

## 3. Modern Standby, în detaliu

Laptopurile moderne nu mai au somn S3. Au **S0 Low Power Idle**: sistemul rămâne
tehnic pornit, dar Windows suspendă procesele și, pe multe configurații, oprește
rețeaua după câteva minute. De aici vine contradicția „calculatorul nu doarme,
dar tot pică sesiunea".

Verifici direct:

```powershell
powercfg /a
Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Power' -Name CsEnabled
```

`CsEnabled = 1` înseamnă Modern Standby.

Pe astfel de mașini, cererea de energie a agentului e **necesară dar uneori
insuficientă**, fiindcă firmware-ul poate forța tranziția oricum. Instrumentul
care spune adevărul:

```powershell
powercfg /sleepstudy      # generează sleepstudy-report.html
```

Raportul arată fiecare intrare în standby, cât a stat, ce a consumat și, mai
important, ce componentă a blocat sau a forțat tranziția.

### Revenirea la S3 clasic — ultimă soluție

```powershell
# Necesită administrator și repornire.
Set-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Power' `
    -Name PlatformAoAcOverride -Value 0 -Type DWord
```

> **Atenție.** Nu toate platformele implementează S3 în firmware. Pe unele
> laptopuri rezultatul e că nu mai există somn funcțional deloc, sau că mașina nu
> mai revine corect din somn. Încearcă asta doar dacă restul a eșuat și știi cum
> să dai înapoi:
>
> ```powershell
> Remove-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Power' -Name PlatformAoAcOverride
> ```
>
> urmat de repornire. Verifică `powercfg /a` înainte și după, ca să știi ce stări
> aveai de fapt.

---

## 4. Wake-on-LAN, pas cu pas

Ordinea contează — dacă sari peste primul pas, restul nu are efect.

**1. BIOS/UEFI.** Caută și activează, sub denumirea pe care o folosește
producătorul tău:

- *Wake on LAN* / *Power On by PCI-E* / *Resume by PCI-E Device*
- *ErP Ready* → **Disabled** (ErP taie curentul spre placa de rețea în standby)
- *Deep Sleep Control* → **Disabled**

**2. Windows.**

```powershell
.\windows\Install-ClaudeKeepAlive.ps1 -EnableWakeOnLan -DisableFastStartup
```

Fast startup contează: cu el activ, *Shut down* nu oprește complet mașina, ci o
lasă într-o stare hibridă din care majoritatea plăcilor nu se trezesc.

**3. Verifică ce are voie să trezească mașina:**

```powershell
powercfg /devicequery wake_armed
powercfg /lastwake
powercfg /waketimers
```

**4. Trimite pachetul** de pe orice mașină din aceeași rețea:

```bash
./tools/wake-claude-pc.sh -w numele-pc AA:BB:CC:DD:EE:FF
```

### Limitări reale

- Pachetul magic e **broadcast pe subrețeaua locală**. Peste VPN merge doar dacă
  VPN-ul face bridge la broadcast — majoritatea nu fac.
- De pe internet ai nevoie de port forward către adresa de broadcast a
  subrețelei, iar multe routere refuză din principiu. Alternativa curată e un
  dispozitiv mereu pornit în casă (NAS, Raspberry Pi, router cu SSH) care rulează
  `wake-claude-pc.sh` la cerere.
- Pe mașini cu Modern Standby, Wake-on-LAN clasic adesea nici nu se aplică —
  mașina nu ajunge niciodată în starea din care ar trebui trezită.

---

## 5. Comenzi de referință

```powershell
powercfg /a                      # ce stări de somn suportă mașina
powercfg /requests               # ce ține sistemul treaz ACUM (necesită admin)
powercfg /lastwake               # ce l-a trezit ultima dată
powercfg /waketimers             # ce are programat să-l trezească
powercfg /devicequery wake_armed # ce dispozitive au voie să-l trezească
powercfg /sleepstudy             # raport HTML: fiecare intrare în standby
powercfg /energy                 # urmărire 60s, găsește cine strică economia
perfmon /rel                     # Reliability Monitor: crash-uri și reporniri
```

Pentru agent:

```powershell
.\windows\ClaudeKeepAlive.ps1 -Once                    # ce ar decide acum
Get-Content "$env:LOCALAPPDATA\ClaudeKeepAlive\keepalive.log" -Tail 40
Get-Content "$env:LOCALAPPDATA\ClaudeKeepAlive\status.json" | ConvertFrom-Json
Get-ScheduledTask -TaskName ClaudeKeepAlive | Get-ScheduledTaskInfo
```

---

## 6. Când nu e vina calculatorului

Dacă diagnosticul iese curat și sesiunea tot cade, verifică în ordinea asta:

1. `powercfg /requests` în timpul unei sesiuni — dacă nu apare nicio cerere de la
   agent, agentul nu rulează.
2. Routerul: unele modele închid conexiunile TCP inactive după un interval fix.
   Sesiunea trimite keepalive, dar un NAT agresiv tot o poate tăia.
3. Conexiunea în sine: Wi-Fi la limita semnalului cade și revine fără ca Windows
   să raporteze nimic în jurnal.

Iar dacă nimic din toate astea nu ține — mută sesiunea în cloud. E singura
variantă care nu depinde de starea unei mașini fizice.
