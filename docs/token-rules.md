# Reguli de consum de tokeni — Claude API

Se aplică oricărui cod din acest repo care apelează Claude API.

> Regulile stau separat de `CLAUDE.md` (constrângeri și decizii de arhitectură) pentru că se
> schimbă în alt ritm și nu au legătură cu domeniul aplicației. Ca să fie încărcate automat
> în sesiunile Claude Code, adaugă în `CLAUDE.md` o linie:
> `Reguli de consum de tokeni pentru cod care apelează Claude API: vezi docs/token-rules.md`.

Optimizăm **costul per task finalizat**, nu costul per token.

## Invarianți

Au precedență peste orice regulă de mai jos. Dacă o optimizare le încalcă, optimizarea pică.

- **I1 — Istoricul nu se pierde.** `messages[]` este append-only. Nu ștergem, nu trunchiem,
  nu rezumăm și nu rescriem turn-uri anterioare.
- **I2 — Inteligența nu se sacrifică pentru cost.** Nicio regulă nu are voie să scadă
  acuratețea. Pârghiile care schimbă calitate contra cost (`effort` redus, model mai mic,
  task budgets, plafoane de output) sunt **în afara** acestui set de reguli.

Consecință directă: **retrimiterea integrală a istoricului este mai ieftină decât tăierea lui.**
Caching-ul e prefix match — scoaterea unui mesaj vechi schimbă prefixul din acel punct, deci
tot restul conversației se reprocesează la preț întreg plus o scriere nouă la 1.25×. Cu cache
pornit, istoricul retrimis costă 0.1×.

---

## R1 — Prompt caching pe orice rută repetitivă

Forma standard: un breakpoint **explicit** pe ultimul bloc din `system` (prefixul static) plus
`cache_control` **top-level** pentru coada conversației.

```python
response = client.messages.create(
    model="claude-opus-5",
    max_tokens=64000,
    thinking={"type": "adaptive"},
    output_config={"effort": "xhigh"},
    cache_control={"type": "ephemeral"},                        # coada, automat
    system=[{"type": "text", "text": SYSTEM_STATIC,
             "cache_control": {"type": "ephemeral"}}],           # prefix static, explicit
    tools=TOOLS,
    messages=history,
)
```

- Maxim 4 breakpoints per cerere.
- Ordinea de randare este `tools` → `system` → `messages`. Conținutul stabil stă fizic înaintea
  celui volatil.
- Prefix minim cacheabil, dependent de model (sub el nu se cachează nimic, fără eroare):
  512 tokeni pe `claude-opus-5` / `claude-fable-5-1`, 1024 pe `claude-opus-4-8` / `claude-sonnet-5`,
  4096 pe `claude-opus-4-6` / `claude-haiku-4-5`.
- Prompturi al căror prim K de tokeni diferă la fiecare cerere **nu** se cachează — marcajul
  ar plăti doar prima de scriere, fără nicio citire.

## R2 — Prefixul rămâne byte-identic

Interzis oriunde în `tools` sau `system`:

| Tipar | Înlocuire |
|---|---|
| `datetime.now()`, `time.time()` | Trimite data în ultimul mesaj de user |
| `uuid4()`, request ID | Idem, sau scoate-l complet |
| `json.dumps(d)` fără `sort_keys=True` | `json.dumps(d, sort_keys=True)` |
| Iterare peste un `set` | Sortează înainte de serializare |
| ID de user/sesiune interpolat în system | Mesaj de user, sau `role: "system"` (R4) |
| Secțiuni condiționale (`if flag: system += ...`) | Variantă unică, cu flag-ul transmis în mesaje |
| Set de tool-uri variabil per user | Set unic, sortat după nume |

## R3 — Istoric append-only

- Adaugă `response.content` **integral** înapoi în `messages`, inclusiv blocurile `thinking`
  și `compaction` — nu doar textul extras.
- Nu șterge mesaje injectate temporar. Pentru remindere per-turn folosește un mesaj de sistem
  cu `clear_at: "next_user_message"` și lasă copiile vechi în transcript.
- Motiv dublu: fiecare editare de istoric e un cache miss din acel punct, iar pe modelele cu
  preserved thinking editarea invalidează blocurile de thinking ulterioare.

## R4 — Instrucțiunile de operator sunt mesaje, nu `system` rescris

```python
messages.append({"role": "system", "content": "Mod concis până la notificare."})
```

Editarea `system`-ului top-level schimbă prefixul din fața întregii conversații. Un mesaj cu
`role: "system"` stă după istoricul cacheat și nu invalidează nimic.

