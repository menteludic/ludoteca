#!/bin/sh
# Self-test for ludoteca-deploy.sh using a fake docker. Runs anywhere with sh
# and flock; no daemon, no server, no network.
#
#   sh deploy/gate-selftest.sh
#
# Covers the paths that a real deploy takes once: the happy path, the rollback
# when the health check reports another version, and the rejections.
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
W=$(mktemp -d "${TMPDIR:-/tmp}/gate.XXXXXX")
trap 'rm -rf "$W"' EXIT

mkdir -p "$W/bin" "$W/root/stg"
cat > "$W/bin/docker" <<'FAKE'
#!/bin/sh
echo "docker $*" >> "$GATE_CALLS"
case "$*" in
  *"exec -T app node src/cli.js health"*)
    if [ -n "${GATE_BROKEN:-}" ]; then
      printf '{"status":"ok","version":"sha-9999999"}\n'
    else
      tag=$(grep -E '^TAG=' "$GATE_ENV" | cut -d= -f2)
      printf '{"status":"ok","version":"%s"}\n' "$tag"
    fi
    ;;
esac
exit 0
FAKE
chmod +x "$W/bin/docker"

sed "s|^ROOT=/home/ubuntu/docker/ludoteca|ROOT=$W/root|" "$HERE/ludoteca-deploy.sh" > "$W/gate.sh"
chmod +x "$W/gate.sh"

export PATH="$W/bin:$PATH"
export GATE_CALLS="$W/calls.log"
export GATE_ENV="$W/root/stg/.env"

failures=0
check() {
  if [ "$2" = "$3" ]; then
    echo "  ok   $1"
  else
    echo "  FAIL $1: esperado [$3], obtenido [$2]"
    failures=$((failures + 1))
  fi
}

reset() {
  : > "$GATE_CALLS"
  printf 'ENV_NAME=stg\nTAG=sha-0000000\n' > "$GATE_ENV"
  printf 'services:\n  app:\n    image: ghcr.io/menteludic/ludoteca:${TAG}\n' > "$W/root/stg/compose.yaml"
  rm -f "$W/root/stg/.last-good" "$W/root/stg/.deploy.lock"
}

echo "deploy correcto"
reset
SSH_ORIGINAL_COMMAND="deploy stg sha-abc1234" "$W/gate.sh" > "$W/out" 2>&1 && rc=0 || rc=$?
check "sale con 0" "$rc" "0"
check "el .env lleva la etiqueta nueva" "$(grep -E '^TAG=' "$GATE_ENV")" "TAG=sha-abc1234"
check "el anterior queda como último bueno" "$(cat "$W/root/stg/.last-good")" "sha-0000000"
check "baja la etiqueta pedida" "$(head -1 "$GATE_CALLS")" "docker pull ghcr.io/menteludic/ludoteca:sha-abc1234"
check "primero migra y luego levanta" \
  "$(sed -n '3p;4p' "$GATE_CALLS" | grep -c 'migrate\|up -d')" "2"

echo "health roto: vuelve a la versión anterior"
reset
GATE_BROKEN=1 SSH_ORIGINAL_COMMAND="deploy stg sha-abc1234" "$W/gate.sh" > "$W/out" 2>&1 && rc=0 || rc=$?
unset GATE_BROKEN
check "sale con 4" "$rc" "4"
check "el .env vuelve atrás" "$(grep -E '^TAG=' "$GATE_ENV")" "TAG=sha-0000000"
check "avisa del rollback" "$(grep -c 'rolling back' "$W/out")" "1"

echo "rechazos"
reset
SSH_ORIGINAL_COMMAND="deploy stg 1234" "$W/gate.sh" > "$W/out" 2>&1 && rc=0 || rc=$?
check "etiqueta sin sha- se rechaza" "$(grep -c 'invalid tag' "$W/out")" "1"
check "no se llama a docker" "$(wc -l < "$GATE_CALLS")" "0"

SSH_ORIGINAL_COMMAND="deploy test sha-abc1234" "$W/gate.sh" > "$W/out" 2>&1 && rc=0 || rc=$?
check "entorno desconocido se rechaza" "$(grep -c 'unknown environment' "$W/out")" "1"

SSH_ORIGINAL_COMMAND="rm -rf /" "$W/gate.sh" > "$W/out" 2>&1 && rc=0 || rc=$?
check "comando ajeno se rechaza" "$(grep -c 'denied' "$W/out")" "1"

echo
if [ "$failures" -eq 0 ]; then
  echo "gate: todas las comprobaciones en verde"
else
  echo "gate: $failures comprobaciones en rojo"
  exit 1
fi