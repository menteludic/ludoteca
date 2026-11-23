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

Dos entornos en el mismo VPS, separados por carpeta y volumen:

```
/home/ubuntu/docker/ludoteca/
├── prod/   .env  compose.yaml  data/{ludoteca.db,images,backups}
└── stg/    .env  compose.yaml  data/{ludoteca.db,images,backups}
```

Reglas de puerto, y son solo dos:

1. **La app escucha en 4000 dentro del contenedor, siempre, en los dos entornos.** No es configurable y no depende del entorno.
2. **No se publica ningún puerto al host.** El proxy llega por la red Docker y el script de despliegue comprueba la salud **dentro** del contenedor.

Así desaparecen dos clases de fallo: el choque con otro servicio que ya ocupe un puerto del host, y el 502 que solo aparece en un entorno porque el puerto de fuera no coincide con el de dentro.

El resto de consecuencias:

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

El proxy resuelve el contenedor por su nombre, así que los dos tienen que estar en la misma red Docker:

```sh
docker network create proxy 2>/dev/null || true
docker ps --format '{{.Names}}\t{{.Image}}' | grep -i proxy     # nombre real del contenedor
docker network connect proxy <contenedor-del-proxy>
docker network inspect proxy -f '{{range .Containers}}{{.Name}} {{end}}'
```

La última orden tiene que listar el proxy y, cuando estén levantados, `ludoteca-prod-app` y `ludoteca-stg-app`. `docker network connect` no reinicia nada y surte efecto al instante.

**Persistencia:** esa conexión se pierde si el contenedor del proxy se recrea (actualizar la imagen, por ejemplo). Para que sobreviva, en el compose del proxy (o en su stack de Portainer) hay que declarar la red:

```yaml
services:
  app:
    networks:
      - proxy
networks:
  proxy:
    external: true
```

Nuestro `deploy/compose.yaml` ya declara `networks: [proxy]` y `container_name: ludoteca-${ENV_NAME}-app`; no hay nada que cambiar de este lado.

**Aviso:** en el proxy, el *Forward Hostname* tiene que ser `ludoteca-prod-app` (o `ludoteca-stg-app`), nunca `127.0.0.1`. Dentro del contenedor del proxy, `127.0.0.1` es el propio proxy, y el síntoma es un 502 permanente aunque la aplicación esté levantada y sana.

### 1.2 bis · Validar la cadena antes del primer despliegue

Los contenedores de la aplicación los crea el compose del pipeline; no se crean a mano y no existen hasta que hay imagen en GHCR (`docker compose up -d` falla con `manifest unknown` antes). Para comprobar **hoy** que la red, el proxy y el TLS están bien, se levanta un contenedor de mentira con el nombre exacto y **en el puerto 4000**, como la aplicación real:

```sh
docker run -d --name ludoteca-stg-app --network proxy \
  node:24-alpine node -e 'require("node:http").createServer((_,res)=>{res.setHeader("content-type","application/json");res.end(JSON.stringify({status:"ok",version:"probe"}))}).listen(4000,"0.0.0.0")'
```

y lo mismo con `ludoteca-prod-app`. Sin `--rm` y sin `-p`, a propósito: sin `--rm` el contenedor conserva sus logs si muere (con `--rm` desaparece y el error se pierde), y sin publicar puerto no hay forma de chocar con otro servicio del host.

Después:

```sh
docker network inspect proxy -f '{{range .Containers}}{{.Name}} {{end}}'
docker ps -a --filter name=ludoteca --format '{{.Names}}\t{{.Status}}'
docker logs --tail 20 ludoteca-stg-app
docker run --rm --network proxy node:24-alpine \
  node -e 'fetch("http://ludoteca-stg-app:4000/health").then(r => r.text()).then(console.log)'
curl -sS https://ludoteca-stg.floyd303.com/health
```

