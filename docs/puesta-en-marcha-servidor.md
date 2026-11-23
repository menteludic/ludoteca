# Puesta en marcha en el servidor

Documento de trabajo para el sysop. Recoge lo que hay que preparar **una sola vez** en el VPS y lo que ocurre en cada despliegue. La aplicación no termina TLS ni habla con Cloudflare: escucha en un puerto interno y Nginx Proxy Manager (NPM) hace de puerta.

## 0. Topología

```
Navegador
   │  https://ludoteca.floyd303.com
   ▼
Cloudflare (DNS; proxy opcional)
   │  :443
   ▼
NPM en el VPS  ── certificado Let's Encrypt, HSTS, límite de subida
   │  http://127.0.0.1:4000
   ▼
Contenedor app (Node, UID 10001)  ── /srv/ludoteca/data:/data
```

Consecuencias que afectan al código:

- La app escucha en `0.0.0.0:4000` **dentro** del contenedor y se publica solo en `127.0.0.1:${APP_PORT}` del host. Nada de TLS, nada de certificados, nada de Caddy.
- Detrás hay dos proxys (Cloudflare y NPM). La IP real del cliente y el esquema se leen de `X-Forwarded-For` / `X-Forwarded-Proto` con `TRUST_PROXY_HOPS=2`. Sin eso, el límite de intentos por IP (SEC-06) cuenta a todo el mundo como una sola IP.
- El límite de subida del CSV de catálogo se configura en NPM (`client_max_body_size`), no en la app.
- La app sirve `/health` para el despliegue y para la monitorización externa.

## 1. Una sola vez: el host

### 1.1 Usuario de despliegue y directorios

```sh
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy          # docker ≈ root: ver aviso al final
sudo install -d -m 755 -o root -g root /srv/ludoteca
sudo install -d -m 750 -o 10001 -g 10001 /srv/ludoteca/data
sudo install -d -m 750 -o 10001 -g 10001 /srv/ludoteca/data/images
sudo install -d -m 750 -o 10001 -g 10001 /srv/ludoteca/data/backups
```

`10001` es el UID del usuario `app` dentro de la imagen. Si el directorio pertenece a otro UID, SQLite no puede escribir y el síntoma es un `readonly database` que parece un fallo de la aplicación.

### 1.2 Clave SSH de despliegue

Se genera una clave dedicada, sin passphrase, solo para GitHub Actions:

```sh
ssh-keygen -t ed25519 -C "github-actions@ludoteca" -N "" -f ./ludoteca_deploy
```

La privada (`ludoteca_deploy`) va a GitHub Secrets como `SSH_KEY`. La pública, en `/home/deploy/.ssh/authorized_keys`, **con el wrapper delante**:

```
command="/usr/local/bin/ludoteca-deploy",no-pty,no-agent-forwarding,no-X11-forwarding,no-port-forwarding ssh-ed25519 AAAA... github-actions@ludoteca
```

Con `command=` la clave no abre una shell: solo puede invocar ese script, y el script solo acepta `deploy <tag>`, `rollback` y `status`. Una clave filtrada no permite ejecutar nada más.

### 1.3 El wrapper de despliegue

`/usr/local/bin/ludoteca-deploy`, propiedad de `root:root`, modo `0755`. No se toca en cada despliegue: es infraestructura, no código.

```sh
#!/bin/sh
# Deploy gate for the ludoteca app. Accepts: deploy <tag> | rollback | status
set -eu

BASE=/srv/ludoteca
APP_PORT=$(grep -E '^APP_PORT=' "$BASE/.env" | cut -d= -f2)
COMPOSE="docker compose -f $BASE/compose.yaml --env-file $BASE/.env"
HEALTH="http://127.0.0.1:${APP_PORT:-4000}/health"

case "${SSH_ORIGINAL_COMMAND:-}" in
  "deploy "*)
    TAG=${SSH_ORIGINAL_COMMAND#deploy }
    printf '%s' "$TAG" | grep -Eq '^[0-9a-f]{7,40}$' || { echo "invalid tag" >&2; exit 2; }
    ;;
  "rollback")
    TAG=$(cat "$BASE/.last-good")
    ;;
  "status")
    $COMPOSE ps
    curl -fsS "$HEALTH"
    exit 0
    ;;
  *)
    echo "denied" >&2
    exit 1
    ;;
esac

exec 9>/var/lock/ludoteca-deploy.lock
flock -n 9 || { echo "another deploy is running" >&2; exit 3; }

PREVIOUS=$(grep -E '^TAG=' "$BASE/.env" | cut -d= -f2)

# 1. Backup before touching anything
$COMPOSE run --rm -T app backup --to "/data/backups/pre-$TAG.db"
ls -1t "$BASE"/data/backups/pre-*.db | tail -n +6 | xargs -r rm --

# 2. Pull and migrate, then start
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
  echo "healthcheck failed, rolling back to $PREVIOUS" >&2
  sed -i "s/^TAG=.*/TAG=$PREVIOUS/" "$BASE/.env"
  $COMPOSE pull app
  $COMPOSE up -d --remove-orphans
  exit 4
fi

echo "$PREVIOUS" > "$BASE/.last-good"
echo "deployed $TAG (previous $PREVIOUS)"
```

