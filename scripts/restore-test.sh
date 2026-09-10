#!/usr/bin/env bash
# Proba de restaurare. Ruleaza lunar.
#
# Un backup neincercat nu demonstreaza recuperabilitatea: demonstreaza doar ca
# pg_dump a terminat fara eroare. Scriptul asta restaureaza efectiv ultimul dump
# intr-o baza temporara si verifica structura si continutul, apoi o sterge.
#
# NU atinge baza de productie. Creeaza si distruge o baza separata pe acelasi
# server. Daca vreodata modifici scriptul, verifica intai numele bazei tinta.
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=scripts/_env.sh
. "$(dirname "$0")/_env.sh"
require_env POSTGRES_USER POSTGRES_DB

COMPOSE="docker compose -f docker-compose.prod.yml"
STAMP=$(date +%Y%m%d-%H%M%S)
TARGET_DB="restore_test_${STAMP}"

DUMP=${1:-$(ls -1t dumps/db-*.dump 2>/dev/null | head -1 || true)}
[ -n "${DUMP}" ] || { echo "Nu am gasit niciun dump in dumps/. Ruleaza intai backup.sh."; exit 1; }
[ -f "${DUMP}" ] || { echo "Dumpul ${DUMP} nu exista."; exit 1; }

echo "1/5 dump: ${DUMP} ($(du -h "${DUMP}" | cut -f1), din $(date -r "${DUMP}" '+%d.%m.%Y %H:%M'))"

cleanup() {
  echo "curat baza temporara ${TARGET_DB}..."
  $COMPOSE exec -T db dropdb -U "${POSTGRES_USER}" --if-exists "${TARGET_DB}" || true
}
trap cleanup EXIT

echo "2/5 creez baza temporara ${TARGET_DB}..."
$COMPOSE exec -T db createdb -U "${POSTGRES_USER}" "${TARGET_DB}"

echo "3/5 restaurez..."
# --no-owner: rolurile din productie pot lipsi; nu e relevant pentru proba.
$COMPOSE exec -T db pg_restore -U "${POSTGRES_USER}" -d "${TARGET_DB}" --no-owner < "${DUMP}"

echo "4/5 verific..."
# Ce dovedeste ca restaurarea e utila, nu doar ca a rulat: exista documente,
# totalurile nu sunt nule, si politicile RLS au supravietuit. O baza restaurata
# fara RLS ar arata corect si ar scurge date intre firme la prima interogare.
$COMPOSE exec -T db psql -U "${POSTGRES_USER}" -d "${TARGET_DB}" -v ON_ERROR_STOP=1 <<'SQL'
\set QUIET on
DO $$
DECLARE
  documents  bigint;
  companies  bigint;
  unprotected text;
BEGIN
  SELECT count(*) INTO documents FROM document;
  SELECT count(*) INTO companies FROM company;
  IF companies = 0 THEN
    RAISE EXCEPTION 'Baza restaurata nu contine nicio firma.';
  END IF;

  SELECT string_agg(c.relname, ', ') INTO unprotected
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN ('document', 'client', 'spv_credential', 'doc_series')
    AND NOT c.relrowsecurity;
  IF unprotected IS NOT NULL THEN
    RAISE EXCEPTION 'Row Level Security lipseste dupa restaurare pe: %', unprotected;
  END IF;

  RAISE NOTICE 'firme: %, documente: %, RLS: activ', companies, documents;
END $$;
SQL

echo "5/5 restaurare reusita din ${DUMP}."
# Trap-ul de EXIT sterge baza temporara.