Los dos primeros comprueban que está vivo y con logs; el tercero prueba resolución y HTTP **desde dentro de la red** sin depender de las utilidades del contenedor del proxy (la imagen de Nginx Proxy Manager no trae `nslookup` ni `wget`, y `docker exec manager nslookup` falla con «executable file not found»). El último es la prueba completa: DNS → TLS → proxy → red → contenedor.

Si el último devuelve 502 con el contenedor arriba y conectado, el fallo está en el enrutado del proxy, no en la red. Se ve sin abrir la interfaz:

```sh
docker exec manager sh -c 'cat /data/nginx/proxy_host/*.conf' | grep -E 'server_name|proxy_pass'
```

Tiene que aparecer, en el fichero de `ludoteca-stg.floyd303.com`, `set $server "ludoteca-stg-app";`, `set $port 4000;` y `proxy_pass $forward_scheme://$server:$port;`. El proxy de Nginx no escribe la URL fija: usa variables, así que buscar solo `proxy_pass` no basta. Si `$server` es `127.0.0.1`, una IP o un puerto distinto, ahí está el problema.

Y si sigue sin estar claro, el registro del contenedor del proxy dice la causa exacta: `could not be resolved` es nombre mal escrito o red mal conectada; `connect() failed` es que resuelve pero nadie escucha en ese puerto.

```sh
docker logs --tail 20 manager | grep -iE 'error|could not|connect\(\)'
```

**La prueba que separa red de configuración:** ejecutar un contenedor que comparte la red del propio proxy. Si eso resuelve el nombre, la red del proxy está bien y el fallo solo puede estar en el *Forward Hostname*:

```sh
docker run --rm --network container:manager node:24-alpine \
  node -e 'fetch("http://ludoteca-stg-app:4000/health").then(r => r.text()).then(console.log)'
```

**Ojo con el nombre:** tiene que ser el nombre completo del contenedor, `ludoteca-stg-app` y `ludoteca-prod-app`, con el sufijo `-app` y el puerto 4000. Un `set $server "ludoteca-stg";` con el puerto 4001 da 502 con los contenedores perfectamente sanos.

**Y si la prueba directa por HTTP devuelve 301**, no es un fallo: es *Force SSL* redirigiendo. Para saltarse TLS, Cloudflare y el DNS de una vez:

```sh
curl -sS --resolve ludoteca-stg.floyd303.com:443:127.0.0.1 https://ludoteca-stg.floyd303.com/health
```

Al terminar, se borran los de mentira, porque ocupan el nombre que necesitan los reales:

```sh
docker rm -f ludoteca-stg-app ludoteca-prod-app
```

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

El fichero está en el repositorio, en `deploy/ludoteca-deploy.sh`: es la fuente única y se instala tal cual, sin copiar y pegar desde este documento.

```sh
sudo install -m 0755 -o root -g root deploy/ludoteca-deploy.sh \
  /home/ubuntu/docker/ludoteca/bin/ludoteca-deploy
```

Acepta tres verbos y valida el formato de la etiqueta (`sha-` y 7 a 40 caracteres hexadecimales); cualquier otra cosa se rechaza antes de tocar nada.

Tres decisiones que conviene entender: la migración corre **antes** de arrancar y como paso aparte (nunca en el `entrypoint`); el healthcheck exige que `/health` declare el tag desplegado, no un simple 200; y el `flock` impide que dos despliegues pisen el mismo entorno.

El `compose.yaml` de cada entorno se instala a mano la primera vez y solo se toca cuando cambia el fichero del repositorio. Un despliegue normal solo mueve la etiqueta.

### 1.5 `.env` de cada entorno

Propiedad `ubuntu:ubuntu`, modo `0600`.

| Variable | prod | stg | Nota |
|---|---|---|---|
| `ENV_NAME` | `prod` | `stg` | Lo usa el compose para el nombre del proyecto y del contenedor |
| `TAG` | `sha-abc1234` | igual | Lo mueve el wrapper; no editar a mano. Si se pierde, `TAG=sha-0000000` sirve de marcador: no hay imagen con ese nombre y el primer despliegue lo sustituye |
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