Dos decisiones dentro del script que conviene entender: la migración corre **antes** de arrancar y como paso aparte (nunca en el `entrypoint`), y el healthcheck no comprueba «responde 200» sino «responde 200 y dice que corre el tag que acabo de desplegar». Un 200 de la versión anterior es un despliegue fallido disfrazado.

El `compose.yaml` del servidor se instala a mano la primera vez y solo se vuelve a tocar cuando cambia el fichero del repositorio (raro: un despliegue normal solo mueve la etiqueta). Lo dejo fuera del flujo automático a propósito: si el pipeline pudiera reescribir el compose, quien controle el pipeline controla el host.

### 1.4 `/srv/ludoteca/.env`

Propiedad `deploy:deploy`, modo `0600` (lo edita el wrapper, contiene secretos).

| Variable | Ejemplo | Nota |
|---|---|---|
| `APP_PORT` | `4000` | Puerto publicado en `127.0.0.1`. NPM apunta aquí |
| `TAG` | `sha-abc1234` | Lo mueve el wrapper; no editar a mano |
| `BASE_URL` | `https://ludoteca.floyd303.com` | Enlaces de recuperación y cookies |
| `TRUST_PROXY_HOPS` | `2` | Cloudflare + NPM |
| `DATABASE_PATH` | `/data/ludoteca.db` | Dentro del volumen |
| `IMAGES_DIR` | `/data/images` | Miniaturas |
| `DNI_KEY` | `openssl rand -base64 32` | AES-256-GCM. **Si se pierde, los DNI no se recuperan** |
| `SMTP_URL` | `smtps://user:pass@smtp.proveedor.com:465` | Solo recuperación de contraseña |
| `SMTP_FROM` | `ludoteca@mail.floyd303.com` | Subdominio propio con SPF/DKIM/DMARC |
| `BGG_TOKEN` | *(vacío hasta que haya token)* | Descarga de miniaturas |
| `LOG_LEVEL` | `info` | — |

`DNI_KEY` no se rota sin un plan: rotarla exige descifrar y volver a cifrar cada DNI con un comando de mantenimiento (pendiente de escribir en P14; queda anotado).

### 1.5 NPM: Proxy Host

| Campo | Valor |
|---|---|
| Domain Names | `ludoteca.floyd303.com` |
| Scheme | `http` |
| Forward Hostname | `host.docker.internal` (o la IP de `docker0`, p. ej. `172.17.0.1`) |
| Forward Port | `4000` |
| Block Common Exploits | ON |
| Websockets Support | OFF (no se usan) |
| Access List | ninguna: la app es pública, incluido `/panel` (RN-32) |

Pestaña SSL: *Request a new SSL certificate*, **Force SSL**, HTTP/2, HSTS activado, HSTS Subdomains **desactivado**.

Pestaña Advanced (bloque nginx):

```nginx
client_max_body_size 25m;      # CSV del catálogo
proxy_read_timeout 120s;       # descarga de imágenes y exportaciones
proxy_send_timeout 120s;
# La CSP, HSTS, Referrer-Policy y nosniff los emite la aplicación (SEC-07).
# No duplicar cabeceras aquí: dos CSP se suman y rompen la interfaz.
```

Si NPM es un contenedor y `host.docker.internal` no resuelve, añade a su compose:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### 1.6 Cloudflare

Orden correcto, y este orden importa:

1. Registro `A` `ludoteca` → IP del VPS, **proxy desactivado** (nube gris).
2. En NPM, emitir el certificado. Con la nube gris, el reto HTTP-01 llega.
3. Activar el proxy (nube naranja) y poner SSL/TLS en **Full (strict)**.
4. Reglas: *Always Use HTTPS* ON; **Auto Minify OFF**; **Rocket Loader OFF**. Los dos últimos rompen aplicaciones hechas con nodos virtuales.
5. Comprobar que Cloudflare no cachea HTML ni API. La app ya manda `Cache-Control: no-store` en HTML y JSON, y un año `immutable` en `/images/*`; si Cloudflare ignora esas cabeceras para HTML, se crea una regla de caché para `ludoteca.floyd303.com/*` excluyendo `/images/*`.

### 1.7 Firewall y logs

```sh
sudo ufw allow 80,443/tcp
sudo ufw deny 4000/tcp
sudo ufw status
```

