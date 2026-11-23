#!/bin/sh
# Deploy gate for ludoteca. Installed on the VPS as root:root 0755 at
# /home/ubuntu/docker/ludoteca/bin/ludoteca-deploy, and the only command the
# GitHub Actions key is allowed to run.
#
# Accepts: deploy <prod|stg> sha-<7-40 hex> | rollback <env> | status <env>
set -eu

ROOT=/home/ubuntu/docker/ludoteca
IMAGE=ghcr.io/menteludic/ludoteca

case "${SSH_ORIGINAL_COMMAND:-}" in
  "deploy "*)   set -- ${SSH_ORIGINAL_COMMAND#deploy };   ENV=$1; TAG=${2:-} ;;
  "rollback "*) set -- ${SSH_ORIGINAL_COMMAND#rollback }; ENV=$1; TAG="" ;;
  "status "*)   set -- ${SSH_ORIGINAL_COMMAND#status };   ENV=$1; TAG="" ;;
  *) echo "denied" >&2; exit 1 ;;
esac

case "$ENV" in prod|stg) ;; *) echo "unknown environment" >&2; exit 2 ;; esac

BASE="$ROOT/$ENV"
[ -f "$BASE/.env" ] || { echo "missing $BASE/.env" >&2; exit 2; }

COMPOSE="docker compose -f $BASE/compose.yaml --env-file $BASE/.env"

# Health is asked inside the container: no port is published on the host.
health() { $COMPOSE exec -T app node src/cli.js health 2>/dev/null; }

# The image is pulled first: it is the step that fails when the GHCR package is
# private, and failing here leaves the environment untouched.
pull_image() {
  if ! docker pull "$IMAGE:$1" >/dev/null; then
    {
      echo "no se pudo descargar $IMAGE:$1"
      echo "causa probable: el paquete GHCR es privado o el host no tiene credenciales"
      echo "arreglo: pon el paquete en público, o docker login ghcr.io con un token read:packages"
    } >&2
    return 1
  fi
}

case "${SSH_ORIGINAL_COMMAND:-}" in
  status*)
    $COMPOSE ps
    health
    exit 0
    ;;
  rollback*)
    TAG=$(cat "$BASE/.last-good")
    ;;
  *)
    printf '%s' "$TAG" | grep -Eq '^sha-[0-9a-f]{7,40}$' || { echo "invalid tag" >&2; exit 2; }
    ;;
esac

exec 9>"$BASE/.deploy.lock"
flock -n 9 || { echo "another deploy is running in $ENV" >&2; exit 3; }

PREVIOUS=$(grep -E '^TAG=' "$BASE/.env" | cut -d= -f2)

# 1. Image, then a backup of the data the running version produced
pull_image "$TAG" || exit 5
$COMPOSE run --rm -T app backup --to "/data/backups/pre-$TAG.db" --keep 5

# 2. Move the tag, migrate, start
sed -i "s/^TAG=.*/TAG=$TAG/" "$BASE/.env"
$COMPOSE run --rm -T app migrate
$COMPOSE up -d --remove-orphans

# 3. Verify the version actually running
ok=0
i=0
while [ $i -lt 30 ]; do
  if health | grep -q "\"version\":\"$TAG\""; then ok=1; break; fi
  i=$((i+1)); sleep 2
done

if [ "$ok" -ne 1 ]; then
  echo "healthcheck failed in $ENV, rolling back to $PREVIOUS" >&2
  pull_image "$PREVIOUS" || exit 5
  sed -i "s/^TAG=.*/TAG=$PREVIOUS/" "$BASE/.env"
  $COMPOSE up -d --remove-orphans
  exit 4
fi

echo "$PREVIOUS" > "$BASE/.last-good"
echo "deployed $ENV $TAG (previous $PREVIOUS)"