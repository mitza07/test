#!/usr/bin/env bash
# Verifică regulile de consum de tokeni din docs/token-rules.md pe codul care construiește
# cereri către Claude API.
#
#   ./scripts/check-cache-breakers.sh [cale...]     (implicit: directorul curent)
#
# Ieșire: 1 dacă există încălcări dure, 0 altfel. Avertismentele nu opresc build-ul —
# tiparele lor sunt legitime în afara prefixului promptului și cer ochi uman.

set -uo pipefail

if [ "$#" -gt 0 ]; then targets=("$@"); else targets=("."); fi
self="$(basename "${BASH_SOURCE[0]}")"

exclude=(
  --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.venv
  --exclude-dir=venv --exclude-dir=dist --exclude-dir=build
  --exclude=token-rules.md --exclude="$self"
)

hard_hits=0
soft_hits=0
q="['\"]"   # ghilimea simplă sau dublă

# check <EROARE|ATENȚIE> <etichetă> <regex> <motiv> [regex_de_ignorat]
check() {
  local kind="$1" label="$2" regex="$3" reason="$4" ignore="${5:-}" out

  out="$(grep -rEn "${exclude[@]}" -e "$regex" "${targets[@]}" 2>/dev/null)"
  [ -n "$ignore" ] && out="$(printf '%s\n' "$out" | grep -Ev "$ignore")"
  out="$(printf '%s' "$out" | grep -v '^$')"
  [ -z "$out" ] && return 0

  printf '\n[%s] %s\n  → %s\n' "$kind" "$label" "$reason"
  printf '%s\n' "$out" | sed 's/^/    /'

  if [ "$kind" = "EROARE" ]; then
    hard_hits=$((hard_hits + 1))
  else
    soft_hits=$((soft_hits + 1))
  fi
}

echo "Verific regulile din docs/token-rules.md în: ${targets[*]}"

# --- Încălcări dure (R5, R6, I1/R3) ---------------------------------------

check EROARE "budget_tokens" \
  'budget_tokens' \
  'R6: returnează 400 pe modelele curente; folosește thinking adaptiv + effort'

check EROARE "parametri de sampling" \
  '(temperature|top_p|top_k)[[:space:]]*[=:]' \
  'R6: temperature/top_p/top_k sunt respinse cu 400 pe modelele curente'

check EROARE "thinking dezactivat" \
  "${q}type${q}[[:space:]]*:[[:space:]]*${q}disabled${q}" \
  'R6: pe claude-opus-5 emite tool calls ca text simplu și scurge tag-uri interne'

check EROARE "istoric mutat" \
  '(messages\.(pop|shift|splice)\(|del[[:space:]]+messages\[|messages[[:space:]]*=[[:space:]]*messages\[)' \
  'I1/R3: istoricul este append-only — nu se șterge, nu se trunchiază'

check EROARE "max_tokens sub 10k" \
  'max_tokens[[:space:]]*[=:][[:space:]]*[0-9]{1,4}([^0-9]|$)' \
  'R5: plafonul taie răspunsul la mijloc; folosește 64000 + streaming'

# --- De verificat manual (R2, interziceri) --------------------------------

check ATENȚIE "conținut volatil" \
  '(datetime\.now\(\)|time\.time\(\)|Date\.now\(\)|uuid4\(\)|randomUUID\(\))' \
  'R2: dacă ajunge în tools sau system, invalidează tot prefixul de acolo încolo'

check ATENȚIE "serializare nesortată" \
  'json\.dumps\(' \
  'R2: fără sort_keys=True prefixul poate diferi între cereri identice' \
  'sort_keys'

check ATENȚIE "context editing" \
  'clear_tool_uses' \
  'Interzis ca pârghie de economie — rescrie conversația cacheată și a costat mai mult decât a salvat'

# --- Raport ---------------------------------------------------------------

echo
if [ "$hard_hits" -gt 0 ]; then
  echo "✗ $hard_hits regulă(i) încălcată(e). Vezi docs/token-rules.md."
  exit_code=1
else
  if [ "$soft_hits" -gt 0 ]; then
    echo "✓ Nicio încălcare dură. $soft_hits tipar(e) de verificat manual."
  else
    echo "✓ Nicio încălcare."
  fi
  exit_code=0
fi

cat <<'EOF'

Verificarea statică nu poate confirma singurul lucru care contează cu adevărat:
că prefixul chiar se citește din cache. Rulează aceeași cerere de două ori și
compară `usage.cache_read_input_tokens` la a doua — zero înseamnă cache spart.
EOF

exit "$exit_code"
