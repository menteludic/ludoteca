# Puesta en marcha en el servidor

Documento de trabajo para el sysop. Recoge lo que hay que preparar **una sola vez** en el VPS y lo que ocurre en cada despliegue. La aplicación no termina TLS ni habla con Cloudflare: escucha en un puerto interno y el proxy de Nginx hace de puerta.

> Terminología: en este proyecto **«el proxy»** es Nginx Proxy Manager. `npm` (en minúsculas y en código) es el gestor de paquetes de Node y no tiene nada que ver.

## 0. Topología

```
Navegador
   │  https://ludoteca.floyd303.com
   ▼
Cloudflare (solo DNS, nube gris)
   │  :443
   ▼
Nginx Proxy Manager  ── certificado Let's Encrypt, HSTS, límite de subida
   │  http://ludoteca-prod-app:4000   (red Docker «proxy»)
   ▼
Contenedor app (Node 24 LTS, UID 10001)  ── /home/ubuntu/docker/ludoteca/prod/data:/data
```

Dos entornos en el mismo VPS, separados por carpeta, puerto y volumen:

```
/home/ubuntu/docker/ludoteca/
├── prod/   .env  compose.yaml  data/{ludoteca.db,images,backups}   APP_PORT=4000
└── stg/    .env  compose.yaml  data/{ludoteca.db,images,backups}   APP_PORT=4001
```

Consecuencias que afectan al código:

- La app escucha HTTP en `4000` dentro del contenedor. En el host se publica **solo en `127.0.0.1`**: el proxy la alcanza por la red Docker y el script de despliegue hace el healthcheck sin abrir nada a internet.
- Cloudflare queda en **solo DNS**, como las demás aplicaciones del servidor. Hay un único proxy delante: `TRUST_PROXY_HOPS=1`. Si algún día se activa el proxy de Cloudflare, pasa a `2`.
- El proxy ya emite HSTS (verificado por fuera: `max-age=63072000; preload`). La app emite CSP, `Referrer-Policy`, `nosniff` y `frame-ancestors`; **no** repite HSTS ni nada que ponga el proxy. Dos CSP se suman y rompen la interfaz.
- El límite de subida y los timeouts largos se configuran en el proxy, no en la app.
- `/health` es la comprobación del despliegue y la de la monitorización externa, e incluye el SHA desplegado.

## 1. Una sola vez: el host

### 1.1 Directorios y permisos

Se usa el usuario `ubuntu` que ya existe (está en el grupo `docker`), sin crear uno nuevo. Los datos pertenecen al UID del usuario de la imagen (`10001`):

```sh
# el CLI de la app escribe en data/backups (en plural)
mkdir -p /home/ubuntu/docker/ludoteca/{prod,stg}/data/{images,backups}
sudo chown -R 10001:10001 /home/ubuntu/docker/ludoteca/prod/data
sudo chown -R 10001:10001 /home/ubuntu/docker/ludoteca/stg/data
sudo chmod 750 /home/ubuntu/docker/ludoteca/prod/data /home/ubuntu/docker/ludoteca/stg/data
```

El contenedor entra por `/home/ubuntu`, así que ese directorio tiene que ser atravesable: `stat -c %a /home/ubuntu` debe dar `755` (valor por defecto en Ubuntu; si alguien lo puso a `750`, el contenedor no llega a sus datos y SQLite responde `readonly database`). Comprobación directa:

```sh
sudo -u '#10001' sh -c 'touch /home/ubuntu/docker/ludoteca/prod/data/.probe && rm /home/ubuntu/docker/ludoteca/prod/data/.probe' && echo "UID 10001 escribe"
```

### 1.2 Red compartida con el proxy

El proxy resuelve el contenedor por su nombre de servicio, así que los dos tienen que estar en la misma red Docker:

