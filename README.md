# test

Reguli de consum de tokeni pentru cod care apelează Claude API.

- [`CLAUDE.md`](CLAUDE.md) — regulile (R1–R16), invarianții și lista de practici interzise
  cu motivul fiecăreia.
- [`scripts/check-cache-breakers.sh`](scripts/check-cache-breakers.sh) — verificare statică
  a regulilor; iese cu 1 la încălcări dure.

```bash
./scripts/check-cache-breakers.sh          # tot repo-ul
./scripts/check-cache-breakers.sh src/     # doar o cale
```

Regulile pleacă de la doi invarianți: **istoricul nu se pierde** și **inteligența nu se
sacrifică pentru cost**. Pârghiile care schimbă calitate contra cost — `effort` redus, model
mai mic, task budgets, plafoane de output — sunt deliberat în afara setului.
