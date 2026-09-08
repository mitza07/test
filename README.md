# facturare

Program de facturare cu e-Factura pentru firme din Romania.

## Pornire rapida (dev, pe Ubuntu)

```
cp .env.example .env
# completeaza .env
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml exec api alembic upgrade head
docker compose -f docker-compose.dev.yml exec api pytest
```

## Documentatie

- `CLAUDE.md` — constrangeri si decizii de arhitectura. Se citeste primul.
- `TODO.md` — ordinea de implementare.
- `docs/efactura_spec.md` — specificatia e-Factura: API ANAF, CIUS-RO, reguli BR-RO,
  obligatii legale, puncte deschise.
- `docs/schema_facturare_v2.sql` — schema de referinta, comentata.

## Medii

| | dev | prod |
|---|---|---|
| Gazduire | Ubuntu / Hyper-V | Hetzner |
| Date | test | reale |
| SPV | `/test/` | `/prod/` |
| Compose | `docker-compose.dev.yml` | `docker-compose.prod.yml` |

Codul circula prin git si imagini Docker. Datele nu circula intre medii.