```sh
docker network create proxy 2>/dev/null || true
docker inspect nginx-proxy-manager -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

Si `proxy` no aparece en la segunda orden, conecta el contenedor del proxy:

```sh
docker network connect proxy nginx-proxy-manager
```

En el compose, `container_name: ludoteca-prod-app` (y `ludoteca-stg-app`) con la red `proxy` como externa. El proxy apunta a `ludoteca-prod-app:4000`.

### 1.3 Clave SSH de despliegue

Clave dedicada, sin passphrase, solo para GitHub Actions:

```sh
ssh-keygen -t ed25519 -C "github-actions@ludoteca" -N "" -f ./ludoteca_deploy
```

La privada va a GitHub Secrets como `SSH_KEY`. La pública, en `/home/ubuntu/.ssh/authorized_keys`, **con el wrapper delante**:

```
command="/home/ubuntu/docker/ludoteca/bin/ludoteca-deploy",no-pty,no-agent-forwarding,no-X11-forwarding,no-port-forwarding ssh-ed25519 AAAA... github-actions@ludoteca
```

Con `command=`, la clave no abre shell: solo invoca el wrapper, y el wrapper solo acepta `deploy <entorno> <tag>`, `rollback <entorno>` y `status <entorno>`.

### 1.4 El wrapper de despliegue

`/home/ubuntu/docker/ludoteca/bin/ludoteca-deploy`, propiedad de `root:root`, modo `0755` (si es de `ubuntu` funciona igual, pero cualquiera con esa cuenta puede reescribirlo). Es infraestructura, no código: no se toca en cada despliegue. La ruta de `authorized_keys` y la del fichero tienen que coincidir exactamente.

```sh
#!/bin/sh
# Deploy gate for ludoteca. Accepts: deploy <prod|stg> <tag> | rollback <env> | status <env>
set -eu

ROOT=/home/ubuntu/docker/ludoteca

case "${SSH_ORIGINAL_COMMAND:-}" in
  "deploy "*)   set -- ${SSH_ORIGINAL_COMMAND#deploy };   ENV=$1; TAG=${2:-} ;;
  "rollback "*) set -- ${SSH_ORIGINAL_COMMAND#rollback }; ENV=$1; TAG="" ;;
  "status "*)   set -- ${SSH_ORIGINAL_COMMAND#status };   ENV=$1; TAG="" ;;
  *) echo "denied" >&2; exit 1 ;;
esac

case "$ENV" in prod|stg) ;; *) echo "unknown environment" >&2; exit 2 ;; esac

BASE="$ROOT/$ENV"
[ -f "$BASE/.env" ] || { echo "missing $BASE/.env" >&2; exit 2; }

APP_PORT=$(grep -E '^APP_PORT=' "$BASE/.env" | cut -d= -f2)
COMPOSE="docker compose -f $BASE/compose.yaml --env-file $BASE/.env"
HEALTH="http://127.0.0.1:${APP_PORT:-4000}/health"

case "${SSH_ORIGINAL_COMMAND:-}" in
  status*)
    $COMPOSE ps
    curl -fsS "$HEALTH"
    exit 0
    ;;
  rollback*)
    TAG=$(cat "$BASE/.last-good")
    ;;
  *)
    printf '%s' "$TAG" | grep -Eq '^[0-9a-f]{7,40}$' || { echo "invalid tag" >&2; exit 2; }
    ;;
esac

exec 9>"$BASE/.deploy.lock"
flock -n 9 || { echo "another deploy is running in $ENV" >&2; exit 3; }

PREVIOUS=$(grep -E '^TAG=' "$BASE/.env" | cut -d= -f2)

# 1. Backup before touching anything (keep the last five)
$COMPOSE run --rm -T app backup --to "/data/backups/pre-$TAG.db" --keep 5

# 2. Move the tag, pull, migrate, start
sed -i "s/^TAG=.*/TAG=$TAG/" "$BASE/.env"
$COMPOSE pull app
$COMPOSE run --rm -T app migrate
$COMPOSE up -d --remove-orphans

# 3. Verify the version actually running
ok=0
i=0
while [ $i -lt 30 ]; do
  if curl -fsS "$HEALTH" | grep -q "\"version\":\"$TAG\""; then ok=1; break; fi
  i=$((i+1)); sleep 2
done

if [ "$ok" -ne 1 ]; then
  echo "healthcheck failed in $ENV, rolling back to $PREVIOUS" >&2
  sed -i "s/^TAG=.*/TAG=$PREVIOUS/" "$BASE/.env"
  $COMPOSE pull app
  $COMPOSE up -d --remove-orphans
  exit 4
fi

