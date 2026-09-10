#!/usr/bin/env bash
# Ce e pe serverul de productie. Read-only, fara efecte.
#
# Se ruleaza pe SERVER, trimis prin stdin de `.github/workflows/server-recon.yml`.
# Se poate rula si de mana: ssh root@server 'bash -s' < scripts/recon-prod.sh
#
# Raspunde la intrebarile de care depinde `docs/deployment.md`, si mai ales la
# una singura: DE UNDE VIN CERTIFICATELE. Nginx-ul care tine 80 si 443 nu e al
# nostru, si nu stim daca foloseste Let's Encrypt cu certbot, certificate Origin
# de la Cloudflare, sau altceva. Pasul de certificat din bootstrap arata complet
# diferit in fiecare caz.
#
# NU tipareste nimic secret: fara variabile de mediu din containere, fara chei
# private, fara continutul altor `.env`. Doar nume, cai si stare. Iesirea ajunge
# in logul unui workflow, care e vizibil oricui are acces la repo.

set -u

line() { printf '\n=== %s ===\n' "$1"; }

line "sistem"
# shellcheck disable=SC1091
[ -r /etc/os-release ] && . /etc/os-release && echo "$PRETTY_NAME"
uname -r
uptime

line "resurse"
free -h
echo
df -h / /var/lib/docker 2>/dev/null | sort -u

line "docker"
docker --version
docker compose version 2>/dev/null || echo "compose v2 lipseste"

line "containere"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'

line "retele"
docker network ls

line "cine tine 80 si 443"
ss -lntp 2>/dev/null | grep -E ':(80|443) ' || echo "nimic"

line "/srv si /opt"
ls -la /srv 2>/dev/null || echo "/srv nu exista"
ls -la /opt/fullstackit/docker 2>/dev/null || echo "/opt/fullstackit/docker nu exista"

line "montarile reverse proxy-ului"
for c in $(docker ps --format '{{.Names}}'); do
  img=$(docker inspect -f '{{.Config.Image}}' "$c")
  case "$img" in
    *nginx*|*traefik*|*caddy*)
      echo "--- $c ($img)"
      docker inspect -f '{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Mode}}){{"\n"}}{{end}}' "$c"
      ;;
  esac
done

line "fisiere de configurare nginx"
for d in /opt/fullstackit/docker/nginx /etc/nginx/conf.d /opt/nginx/conf.d; do
  [ -d "$d" ] && { echo "--- $d"; ls -la "$d"; }
done

line "de unde vin certificatele (doar cai, nu chei)"
grep -rhoE 'ssl_certificate(_key)?[[:space:]]+[^;]+;' \
  /opt/fullstackit/docker/nginx /etc/nginx 2>/dev/null | sort -u \
  || echo "niciun ssl_certificate gasit"

echo "--- server_name declarate"
grep -rhoE 'server_name[[:space:]]+[^;]+;' \
  /opt/fullstackit/docker/nginx /etc/nginx 2>/dev/null | sort -u

echo "--- /etc/letsencrypt/live"
ls -la /etc/letsencrypt/live 2>/dev/null || echo "nu exista pe gazda"

echo "--- certbot"
command -v certbot || echo "certbot nu e instalat pe gazda"
docker ps -a --format '{{.Names}} {{.Image}}' | grep -iE 'certbot|acme' \
  || echo "niciun container certbot"

line "serverul poate ajunge unde trebuie"
# mfinante: artefactele de validare. oasis: XSD-ul UBL. ghcr: imaginea noastra.
for u in https://mfinante.gov.ro/web/efactura/informatii-tehnice \
         https://docs.oasis-open.org/ubl/os-UBL-2.1/UBL-2.1.zip \
         https://ghcr.io/v2/; do
  host=$(echo "$u" | cut -d/ -f3)
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$u" 2>/dev/null || echo "esec")
  printf '%-24s -> %s\n' "$host" "$code"
done

line "gata"