No hay `APP_PORT`: no se publica ningún puerto en el host. Si un `.env` lo conserva de una prueba anterior, no molesta, pero no se usa.

Las claves `DNI_KEY` de staging y producción son **distintas**: nunca se copian datos reales a staging, y una clave filtrada en pruebas no abre los DNI de producción.

### 1.6 Proxy: dos proxy hosts

| Campo | Producción | Staging |
|---|---|---|
| Domain Names | `ludoteca.floyd303.com` | `ludoteca-stg.floyd303.com` |
| Scheme | `http` | `http` |
| Forward Hostname | `ludoteca-prod-app` | `ludoteca-stg-app` |
| Forward Port | `4000` | `4000` |
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
sudo ufw status
```

No hay puerto interno que cerrar: no se publica ninguno en el host. En el compose, límite de logs:

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
| Secrets | `SSH_HOST=82.223.117.97`, `SSH_USER=ubuntu`, `SSH_KEY`, `SSH_KNOWN_HOSTS` |
| Contenido de `SSH_KNOWN_HOSTS` | Una línea: `82.223.117.97 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICaBY7VGyYJ9KDJb8G6PGu+nHrF1AL6h5Y27Vb6BHJfm` |
| Variable | `APP_URL=https://ludoteca.floyd303.com` |
| Branch protection en `main` | Checks obligatorios: `quality`, `contract`, `e2e`; sin push directo |

Si el paquete queda privado, el servidor necesita `docker login ghcr.io` con un token `readonly` (`read:packages`) en `/home/ubuntu/.docker/config.json` con modo `0600`. Preferible público: menos credenciales en el servidor.

**Qué es `SSH_KNOWN_HOSTS`.** Es la clave pública del *servidor*, no la del usuario: la que el SSH del VPS presenta al conectarse. GitHub la compara con la que tiene guardada y, si no coincide, aborta la conexión. Sirve para que un pipeline no entregue la clave de despliegue a un impostor que se haga pasar por la IP del VPS.

Cómo se comprueba antes de fiarse (en el VPS):

```sh
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
# 256 SHA256:LFucYCBmSCyjI1mNf/QpVjVhqlAlCwRCB5Jau1j6n38 root@vps (ED25519)
```

Ese `SHA256:…` tiene que ser **exactamente** `LFucYCBmSCyjI1mNf/QpVjVhqlAlCwRCB5Jau1j6n38`, que es el que devuelve hoy `ssh-keyscan` desde fuera para 82.223.117.97. Si no coincide, no se pega nada en el secret: el que responde en esa IP no es el servidor que crees. Si el VPS se reinstala o se regeneran las claves de host, el secret se actualiza o los despliegues fallan con `Host key verification failed`.

En el workflow se escribe antes de conectar:

```yaml
- name: known_hosts
  run: |
    mkdir -p ~/.ssh
    printf '%s\n' "${{ secrets.SSH_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
    chmod 600 ~/.ssh/known_hosts
```

y todo `ssh`/`scp` sale con `-o StrictHostKeyChecking=yes -o UserKnownHostsFile=~/.ssh/known_hosts`.

### 1.11 Comprobación previa (preflight)

Antes del primer despliegue, y cada vez que se toque el servidor, se pasa el comprobador de solo lectura que está en el repo:

```sh
scp deploy/preflight.sh ubuntu@<vps>:/tmp/preflight.sh
ssh ubuntu@<vps> sh /tmp/preflight.sh
```

Comprueba docker y compose, la red `proxy`, los dos `.env` (permisos, claves obligatorias y que las `DNI_KEY` no coincidan), el `compose.yaml`, el propietario de `data` y que el UID 10001 escribe, la entrada `command=` de `authorized_keys` con su script y su `sh -n`, el estado de GHCR, disco y hora. No imprime secretos y termina con el número de fallos.

### 1.12 Primera cuenta y prueba de humo (en staging)