echo "$PREVIOUS" > "$BASE/.last-good"
echo "deployed $ENV $TAG (previous $PREVIOUS)"
```

Tres decisiones que conviene entender: la migración corre **antes** de arrancar y como paso aparte (nunca en el `entrypoint`); el healthcheck exige que `/health` declare el tag desplegado, no un simple 200; y el `flock` impide que dos despliegues pisen el mismo entorno.

El `compose.yaml` de cada entorno se instala a mano la primera vez y solo se toca cuando cambia el fichero del repositorio. Un despliegue normal solo mueve la etiqueta.

### 1.5 `.env` de cada entorno

Propiedad `ubuntu:ubuntu`, modo `0600`.

| Variable | prod | stg | Nota |
|---|---|---|---|
| `ENV_NAME` | `prod` | `stg` | Lo usa el compose para el nombre del proyecto y del contenedor |
| `APP_PORT` | `4000` | `4001` | Publicado solo en `127.0.0.1` |
| `TAG` | `sha-abc1234` | igual | Lo mueve el wrapper; no editar a mano |
| `BASE_URL` | `https://ludoteca.floyd303.com` | `https://ludoteca-stg.floyd303.com` | Enlaces de recuperación y cookies |
| `TRUST_PROXY_HOPS` | `1` | `1` | Solo el proxy de Nginx; `2` si se activa el de Cloudflare |
| `NODE_ENV` | `production` | `production` | — |
| `DATABASE_PATH` | `/data/ludoteca.db` | igual | Dentro del volumen |
| `IMAGES_DIR` | `/data/images` | igual | Miniaturas |
| `DNI_KEY` | `openssl rand -base64 32` | **otra distinta** | AES-256-GCM. Si se pierde, los DNI no se recuperan |
| `SMTP_URL` | `smtps://…` | vacío | Sin correo en staging: el enlace se escribe en el log |
| `SMTP_FROM` | `ludoteca@mail.floyd303.com` | igual | Subdominio con SPF/DKIM/DMARC |
| `BGG_TOKEN` | *(vacío hasta que haya token)* | igual | Descarga de miniaturas |
| `LOG_LEVEL` | `info` | `debug` | — |

Las claves `DNI_KEY` de staging y producción son **distintas**: nunca se copian datos reales a staging, y una clave filtrada en pruebas no abre los DNI de producción.

### 1.6 Proxy: dos proxy hosts

| Campo | Producción | Staging |
|---|---|---|
| Domain Names | `ludoteca.floyd303.com` | `ludoteca-stg.floyd303.com` |
| Scheme | `http` | `http` |
| Forward Hostname | `ludoteca-prod-app` | `ludoteca-stg-app` |
| Forward Port | `4000` | `4001` |
| Block Common Exploits | ON | ON |
| Websockets | OFF | OFF |
| Access List | ninguna | **una con usuario y contraseña** |

Pestaña SSL en ambos: *Request a new SSL certificate*, **Force SSL**, HTTP/2, HSTS activado, HSTS Subdomains **desactivado**.

Pestaña Advanced (los dos):

```nginx
client_max_body_size 25m;      # CSV del catálogo
proxy_read_timeout 120s;       # descarga de imágenes y exportaciones
proxy_send_timeout 120s;
# Las cabeceras de seguridad las emite la aplicación (SEC-07).
# No duplicarlas aquí: dos CSP se suman y rompen la interfaz.
```

La contraseña básica de staging se pone para el primer despliegue y se puede retirar después; sirve para que nadie indexe ni pruebe una versión a medias.

### 1.7 Cloudflare

Solo DNS en los dos nombres:

| Tipo | Nombre | Contenido | Proxy |
|---|---|---|---|
| A | `ludoteca` | IP del VPS | DNS only (nube gris) |
| A | `ludoteca-stg` | IP del VPS | DNS only (nube gris) |

Con la nube gris, el reto HTTP-01 de Let's Encrypt llega directo y no hay caché ni límites de Cloudflare de por medio. Se pierde la absorción de tráfico de Cloudflare; para este proyecto (asociación sin ánimo de lucro, un fin de semana) es un intercambio razonable. Si algún día se activa la nube naranja: SSL/TLS **Full (strict)**, *Always Use HTTPS*, **Auto Minify OFF**, **Rocket Loader OFF** y `TRUST_PROXY_HOPS=2`.

### 1.8 Firewall y logs

```sh
sudo ufw allow 80,443/tcp
sudo ufw deny 4000/tcp
sudo ufw deny 4001/tcp
sudo ufw status
```

El puerto interno ya se publica en `127.0.0.1`; cerrarlo también en el cortafuegos es la segunda barrera. En el compose, límite de logs:

```yaml
logging:
  driver: json-file
  options: { max-size: "10m", max-file: "5" }
```

### 1.9 Copia de seguridad

Cron del host a las 04:00, para cada entorno:

```sh
cd /home/ubuntu/docker/ludoteca/prod && docker compose run --rm -T app backup --to /data/backups/nightly-$(date +%F).db --keep 30
```

La retención la hace el propio comando (`--keep`), porque los ficheros son del UID 10001 y `ubuntu` no puede borrarlos desde el host.

**Pendiente:** la copia cifrada fuera del VPS queda anotada en `docs/pendientes.md` (PEN-01) hasta que se decida el destino. Mientras tanto, una copia en el mismo disco no es una copia.

