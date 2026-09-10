# „Can't reach your computer" — soluție

> *It may be asleep or offline. This session will reconnect when it's back.*

Mesajul apare fiindcă sesiunea pe care o deschizi din claude.ai (sau din telefon)
**rulează pe PC-ul tău**, nu în cloud. Aplicația Claude de pe desktop ține o
conexiune permanentă către releu; când Windows adoarme calculatorul, conexiunea
moare și interfața web nu mai are cu cine vorbi. Nu e o eroare de rețea și nu se
repară din browser — se repară pe mașina care găzduiește sesiunea.

Repo-ul ăsta conține atât diagnosticul (**de ce** a picat), cât și remediul.

---

## Soluția, în două straturi

### Stratul 1 — nu mai depinde deloc de PC

Dacă vrei ca sesiunea să meargă chiar și cu laptopul închis, mută-o în cloud:
pornește-o de la **claude.ai/code** ca sesiune remote. Rulează pe un container
Anthropic, nu pe mașina ta, deci nu are cum să „nu te mai găsească".

Compromisul e real: containerul vede doar repo-ul clonat în el, nu fișierele tale
locale. Pentru lucrul pe cod din Git e perfect; pentru fișiere locale, nu.

### Stratul 2 — fă PC-ul să rămână accesibil

Când chiar ai nevoie de sesiune locală, instalează agentul din `windows/`. Ține
calculatorul treaz **doar cât timp e o sesiune Claude conectată**, plus o
perioadă de grație, apoi îi dă drumul să adoarmă normal. Nu-ți transformă
laptopul într-un radiator care merge non-stop.

---

## Instalare rapidă

Deschide PowerShell **ca administrator** în folderul repo-ului:

```powershell
cd windows

# 1. Întâi vezi ce e stricat. Nu modifică nimic.
powershell -ExecutionPolicy Bypass -File .\Test-ClaudeReachability.ps1

# 2. Aplică remediul.
powershell -ExecutionPolicy Bypass -File .\Install-ClaudeKeepAlive.ps1

# 3. Confirmă.
powershell -ExecutionPolicy Bypass -File .\Test-ClaudeReachability.ps1
```

Instalarea face patru lucruri:

| Pas | Ce schimbă |
|---|---|
| Agentul | Copiat în `%LOCALAPPDATA%\ClaudeKeepAlive\bin` |
| Somn pe alimentare | `Sleep after` și `Hibernate after` pe *Never* — **doar** pe priză, comportamentul pe baterie rămâne neatins |
| Wi-Fi | *Maximum Performance* pe priză, ca radioul să nu se culce sub sesiune |
| USB | *Selective suspend* oprit pe priză — **doar** dacă rețeaua merge printr-un adaptor USB, altfel nu se atinge |
| Pornire automată | Task programat la logon **și după fiecare revenire din somn** |

Fără drepturi de administrator agentul tot se instalează; pașii de power plan
sunt raportați explicit ca săriți.

### Opțional: trezire de la distanță

```powershell
.\Install-ClaudeKeepAlive.ps1 -EnableWakeOnLan -DisableFastStartup
```

Notează adresa MAC afișată. De pe alt calculator, telefon (Termux) sau NAS din
aceeași rețea:

```bash
./tools/wake-claude-pc.sh AA:BB:CC:DD:EE:FF
```

```powershell
.\windows\Send-WakeOnLan.ps1 -Mac AA:BB:CC:DD:EE:FF -HostName numele-pc -WaitFor 90
```

Mai trebuie activat și în BIOS/UEFI — detalii în [`docs/DIAGNOSTIC.md`](docs/DIAGNOSTIC.md).

---

## Ce conține

| Fișier | Rol |
|---|---|
| `windows/Test-ClaudeReachability.ps1` | **Începe de aici.** Citește starea reală a mașinii și jurnalul de evenimente power, apoi listează problemele ordonate după gravitate, fiecare cu comanda exactă care o repară. Strict read-only. |
| `windows/Install-ClaudeKeepAlive.ps1` | Instalează agentul și aplică setările. Fiecare valoare modificată e salvată înainte în `restore-point.json`. |
| `windows/ClaudeKeepAlive.ps1` | Agentul. Ține `SetThreadExecutionState` cât timp Claude rulează *și* are o conexiune HTTPS activă. |
| `windows/Uninstall-ClaudeKeepAlive.ps1` | Repune fiecare setare exact cum era. |
| `windows/Send-WakeOnLan.ps1` | Trimite pachet magic din Windows. |
| `tools/wake-claude-pc.sh` | Același lucru din bash — Linux, macOS, NAS, telefon. |
| `docs/DIAGNOSTIC.md` | Tabelul complet cauză → simptom → remediu, plus Modern Standby și Wake-on-LAN în detaliu. |

---

## Verificare și dezinstalare

```powershell
# Ce decide agentul chiar acum, fără să pornească bucla:
.\windows\ClaudeKeepAlive.ps1 -Once

# Jurnalul agentului:
Get-Content "$env:LOCALAPPDATA\ClaudeKeepAlive\keepalive.log" -Tail 40

# Ce ține mașina trează în acest moment (orice program, nu doar Claude):
powercfg /requests

# Înapoi la starea inițială:
.\windows\Uninstall-ClaudeKeepAlive.ps1        # ridicat, ca să poată repune power plan-ul
```

Toate scripturile suportă `-WhatIf`, dacă vrei să vezi ce ar face fără să facă.

---

## Ce nu rezolvă

- **Curent luat sau reboot de Windows Update.** Agentul nu poate opri un
  calculator care se stinge. Diagnosticul le semnalează separat, ca să nu dai
  vina pe setările de somn.
- **VPN, firewall corporate, proxy.** Dacă `TCP 443 to claude.ai` iese
  *NOT reachable* în diagnostic, problema e rețeaua, nu somnul.
- **Claude Desktop închis sau delogat.** Nicio setare de energie nu ajută dacă nu
  rulează nimic care să accepte sesiunea.
