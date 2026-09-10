#!/usr/bin/env bash
# Un dump din productie se anonimizeaza INAINTE sa ajunga in dev.
# Datele nu circula niciodata invers.
set -euo pipefail
[ $# -eq 1 ] || { echo "utilizare: $0 <dump>"; exit 1; }

psql "${DEV_DATABASE_URL}" <<'SQL'
UPDATE client SET
  bt44_name    = 'Client ' || left(id::text, 8),
  contact_email = 'test+' || left(id::text, 8) || '@example.com',
  contact_phone = NULL,
  iban          = NULL;

UPDATE document SET
  client_snapshot = jsonb_set(client_snapshot, '{name}', '"Client anonimizat"');

-- tokenurile SPV de productie NU au ce cauta in dev
TRUNCATE spv_credential;
UPDATE efactura_job SET index_incarcare = NULL, id_descarcare = NULL, xml_ubl = NULL;
SQL
echo "anonimizat. Verifica manual inainte de folosire."
