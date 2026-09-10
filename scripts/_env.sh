#!/usr/bin/env bash
# Incarcarea `.env`, comuna scripturilor de operare. Se ia cu `source`.
#
# DE CE EXISTA: `migrate-prod.sh`, `backup.sh` si `restore-test.sh` ruleaza cu
# `set -euo pipefail` si folosesc `${POSTGRES_USER}` si `${POSTGRES_DB}`, dar nu
# incarcau `.env`. Pe un shell curat, `set -u` opreste scriptul la prima
# variabila nedefinita, inainte sa faca ceva — inclusiv `migrate-prod.sh`, care
# e ultimul pas din runbook. Mergeau doar daca cineva exportase variabilele de
# mana in shell-ul ala, ceea ce nu scria nicaieri.
#
# `setup-db-roles.sh` avea deja incarcarea, scrisa inline. Acum o ia de aici,
# ca sa nu existe doua variante care se pot desincroniza.

# `.env` are valori cu spatii si cu `#` in ele (parole generate). `set -a`
# exporta tot ce se defineste intre cele doua marcaje, fara sa fie nevoie de
# `export` pe fiecare linie.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# Opreste scriptul cu un mesaj util, nu cu „unbound variable".
require_env() {
  local lipsa=()
  local nume
  for nume in "$@"; do
    # Indirectare: `${!nume}` da valoarea variabilei al carei NUME e in $nume.
    if [ -z "${!nume:-}" ]; then
      lipsa+=("$nume")
    fi
  done
  if [ ${#lipsa[@]} -gt 0 ]; then
    echo "EROARE: lipsesc din .env: ${lipsa[*]}" >&2
    echo "Ruleaza din radacina proiectului (/srv/facturare in productie)," >&2
    echo "sau completeaza .env dupa modelul din .env.example." >&2
    return 1
  fi
}

# `IMAGE` e ceruta de TOATE comenzile de compose, nu doar de cele care ating
# `api`: interpolarea se face la parsarea fisierului, pentru toate serviciile,
# inainte ca Compose sa se uite ce serviciu i-ai cerut. Deci pana si
# `docker compose ... exec -T db` esueaza fara ea, iar `docker-compose.prod.yml`
# o cere obligatoriu (`${IMAGE:?...}`).
#
# Asta e o dependinta circulara in runbook: `setup-db-roles.sh` ruleaza la
# pregatire, INAINTE ca CI sa fi publicat vreo imagine, dar are nevoie de `db`
# pornit. Marcajul de mai jos rupe cercul — face parsarea sa treaca fara sa
# pretinda ca exista o imagine reala.
IMAGE_PLACEHOLDER="ghcr.io/invalid/nicio-imagine:inca"
export IMAGE="${IMAGE:-$IMAGE_PLACEHOLDER}"

# Doar pentru comenzile care chiar PORNESC un container din imaginea aplicatiei
# (`docker compose run --rm api ...`). Cele care ating numai `db` merg si cu
# marcajul: containerul `db` foloseste `postgres:16-alpine`, nu imaginea noastra.
require_image() {
  if [ "${IMAGE:-}" = "$IMAGE_PLACEHOLDER" ]; then
    echo "EROARE: nu exista inca o imagine a aplicatiei." >&2
    echo "Comanda asta porneste un container din ea, deci are nevoie de una reala." >&2
    echo "IMAGE se scrie in .env de catre deploy, dupa fiecare publicare reusita." >&2
    echo "Daca nu s-a facut inca niciun deploy, ruleaza-l intai." >&2
    return 1
  fi
}