```sh
cd /home/ubuntu/docker/ludoteca/stg
docker compose run --rm -T app create-admin --email roberto@ejemplo.com   # contraseña por stdin
docker compose exec -T app node src/cli.js health
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
                              backup → pull → migrate → up -d → health dice abc1234
                                                         rojo → rollback automático
```

Sin pipeline, el operador tiene dos verbos: `ssh ubuntu@vps "status prod"` y `ssh ubuntu@vps "rollback prod"`.

## 3. Ensayo en local antes de producción

```sh
make build                      # misma imagen, mismo Dockerfile
make up                         # compose local con volumen ./data
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
| Puerto | 4000 dentro del contenedor, en los dos entornos; nada publicado en el host (ADR-019) |
| Cloudflare | Solo DNS (nube gris); `TRUST_PROXY_HOPS=1` |
| Dominios | `ludoteca.floyd303.com` y `ludoteca-stg.floyd303.com` |
| Staging | Mismo VPS, volumen y clave de cifrado propios, contraseña básica |
| Copia fuera del VPS | Pendiente (PEN-01) |
## 6. Primer despliegue: quién hace qué

Para que no haya dudas de responsabilidad, esta es la lista cerrada. Lo que no está aquí, no bloquea.

**Desarrollo (yo):**

1. `Dockerfile` sobre `node:24-alpine` con usuario 10001 y healthcheck.
2. `.github/workflows/ci.yml`: job `quality` (lint, tipos, pruebas con cobertura, `npm audit`, revisión de secretos) y job `deploy` en `main`.
3. `contract` y `e2e` se añaden cuando existan las rutas y la interfaz (fases F1 y F2). Hasta entonces no son checks obligatorios, y así se dice en la protección de `main`.
4. Verificar el primer despliegue leyendo el log del pipeline y el `/health` de staging.

**Sysop (Roberto):**

1. Borrar los contenedores de prueba, que ocupan los nombres reales:

   ```sh
   docker rm -f ludoteca-prod-app ludoteca-stg-app
   ```

2. Copiar el compose a cada entorno y validarlo:

   ```sh
   cp deploy/compose.yaml /home/ubuntu/docker/ludoteca/prod/compose.yaml
   cp deploy/compose.yaml /home/ubuntu/docker/ludoteca/stg/compose.yaml
   cd /home/ubuntu/docker/ludoteca/prod && docker compose config -q && echo OK
   cd /home/ubuntu/docker/ludoteca/stg && docker compose config -q && echo OK
   ```

3. Añadir `ENV_NAME` a los dos `.env` (`ENV_NAME=prod` y `ENV_NAME=stg`) y comprobar que existe `data/backups`.

4. Access List con usuario y contraseña en el proxy host de staging.

5. Subir el código a GitHub (es el único bloqueo duro; sin eso no hay imagen ni despliegue). Ver apartado 6.1.

6. Secretos y variable en GitHub: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_KNOWN_HOSTS` y la variable `APP_URL`.

7. Tras el primer pipeline con éxito, poner el paquete GHCR en público (*Settings → Packages → ludoteca → Change visibility*).

### 6.1 Subir el código

El repositorio local no tiene remoto configurado y no hay credenciales de GitHub en el servidor de desarrollo, así que el primer `push` lo hace el sysop:

```sh
cd /ruta/al/repositorio/ludoteca      # el mismo árbol que se ha ido commiteando
git remote add origin git@github.com:menteludic/ludoteca.git
git fetch origin
git log --oneline origin/main | head -5     # ¿hay commits en GitHub que no estén aquí?
git push -u origin main
```

Si el segundo `git log` muestra commits (por ejemplo, la licencia añadida desde la web), integrarlos antes de empujar: `git pull --rebase origin main`, resolver si hay conflicto y repetir el `push`. Un `git push --force` aquí no es aceptable: borraría trabajo del repositorio.

**Alternativa si el repositorio está solo en el servidor de desarrollo:** se genera un par de claves, la pública se añade en GitHub como *Deploy key* con permiso de escritura, y el `push` lo hace el propio entorno de desarrollo. La clave nunca se pega en un chat.