Regulă de securitate care vine la pachet: instrucțiunile de operator **nu** se pun ca text
într-un mesaj de user — acel canal poate fi contrafăcut de orice intră în input. `role: "system"`
este canalul nefalsificabil.

Constrângeri: trebuie să urmeze un mesaj `user`, nu poate fi `messages[0]`, conținut text.
Disponibil pe `claude-opus-5`, `claude-opus-4-8`, `claude-fable-5` / `claude-fable-5-1`.
Pe modelele care nu îl acceptă răspunsul e 400 — prinde eroarea și cazi înapoi pe un bloc de
text în mesajul de user.

## R5 — `max_tokens` este plasă de siguranță, nu buton de reglaj

- `max_tokens = 64000` pentru muncă agentică; `128000` la `effort` `xhigh` sau `max`.
- Cereri cu `max_tokens` mare merg pe streaming (`.stream()` + `.get_final_message()`).
- `stop_reason == "max_tokens"` se tratează ca **încercare eșuată**; nu se reîncearcă la
  același plafon.
- Ca să scurtezi răspunsul vizibil, specifică forma exactă în prompt cu un exemplu (R11) —
  nu prin plafon.

## R6 — Thinking adaptiv, parametri de sampling interziși

```python
thinking={"type": "adaptive"}
output_config={"effort": "xhigh"}    # low | medium | high | xhigh | max
```

Returnează 400 pe modelele curente și nu se folosesc: `budget_tokens`, `temperature`,
`top_p`, `top_k`, prefill pe ultimul mesaj de assistant.

`thinking: {"type": "disabled"}` este interzis: pe `claude-opus-5` produce ocazional tool
call-uri scrise în textul vizibil (apelul nu se execută niciodată, fără eroare) și scurgeri de
tag-uri interne în răspuns.

## R7 — Model, tool-uri și `effort` fixate per rută

Schimbarea lor la mijlocul unei conversații invalidează cache-ul:

| Schimbare | Ce se pierde |
|---|---|
| Model | Tot — cache-urile sunt per model, fără escape hatch |
| Definiții de tool-uri | Tot — se randează la poziția 0 |
| `thinking` sau `effort` | Cache-ul de mesaje, pe unele modele și tools+system |
| `tool_choice`, imagini | Doar cache-ul de mesaje |
| Conținut de mesaje | Nimic din tools+system |

Dacă ai nevoie de „moduri", nu schimba setul de tool-uri — transmite modul prin conținut.

## R8 — Alegerea TTL-ului din intervalul start-to-start

Se măsoară de la **începutul** cererii, nu de la sfârșit — timpul de generare intră în TTL.

| Interval între cereri cu același prefix | TTL |
|---|---|
| Sub 5 minute | `{"type": "ephemeral"}` (default) — fiecare cerere îl reîmprospătează |
| 5–60 minute | `{"type": "ephemeral", "ttl": "1h"}` |
| Peste o oră | Niciunul nu ajută direct — re-încălzire programată sau accepți miss-ul |

## R9 — Fan-out serializat pe primul token

O intrare de cache devine lizibilă abia după ce **începe** streaming-ul primului răspuns.
N cereri paralele cu același prefix plătesc toate preț întreg.

Trimite 1 cerere → așteaptă primul token → trimite restul de N-1.

## R10 — Input: nimic la rezoluție sau volum mai mare decât cere task-ul

- Document mare de referință: fie în prefixul cacheat (0.1×), fie în spatele unui tool. Nu
  rezumat — rezumatul pierde informație și încalcă I1.
- Imagini: downscale înainte de trimitere. ~1 token per patch de 28×28; 1280×720 plafonează
  o imagine pe la ~1200 tokeni.
- Tabele și fișiere de date: Files API + code execution, ca doar rezultatul să intre în context.
- Scheme de tool-uri peste ~10K tokeni: `defer_loading: true` pe cele rare + tool search.
  Sub pragul ăsta, pasul de căutare e overhead.
- Lanțuri de tool calls cu intermediari inutili: programmatic tool calling.
- Tool-uri înguste (`get_policy(claim_id)`), nu `get_all_policies()`; parametri `limit` /
  `fields` / `date_range` pe orice tool care listează.
- Input nelimitat de la user: `count_tokens` ca poartă de ingestie înainte de apel.

## R11 — Output: forma cerută explicit

- Specifică structura exactă a răspunsului în prompt, ideal cu un exemplu.
- Stop sequences ca ieșiri timpurii pentru cazurile în care modelul nu poate continua
  (ex. un sentinel `<CANNOT_ANSWER>`), ca să nu cheltuie tokeni explicând.

