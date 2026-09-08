#!/usr/bin/env bash
# Backup zilnic + off-site. Un backup neincercat nu demonstreaza recuperabilitatea:
# scripts/restore-test.sh ruleaza lunar si restaureaza efectiv intr-o baza temporara.
set -euo pipefail
cd "$(dirname "$0")/.."

STAMP=$(date +%Y%m%d)
mkdir -p dumps

docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${POSTGRES_USER}" -Fc "${POSTGRES_DB}" > "dumps/db-${STAMP}.dump"

# storage contine XML-urile semnate de ANAF — ORIGINALUL LEGAL, nu PDF-ul.
docker run --rm -v facturare_storage:/data -v "$PWD/dumps:/out" alpine \
  tar czf "/out/storage-${STAMP}.tar.gz" -C /data .

# off-site (Hetzner Storage Box sau alt provider)
# rclone copy dumps/ remote:facturare-backup/ --max-age 25h

find dumps -name '*.dump' -mtime +30 -delete
find dumps -name '*.tar.gz' -mtime +30 -delete
