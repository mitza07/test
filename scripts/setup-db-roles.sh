#!/usr/bin/env bash
# Rolul neprivilegiat cu care se conecteaza aplicatia.
#
# DE CE EXISTA: Postgres ignora complet politicile RLS pentru rolurile SUPERUSER
# sau cu BYPASSRLS. Imaginea oficiala `postgres` creeaza POSTGRES_USER ca
# SUPERUSER, iar daca aplicatia se conecteaza cu el, izolarea intre firme e
# inactiva — fara niciun semn, cu toate politicile la locul lor.
#
# `app/db.py` refuza pornirea in productie exact din motivul asta. Scriptul de
# fata e ce face refuzul sa dispara: creeaza un rol obisnuit, ii da drepturi DE
# DATE si niciunul de schema, si verifica la final ca nu ocoleste RLS.
#
# Doua roluri inseamna doua URL-uri:
#   DATABASE_URL        -> rolul aplicatiei; API, workeri, scheduler
#   ADMIN_DATABASE_URL  -> proprietarul schemei; DOAR alembic
#
# Idempotent: se poate rula de cate ori vrei. Rularea a doua oara doar
# actualizeaza parola si reaplica drepturile.
#
# Utilizare, pe server, din /srv/facturare:
#   APP_DB_PASSWORD='...' ./scripts/setup-db-roles.sh
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=${COMPOSE:-docker-compose.prod.yml}
APP_DB_USER=${APP_DB_USER:-facturare_app}

# shellcheck source=scripts/_env.sh
. "$(dirname "$0")/_env.sh"
require_env POSTGRES_USER POSTGRES_DB
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD trebuie dat: APP_DB_PASSWORD='...' $0}"

psql() {
  docker compose -f "$COMPOSE" exec -T db \
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

echo "1/4 rolul $APP_DB_USER..."
# Parola trece prin -v si `:'var'`, nu prin interpolare de shell in SQL:
# altfel un apostrof in parola ar rupe comanda sau ar deveni injectie.
psql -v user="$APP_DB_USER" -v pass="$APP_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB
                NOCREATEROLE NOBYPASSRLS', :'user', :'pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'user') \gexec

SELECT format('ALTER ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB
                NOCREATEROLE NOBYPASSRLS', :'user', :'pass') \gexec
SQL

echo "2/4 drepturi pe datele existente..."
psql -v user="$APP_DB_USER" -v db="$POSTGRES_DB" <<'SQL'
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'db', :'user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'user') \gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES
                IN SCHEMA public TO %I', :'user') \gexec
SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I',
              :'user') \gexec
SQL

echo "3/4 drepturi pe tabelele viitoare..."
# Fara asta, prima migratie care adauga un tabel il lasa invizibil pentru
# aplicatie, iar eroarea apare abia la primul query pe el, in productie.
psql -v user="$APP_DB_USER" -v owner="$POSTGRES_USER" <<'SQL'
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
                GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
              :'owner', :'user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
                GRANT USAGE, SELECT ON SEQUENCES TO %I', :'owner', :'user') \gexec
SQL

echo "4/4 verificare: rolul NU are voie sa ocoleasca RLS..."
bypass=$(psql -tAX -v user="$APP_DB_USER" -c \
  "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = :'user'")
if [ "$bypass" != "f" ]; then
  echo "EROARE: $APP_DB_USER ocoleste RLS. Izolarea intre firme ar fi inactiva." >&2
  exit 1
fi

cat <<EOF

Gata. Pune in .env:

  DATABASE_URL=postgresql+psycopg://$APP_DB_USER:<parola>@db:5432/$POSTGRES_DB
  ADMIN_DATABASE_URL=postgresql+psycopg://$POSTGRES_USER:<parola-postgres>@db:5432/$POSTGRES_DB

Primul e folosit de api, worker si scheduler. Al doilea DOAR de alembic, prin
scripts/migrate-prod.sh. Daca ADMIN_DATABASE_URL lipseste, alembic cade pe
DATABASE_URL — bun in dev, insuficient in productie: rolul aplicatiei nu are
drepturi de schema, deci migratia va esua explicit, nu tacut.
EOF