## R12 — Cache la nivel de aplicație înaintea oricărui apel

Cel mai ieftin token e cel netrimis. Înainte de a construi o cerere:

- răspunsuri identice → cache exact;
- întrebări cu același sens → cache semantic;
- clasificări, traduceri, sumarizări deja calculate → din baza de date;
- rezultate de tool-uri și căutări → cache cu invalidare pe sursă.

Ortogonal pe prompt caching; se cumulează cu el.

## R13 — Batch API pentru tot ce nu are pe cineva care așteaptă

50% reducere pe **fiecare** token din cerere, inclusiv citirile și scrierile de cache —
discounturile se cumulează. Eval-uri, backfill-uri, job-uri programate.

Rezultatele vin în maximum 24h; fereastra e expirare, nu SLA. Munca cu user în față rămâne
sincronă. Cererile sunt single-shot — fără buclă de tool-uri.

## R14 — Subagenți pe același model, cu `effort` mai mic

Un subagent pornește un prefix nou, **fără cache partajat cu părintele**. Merită doar pentru
pași auto-conținuți cu rezultate voluminoase pe care le întoarce condensate.

- Același model ca părintele → un singur namespace de cache, comportament consistent.
- **Nu** pe alt provider și nu pe alt model: pierzi partajarea de cache și introduci o a doua
  familie de comportament, contra I2.
- Nu folosi subagent când modelul care decide are nevoie de contextul intermediar ca să judece.

## R15 — Refuzuri tratate explicit

Verifică `stop_reason` **înainte** de a citi `content`. Pe `claude-opus-5` activează fallback-ul
server-side, ca un refuz să nu întoarcă un răspuns gol:

```python
response = client.beta.messages.create(
    model="claude-opus-5",
    betas=["server-side-fallback-2026-07-01"],
    fallbacks="default",
    ...
)
```

## R16 — Măsurarea e obligatorie, nu opțională

Loghează la fiecare cerere cele patru contoare și costul per task:

```python
u = response.usage
log(task_id, u.input_tokens, u.cache_creation_input_tokens,
    u.cache_read_input_tokens, u.output_tokens)
```

- Mărimea totală a promptului = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`.
  `input_tokens` singur este doar coada necacheată.
- Hit rate normal: **79–90%**. Sub 80% există un cache-breaker de găsit.
- Semnătura unei bucle sănătoase: `cache_read_input_tokens` crește turn cu turn și domină;
  `cache_creation_input_tokens` e cât un turn, nu cât toată conversația.
- Re-verifică după **fiecare** modificare a codului care construiește promptul. Regresiile de
  caching sunt tăcute: cererile reușesc, doar factura crește.
- Rulează `scripts/check-cache-breakers.sh` înainte de commit.

---

## Interzis, cu motivul

| Practică | De ce nu |
|---|---|
| Sliding window, sumarizare periodică, arhivarea mesajelor vechi | Încalcă I1 și, cu cache pornit, costă mai mult decât retrimiterea integrală |
| Context editing (`clear_tool_uses`) ca pârghie de economie | Este instrument pentru fereastra de context. Fiecare curățare rescrie conversația cacheată; în rularea măsurată a costat mai mult decât a salvat |
| `effort` redus, model mai mic, task budgets | Încalcă I2 — sunt compromisuri de calitate |
| Plafoane mici de `max_tokens` pentru economie | Taie răspunsul la mijloc; costul per task rezolvat nu scade |
| Trunchierea input-ului | Răspuns greșit → reîncercare → cost dublu |
| Ștergerea comentariilor din cod, minificarea JSON-ului | În prefixul cacheat costă 0.1× oricum; codul fără comentarii e mai greu de înțeles pentru model |
| Ștergerea exemplelor few-shot din prefixul cacheat | Costă aproape nimic acolo și adesea cresc acuratețea |
| Schimbarea modelului la mijlocul unei conversații | Cache-urile sunt per model, fără escape hatch |

---

## Ordinea de aplicare

Câte o pârghie per diff, măsurată separat. O modificare care economisește dar cedează acuratețe
se dă înapoi.

1. R16 (măsurare) — fără ea nimic nu e verificabil
2. R5, R6 (`max_tokens`, thinking) — câștig de calitate, nu de cost
3. R1, R2, R3, R4, R7, R8 (caching și prefix stabil) — pârghia principală
4. R10, R11 (igiena input/output)
5. R12, R13 (cache de aplicație, batch)
6. R9, R14, R15 (fan-out, subagenți, refuzuri)
