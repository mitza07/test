#!/usr/bin/env bash
# Migratii pe productie. Comanda EXPLICITA, niciodata la pornirea containerului.
# Backup inainte, verificare dupa.
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=scripts/_env.sh
. "$(dirname "$0")/_env.sh"
require_env POSTGRES_USER POSTGRES_DB
require_image

STAMP=$(date +%Y%m%d-%H%M%S)
echo "1/4 backup..."
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${POSTGRES_USER}" -Fc "${POSTGRES_DB}" > "dumps/pre-migrate-${STAMP}.dump"

echo "2/4 revizia curenta:"
docker compose -f docker-compose.prod.yml run --rm api alembic current

read -rp "3/4 aplic migratiile? (scrie DA) " confirm
[ "$confirm" = "DA" ] || { echo "anulat"; exit 1; }

docker compose -f docker-compose.prod.yml run --rm api alembic upgrade head

echo "4/4 revizia noua:"
docker compose -f docker-compose.prod.yml run --rm api alembic current