El puerto 4000 no debe ser alcanzable desde fuera: se publica en `127.0.0.1` y además se cierra en el cortafuegos. En el compose, límite de logs:

```yaml
logging:
  driver: json-file
  options: { max-size: "10m", max-file: "5" }
```

### 1.8 Copia de seguridad diaria

Cron del host, 04:00, fuera del contenedor:

```sh
cd /srv/ludoteca && docker compose run --rm -T app backup --to /data/backups/nightly-$(date +%F).db
find /srv/ludoteca/data/backups -name 'nightly-*.db' -mtime +30 -delete
```

Y una copia **fuera del VPS** (rclone, restic o `age` + descarga) al menos semanal. La copia que vive en el mismo disco que el original no es una copia.

### 1.9 GitHub

| Elemento | Valor |
|---|---|
| Repositorio | `git@github.com:menteludic/ludoteca.git` (público, MIT) |
| Paquete GHCR | `ghcr.io/menteludic/ludoteca` — **visibilidad pública** (Settings → Packages → Change visibility) |
| Secrets del entorno `production` | `SSH_HOST`, `SSH_USER=deploy`, `SSH_KEY`, `SSH_KNOWN_HOSTS` |
| Variable | `APP_URL=https://ludoteca.floyd303.com` |
| Branch protection en `main` | Checks obligatorios: `quality`, `contract`, `e2e`; sin push directo |

Si el paquete de GHCR queda privado, el VPS necesita `docker login ghcr.io` con un token de solo lectura (`read:packages`) guardado en `/home/deploy/.docker/config.json` con modo `0600`. Preferible público: menos credenciales en el servidor.

### 1.10 Primera cuenta y prueba de humo

```sh
cd /srv/ludoteca
docker compose run --rm -T app create-admin --email roberto@ejemplo.com   # pide la contraseña por stdin
docker compose run --rm -T app mail-test --to roberto@ejemplo.com
curl -fsS http://127.0.0.1:4000/health
```

Después, desde el navegador: entrar, crear el evento con sus franjas, importar el CSV de BGG, descargar imágenes, registrar un jugador de prueba y completar el ciclo con cinco juegos (lista E.1).

## 2. Cada despliegue

```
push a una rama  →  PR  →  quality + contract + e2e  →  merge a main
                                                          │
                        build imagen sha-abc1234 → GHCR ──┘
                                                          │
                        ssh deploy@vps "deploy sha-abc1234"
                                                          │
      backup → pull → migrate → up -d → /health dice abc1234 → .last-good
                                                          │
                                    rojo → rollback automático a .last-good
```

Lo que puede hacer el operador sin pipeline: `ssh deploy@vps "status"` (estado y versión) y `ssh deploy@vps "rollback"` (vuelve a `.last-good`).

## 3. Ensayo en local antes de producción

El mismo camino se puede recorrer en la máquina de desarrollo, y así se hace antes de cada fase:

```sh
make build                      # imagen con el mismo Dockerfile
make up                         # compose local con APP_PORT=4000 y volumen ./data
make smoke                      # health + versión + ciclo mínimo por HTTP
./deploy/deploy.sh --dry-run    # valida script, permisos de volumen, migrate y healthcheck
```

La imagen que se prueba en local es la que se publica: mismo Dockerfile, misma etiqueta por SHA, mismo healthcheck. Lo que **no** se puede ensayar en local es la cadena Cloudflare → NPM → app, el certificado, el DNS y el correo. Por eso el primer despliegue va a `staging.floyd303.com` (mismo compose, `APP_PORT=4001`, volumen `data-staging`, datos de prueba) y producción solo se toca cuando ese despliegue pasa la lista.

## 4. Aviso que hay que tener escrito

El usuario `deploy` está en el grupo `docker`, y pertenecer al grupo `docker` equivale a ser root en el host: cualquiera con esa cuenta puede montar `/` dentro de un contenedor. La protección real no es el grupo, es que la clave SSH solo puede invocar el wrapper con tres verbos. Aun así: esa clave no se copia a portátiles, rota si hay duda, y el acceso interactivo por SSH del día a día se hace con tu cuenta, no con `deploy`.

## 5. Pendiente de confirmar contigo

1. ¿NPM puede resolver `host.docker.internal` o hay que usar la IP de `docker0`?
2. ¿Cloudflare queda en modo proxy (naranja) o solo DNS? Cambia `TRUST_PROXY_HOPS` y la regla de caché.
3. ¿`ludoteca.floyd303.com` es el nombre definitivo? Va en `BASE_URL`, en los enlaces de recuperación y en los certificados.
4. ¿Quieres `staging.floyd303.com` con contraseña básica en NPM para el primer despliegue?
5. ¿El VPS tiene `age` o `restic` para las copias cifradas fuera del host, o lo dejamos en `rclone` a un destino que ya uses?