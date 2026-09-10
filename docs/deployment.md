# Deployment pe Hetzner

Serverul nu e gol: `2.28.44.45` ruleaza deja ~20 de containere (aplicatii
Laravel, imgproxy, gotenberg, Meilisearch) in spatele unui nginx propriu.
Documentul asta descrie cum se aseaza facturarea peste ce exista, fara sa
atinga restul.

## Ce am gasit pe server, si ce inseamna

| constatare | consecinta |
|---|---|
| Nu exista Traefik. 80 si 443 sunt tinute de containerul `fsi-web` (`nginx:alpine`) | `docker-compose.prod.yml` nu mai are etichete Traefik; `api` se leaga la reteaua `apps-net` si nginx da mai departe catre `facturare-api:8000` |
| Vhost-urile vin din `/opt/fullstackit/docker/nginx/apps.conf`, certificatele din `/etc/letsencrypt` (certbot pe gazda) | blocul nostru e in `deploy/nginx/facturare.conf`, cu instructiuni de instalare in el |
| 3,7 GB RAM, ~1,4 GB folositi, swap deja atins 1,1 GB | fiecare serviciu are plafon de memorie in compose; total ~2 GB |
| `/srv/facturare` nu exista | se creeaza la primul deploy, vezi mai jos |

## Pregatire, o singura data

1. **Directorul si sursele**

       mkdir -p /srv/facturare && cd /srv/facturare
       git clone <repo> .

2. **`.env`**, pornind de la `.env.example`. Ce trebuie schimbat obligatoriu:

   - `APP_ENV=prod` — porneste verificarea care refuza un rol ce ocoleste RLS
   - `ANAF_ENVIRONMENT` — ramane `test` cat timp probezi; compose-ul il forteaza
     oricum pe `prod` pentru containere, deci schimba-l acolo cand esti gata
   - `POSTGRES_PASSWORD`, si o parola separata pentru rolul aplicatiei
   - `DATABASE_URL` catre `facturare_app`, `ADMIN_DATABASE_URL` catre `facturare`
   - `TOKEN_ENCRYPTION_KEY` — genereaza cu comanda din `.env.example`.
     **Daca se pierde, toate autorizarile SPV trebuie refacute cu tokenul USB.**
   - `ANAF_CLIENT_ID` si `ANAF_CLIENT_SECRET` din profilul Oauth
   - `WEB_NETWORK=apps-net` daca reteaua proxy-ului se numeste altfel

3. **Rolul de baza de date** (dupa ce `db` a pornit macar o data):

       docker compose -f docker-compose.prod.yml up -d db
       APP_DB_PASSWORD='...' ./scripts/setup-db-roles.sh

   Scriptul verifica la final ca rolul chiar nu ocoleste RLS si iese cu eroare
   daca il ocoleste. Fara el, API-ul cu `APP_ENV=prod` refuza sa porneasca.

4. **Secretele de deploy in GitHub** → Settings → Secrets → Actions:
   `HETZNER_HOST` = `2.28.44.45`, `HETZNER_USER` = `root`,
   `HETZNER_SSH_KEY` = continutul cheii private (fisierul intreg, cu liniile
   `BEGIN`/`END`). Fara ele, CI construieste imaginea si se opreste.

5. **Artefactele de validare** in `/srv/facturare/schematron` — vezi
   `schematron/README.md` pentru cei trei pasi. Compilarea nu cere Python pe
   gazda, se face in container:

       docker compose -f docker-compose.prod.yml run --rm \
         -v /srv/facturare/schematron:/data/schematron:rw \
         api python scripts/compile-schematron.py

   Directorul e montat read-only in `api` si `worker`. Fara artefacte,
   `schematron.available()` da False si validarea pe regulile oficiale nu
   ruleaza — nu esueaza tacut, dar nici nu prinde nimic.

6. **Nginx** — vezi `deploy/nginx/facturare.conf`. Emiti certificatul, adaugi
   blocul, reincarci.

## Deploy

Merge pe branch-ul implicit. CI construieste imaginea, o publica in ghcr si
ruleaza pe server:

    docker compose -f docker-compose.prod.yml pull
    docker compose -f docker-compose.prod.yml up -d --no-deps api worker scheduler

**Migratiile NU ruleaza automat.** Comanda e explicita, face backup inainte si
cere confirmare:

    ./scripts/migrate-prod.sh

## Verificare

    curl -fsS https://facturare.fullstackit.ro/health

Raspunsul spune mediul: `{"status":"ok","app_env":"prod","anaf_environment":...}`.

Apoi autorizarea SPV, de pe masina cu tokenul USB in ea:

    https://facturare.fullstackit.ro/anaf/authorize?company_id=<uuid-ul firmei>

Se face o singura data per firma. Verifici cu `/anaf/status?company_id=...`.

## Ordinea inversa, daca ceva pica

Rulezi din `/srv/facturare`:

    docker compose -f docker-compose.prod.yml logs -n 100 api
    docker compose -f docker-compose.prod.yml ps

Doua esecuri asteptate si ce inseamna:

- **API-ul refuza sa porneasca, cu mesaj despre RLS** — rolul din `DATABASE_URL`
  ocoleste politicile. Pasul 3 n-a fost facut, sau `DATABASE_URL` a ramas pe
  rolul privilegiat. Nu ocoli verificarea trecand `APP_ENV` pe `dev`.
- **526 de la Cloudflare** — nginx nu are certificat pentru numele asta.
  Pasul 5.
