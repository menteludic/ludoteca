#!/bin/sh
# preflight.sh — comprobaciones de la puesta en marcha del servidor.
# Solo lectura: no crea, no borra y no imprime secretos.
#
#   sh preflight.sh [ruta-base]      # por defecto /home/ubuntu/docker/ludoteca
#
# Devuelve 0 si todo está en orden y el número de fallos en caso contrario.
set -u

ROOT=${1:-/home/ubuntu/docker/ludoteca}
fails=0
ok()   { printf 'OK    %s\n' "$*"; }
bad()  { printf 'FALTA %s\n' "$*"; fails=$((fails + 1)); }
info() { printf 'INFO  %s\n' "$*"; }
note() { printf '      %s\n' "$*"; }

env_value() { grep -E "^$2=" "$1" 2>/dev/null | head -1 | cut -d= -f2-; }

echo "== Docker"
if docker version >/dev/null 2>&1; then ok "docker responde"; else bad "docker no responde (¿grupo docker?)"; fi
if docker compose version >/dev/null 2>&1; then ok "compose v2: $(docker compose version --short 2>/dev/null)"; else bad "docker compose v2 no disponible"; fi

echo
echo "== Red compartida"
if docker network inspect proxy >/dev/null 2>&1; then
  members=$(docker network inspect proxy -f '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null)
  ok "red proxy existe: $members"
  case "$members" in
    *proxy*|*nginx*) ok "el proxy está conectado a proxy" ;;
    *) bad "ningún contenedor con «proxy» o «nginx» en la red proxy; el nombre de servicio no resolverá" ;;
  esac
else
  bad "la red proxy no existe (docker network create proxy)"
fi

echo
for env in prod stg; do
  echo "== $env ($ROOT/$env)"
  base="$ROOT/$env"
  [ -d "$base" ] || { bad "$base no existe"; continue; }

  if [ -f "$base/.env" ]; then
    perms=$(stat -c '%a' "$base/.env")
    [ "$perms" = "600" ] && ok ".env existe (600)" || bad ".env con permisos $perms, debería ser 600"
    for k in ENV_NAME TAG BASE_URL TRUST_PROXY_HOPS DATABASE_PATH IMAGES_DIR DNI_KEY SMTP_FROM; do
      if [ -n "$(env_value "$base/.env" "$k")" ]; then :; else bad "falta $k en .env"; fi
    done
    hops=$(env_value "$base/.env" TRUST_PROXY_HOPS)
    ok "TRUST_PROXY_HOPS=$hops (1 si Cloudflare es solo DNS)"
    [ "$(env_value "$base/.env" TAG)" = "" ] && bad "TAG vacío"
    if grep -q '^[[:space:]]*ports:' "$base/compose.yaml" 2>/dev/null; then
      bad "el compose publica puertos; la app debe vivir solo en la red proxy (ADR-019)"
    fi
  else
    bad "falta .env"
  fi

  if [ -f "$base/compose.yaml" ]; then
    if (cd "$base" && docker compose config -q 2>/dev/null); then
      ok "compose.yaml válido"
    else
      bad "compose.yaml no valida (cd $base && docker compose config)"
    fi
  else
    bad "falta compose.yaml (copiar deploy/compose.yaml del repo)"
  fi

  [ -d "$base/data/images" ] && ok "data/images existe" || bad "falta data/images"
  [ -d "$base/data/backups" ] && ok "data/backups existe" || bad "falta data/backups (el backup escribe ahí)"
  owner=$(stat -c '%u:%g' "$base/data" 2>/dev/null)
  case "$owner" in
    10001:10001) ok "data pertenece a 10001:10001" ;;
    *) bad "data pertenece a $owner; debería ser 10001:10001 (readonly database)" ;;
  esac
  if sudo -n true 2>/dev/null; then
    if sudo -n -u '#10001' sh -c "touch '$base/data/.probe' && rm '$base/data/.probe'" 2>/dev/null; then
      ok "UID 10001 escribe en data"
    else
      bad "UID 10001 no puede escribir en data"
    fi
  else
    info "sin sudo sin contraseña: no se comprueba la escritura como UID 10001"
  fi
done

echo
echo "== Claves de cifrado"
if [ -f "$ROOT/prod/.env" ] && [ -f "$ROOT/stg/.env" ]; then
  a=$(env_value "$ROOT/prod/.env" DNI_KEY | sha256sum | cut -d' ' -f1)
  b=$(env_value "$ROOT/stg/.env" DNI_KEY | sha256sum | cut -d' ' -f1)
  [ -n "$a" ] && [ "$a" != "$b" ] && ok "DNI_KEY distinta en cada entorno" || bad "DNI_KEY vacía o compartida entre prod y stg"
fi

echo
echo "== Wrapper de despliegue"
awk='/home/ubuntu/.ssh/authorized_keys'
if [ -f "$awk" ]; then
  line=$(grep -m1 'command=' "$awk")
  if [ -n "$line" ]; then
    script=$(printf '%s' "$line" | sed -n 's/.*command="\([^"]*\)".*/\1/p')
    ok "authorized_keys con command=$script"
    if [ -f "$script" ]; then
      ok "el wrapper existe"
      if sh -n "$script" 2>/dev/null; then ok "el wrapper pasa sh -n"; else bad "el wrapper tiene errores de sintaxis"; fi
      owner=$(stat -c '%U' "$script")
      [ "$owner" = "root" ] && ok "el wrapper es de root" || info "el wrapper es de $owner (mejor root:root 0755)"
    else
      bad "authorized_keys apunta a $script, que no existe"
    fi
  else
    bad "authorized_keys no tiene ninguna entrada con command="
  fi
else
  bad "no existe $awk"
fi

echo
echo "== Imagen en GHCR"
code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "https://ghcr.io/v2/menteludic/ludoteca/tags/list" 2>/dev/null)
case "$code" in
  200) ok "paquete público y con etiquetas" ;;
  401) info "paquete privado o todavía sin publicar (401). Si es privado, el servidor necesita docker login" ;;
  *) info "respuesta inesperada de GHCR: $code" ;;
esac

echo
echo "== Host"
df -h / | awk 'NR==2 {print "      disco: "$4" libres de "$2}'
info "hora del servidor: $(date -u '+%F %T %Z')"
if command -v ufw >/dev/null 2>&1; then
  if sudo -n ufw status 2>/dev/null | grep -q 'Status: active'; then
    sudo -n ufw status | grep -E ':4000 |:4001 ' || info "4000/4001 no aparecen en ufw (se publican solo en 127.0.0.1)"
  else
    info "ufw inactivo o sin sudo: no se comprueba"
  fi
fi

echo
echo "fallos: $fails"
[ "$fails" -eq 0 ]