### 1.10 GitHub

| Elemento | Valor |
|---|---|
| Repositorio | `git@github.com:menteludic/ludoteca.git` (público, MIT) |
| Paquete GHCR | `ghcr.io/menteludic/ludoteca` — **visibilidad pública** (Settings → Packages → Change visibility) |
| Secrets | `SSH_HOST`, `SSH_USER=ubuntu`, `SSH_KEY`, `SSH_KNOWN_HOSTS` |
| Variable | `APP_URL=https://ludoteca.floyd303.com` |
| Branch protection en `main` | Checks obligatorios: `quality`, `contract`, `e2e`; sin push directo |

Si el paquete queda privado, el servidor necesita `docker login ghcr.io` con un token `readonly` (`read:packages`) en `/home/ubuntu/.docker/config.json` con modo `0600`. Preferible público: menos credenciales en el servidor.

### 1.11 Comprobación previa (preflight)

Antes del primer despliegue, y cada vez que se toque el servidor, se pasa el comprobador de solo lectura que está en el repo:

```sh
scp deploy/preflight.sh ubuntu@<vps>:/tmp/preflight.sh
ssh ubuntu@<vps> sh /tmp/preflight.sh
```

Comprueba docker y compose, la red `proxy`, los dos `.env` (permisos, claves obligatorias, puertos y que las `DNI_KEY` no coincidan), el `compose.yaml`, el propietario de `data` y que el UID 10001 escribe, la entrada `command=` de `authorized_keys` con su script y su `sh -n`, el estado de GHCR, disco y hora. No imprime secretos y termina con el número de fallos.

### 1.12 Primera cuenta y prueba de humo (en staging)

```sh
cd /home/ubuntu/docker/ludoteca/stg
docker compose run --rm -T app create-admin --email roberto@ejemplo.com   # contraseña por stdin
curl -fsS http://127.0.0.1:4001/health
```

Después, desde el navegador: entrar, crear el evento con sus franjas, importar el CSV de BGG, descargar imágenes, registrar un jugador de prueba y cerrar el ciclo con cinco juegos (lista E.1). Producción se toca después, con los mismos comandos y las mismas comprobaciones.

## 2. Cada despliegue

```
push a una rama  →  PR  →  quality + contract + e2e  →  merge a main
                                                          │
                imagen sha-abc1234 → GHCR ────────────────┘
                     │
                     ├─ ssh ubuntu@vps "deploy stg sha-abc1234"   → humo sobre staging
                     └─ ssh ubuntu@vps "deploy prod sha-abc1234"  → .last-good
                              backup → pull → migrate → up -d → /health dice abc1234
                                                         rojo → rollback automático
```

Sin pipeline, el operador tiene dos verbos: `ssh ubuntu@vps "status prod"` y `ssh ubuntu@vps "rollback prod"`.

## 3. Ensayo en local antes de producción

```sh
make build                      # misma imagen, mismo Dockerfile
make up                         # compose local con APP_PORT=4000 y volumen ./data
make smoke                      # health + versión + ciclo mínimo por HTTP
./deploy/deploy.sh --dry-run    # valida script, permisos de volumen, migrate y healthcheck
```

La imagen que se prueba en local es la que se publica: mismo Dockerfile, misma etiqueta por SHA, mismo healthcheck. Lo que **no** se ensaya en local es la cadena proxy → app, el certificado, el DNS y el correo; para eso está el entorno `stg` en el mismo VPS.

## 4. Aviso que hay que tener escrito

`ubuntu` está en el grupo `docker`, y pertenecer a ese grupo equivale a ser root en el host: cualquiera con esa cuenta puede montar `/` dentro de un contenedor. La protección real no es la cuenta, es que la clave de Actions solo puede invocar el wrapper con sus tres verbos. Esa clave no se copia a portátiles y se rota si hay duda.

## 5. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Runtime | Node **24 LTS** (verificado: `node:sqlite` funciona sin flag en 24.22.3) |
| Rutas | `/home/ubuntu/docker/ludoteca/{prod,stg}` |
| Usuario de despliegue | `ubuntu`, clave ed25519 dedicada con `command=` |
| Cloudflare | Solo DNS (nube gris); `TRUST_PROXY_HOPS=1` |
| Dominios | `ludoteca.floyd303.com` y `ludoteca-stg.floyd303.com` |
| Staging | Mismo VPS, puerto 4001, volumen y clave de cifrado propios, contraseña básica |
| Copia fuera del VPS | Pendiente (PEN-01) |