#!/bin/sh
# preflight.sh — read-only checks for the server set-up.
# It creates nothing, deletes nothing and never prints a secret.
#
#   sh preflight.sh [base path]      # defaults to /home/ubuntu/docker/ludoteca
#
# Exits 0 when everything is in order and the number of failures otherwise.
set -u

ROOT=${1:-/home/ubuntu/docker/ludoteca}
fails=0
ok()   { printf 'OK    %s\n' "$*"; }
bad()  { printf 'FAIL  %s\n' "$*"; fails=$((fails + 1)); }
info() { printf 'INFO  %s\n' "$*"; }

env_value() { grep -E "^$2=" "$1" 2>/dev/null | head -1 | cut -d= -f2-; }

echo "== Docker"
if docker version >/dev/null 2>&1; then ok "docker answers"; else bad "docker does not answer (docker group?)"; fi
if docker compose version >/dev/null 2>&1; then ok "compose v2: $(docker compose version --short 2>/dev/null)"; else bad "docker compose v2 not available"; fi

echo
echo "== Shared network"
if docker network inspect proxy >/dev/null 2>&1; then
  members=$(docker network inspect proxy -f '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null)
  ok "proxy network exists: $members"
  case "$members" in
    *proxy*|*nginx*) ok "the proxy is attached to proxy" ;;
    *) bad "no container named like proxy or nginx on the proxy network; the service name will not resolve" ;;
  esac
else
  bad "the proxy network does not exist (docker network create proxy)"
fi

echo
for env in prod stg; do
  echo "== $env ($ROOT/$env)"
  base="$ROOT/$env"
  [ -d "$base" ] || { bad "$base does not exist"; continue; }

  if [ -f "$base/.env" ]; then
    perms=$(stat -c '%a' "$base/.env")
    [ "$perms" = "600" ] && ok ".env exists (600)" || bad ".env has mode $perms, expected 600"
    for k in ENV_NAME TAG BASE_URL TRUST_PROXY_HOPS DATABASE_PATH IMAGES_DIR DNI_KEY SMTP_FROM; do
      if [ -n "$(env_value "$base/.env" "$k")" ]; then :; else bad "$k missing from .env"; fi
    done
    hops=$(env_value "$base/.env" TRUST_PROXY_HOPS)
    ok "TRUST_PROXY_HOPS=$hops (1 while Cloudflare is DNS only)"
    [ "$(env_value "$base/.env" TAG)" = "" ] && bad "TAG is empty"
    if grep -q '^[[:space:]]*ports:' "$base/compose.yaml" 2>/dev/null; then
      bad "the compose file publishes ports; the app lives only on the proxy network (ADR-019)"
    fi
  else
    bad ".env is missing"
  fi

  if [ -f "$base/compose.yaml" ]; then
    if (cd "$base" && docker compose config -q 2>/dev/null); then
      ok "compose.yaml is valid"
    else
      bad "compose.yaml does not validate (cd $base && docker compose config)"
    fi
  else
    bad "compose.yaml is missing (copy deploy/compose.yaml from the repository)"
  fi

  [ -d "$base/data/images" ] && ok "data/images exists" || bad "data/images is missing"
  [ -d "$base/data/backups" ] && ok "data/backups exists" || bad "data/backups is missing (the backup writes there)"
  owner=$(stat -c '%u:%g' "$base/data" 2>/dev/null)
  case "$owner" in
    10001:10001) ok "data belongs to 10001:10001" ;;
    *) bad "data belongs to $owner; it should be 10001:10001 (readonly database)" ;;
  esac
  if sudo -n true 2>/dev/null; then
    if sudo -n -u '#10001' sh -c "touch '$base/data/.probe' && rm '$base/data/.probe'" 2>/dev/null; then
      ok "UID 10001 can write to data"
    else
      bad "UID 10001 cannot write to data"
    fi
  else
    info "passwordless sudo unavailable: write access as UID 10001 not checked"
  fi
done

echo
echo "== Encryption keys"
if [ -f "$ROOT/prod/.env" ] && [ -f "$ROOT/stg/.env" ]; then
  a=$(env_value "$ROOT/prod/.env" DNI_KEY | sha256sum | cut -d' ' -f1)
  b=$(env_value "$ROOT/stg/.env" DNI_KEY | sha256sum | cut -d' ' -f1)
  [ -n "$a" ] && [ "$a" != "$b" ] && ok "DNI_KEY differs between environments" || bad "DNI_KEY is empty or shared between prod and stg"
fi

echo
echo "== Deploy wrapper"
auth='/home/ubuntu/.ssh/authorized_keys'
if [ -f "$auth" ]; then
  line=$(grep -m1 'command=' "$auth")
  if [ -n "$line" ]; then
    script=$(printf '%s' "$line" | sed -n 's/.*command="\([^"]*\)".*/\1/p')
    ok "authorized_keys runs command=$script"
    if [ -f "$script" ]; then
      ok "the wrapper exists"
      if sh -n "$script" 2>/dev/null; then ok "the wrapper passes sh -n"; else bad "the wrapper has syntax errors"; fi
      owner=$(stat -c '%U' "$script")
      [ "$owner" = "root" ] && ok "the wrapper belongs to root" || info "the wrapper belongs to $owner (root:root 0755 is better)"
    else
      bad "authorized_keys points to $script, which does not exist"
    fi
  else
    bad "authorized_keys has no entry with command="
  fi
else
  bad "$auth does not exist"
fi

echo
echo "== Image on GHCR"
code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "https://ghcr.io/v2/menteludic/ludoteca/tags/list" 2>/dev/null)
case "$code" in
  200) ok "package is public and has tags" ;;
  401) info "package is private or not published yet (401); if private, the server needs docker login" ;;
  *) info "unexpected answer from GHCR: $code" ;;
esac

echo
echo "== Host"
df -h / | awk 'NR==2 {print "      disk: "$4" free of "$2}'
info "server time: $(date -u '+%F %T %Z')"
info "no ports are published, so there is nothing to check in the firewall"

echo
echo "failures: $fails"
[ "$fails" -eq 0 ]