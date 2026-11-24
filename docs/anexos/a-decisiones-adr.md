# Anexo A · Registro de decisiones (ADR)

Cada decisión se mantiene mientras no se revise por escrito. Una ADR sustituida se marca, no se borra.

## ADR-001 · Tablas de estado y auditoría, sin Event Sourcing

- **Contexto.** El documento original pedía Event Sourcing con CQRS. El alcance final tiene un solo agregado con reglas y tres transiciones.
- **Decisión.** Tablas de estado (`loans`, `games`, `events`) más una tabla de auditoría de solo anexión con hash encadenado.
- **Alternativa.** Libro de eventos con proyecciones: 15.000 asientos por evento, reconstrucción y migraciones por replay.
- **Consecuencia.** Menos código que mantener y ninguna consulta que dependa de reconstruir. Se pierde la posibilidad de reconstruir el estado en una fecha pasada; el historial de préstamos y la auditoría cubren las preguntas reales.

## ADR-002 · SQLite con WAL

- **Contexto.** 50 MB al año, 5 escrituras por segundo en el pico y una sola persona administrando.
- **Decisión.** SQLite en modo WAL, con `node:sqlite` incluido en Node.
- **Alternativa.** PostgreSQL: un servidor más que actualizar, copiar y vigilar, para un volumen que no lo pide.
- **Consecuencia.** Copia de seguridad = copiar un fichero; instalación = un contenedor. Un solo escritor a la vez, que con este volumen no se alcanza. La salida a PostgreSQL está aislada en el repositorio.

## ADR-003 · Hono en lugar de Express

- **Contexto.** Se prohíben `class`, `new` y `this` en el código propio; Express arrastra un modelo de middleware con estado compartido.
- **Decisión.** Hono 4 con validación zod.
- **Alternativa.** Express 5 (maduro, ecosistema enorme) y Fastify (más rápido, plugins con estado).
- **Consecuencia.** Rutas como funciones, composición clara y 14 kB de dependencia. Ecosistema más pequeño y menos ejemplos en foros.

## ADR-004 · Catálogo por CSV

- **Contexto.** El acceso automatizado a BGG devuelve 403 de Cloudflare y la API exige token con aprobación.
- **Decisión.** Importación por el CSV que el propio BGG exporta; la API queda como mejora opcional.
- **Alternativa.** Scraper (bloqueado) o API desde el primer día (depende de una aprobación externa).
- **Consecuencia.** El catálogo se actualiza a mano cuando cambia. A cambio, el sistema no depende de un tercero para arrancar y no hay imágenes en el MVP.

## ADR-005 · Fomantic-UI

- **Contexto.** Semantic UI no tiene desarrollo activo.
- **Decisión.** Fomantic-UI, el fork mantenido, con las mismas clases.
- **Alternativa.** Semantic UI congelado; Tailwind; Bootstrap.
- **Consecuencia.** Se conserva el lenguaje visual pedido. Algunos módulos siguen necesitando jQuery; no se usan: solo CSS y nuestros propios componentes.

## ADR-006 · Configuración plana de ESLint

- **Contexto.** `eslint-config-google` está archivado desde el 1 de junio de 2026 y no tiene equivalente en configuración plana.
- **Decisión.** Configuración propia con las reglas equivalentes.
- **Alternativa.** Quedarse en ESLint 8 con el paquete congelado.
- **Consecuencia.** Mantenemos las reglas y las actualizamos con el lenguaje.

## ADR-007 · JavaScript con JSDoc y `checkJs`

- **Contexto.** Se pide JavaScript; conviene detectar errores antes de ejecutar.
- **Decisión.** JSDoc en las funciones públicas y comprobación de tipos en CI.
- **Alternativa.** TypeScript: más garantías, un paso de compilación y un lenguaje distinto del pedido.
- **Consecuencia.** Menos seguridad de tipos que TypeScript. A cambio, el código que se ejecuta es el que se lee.

## ADR-008 · Sesiones opacas en base de datos

- **Contexto.** Hay que poder expulsar a alguien al retirarle un rol.
- **Decisión.** Token aleatorio de 256 bits, guardado como hash, con caducidad y revocación.
- **Alternativa.** JWT: sin consulta por petición, pero revocación complicada.
- **Consecuencia.** Una consulta indexada por petición autenticada. A cambio, retirar un rol surte efecto inmediato.

## ADR-009 · scrypt en lugar de argon2id

- **Contexto.** argon2id exige una dependencia nativa que hay que compilar en la imagen.
- **Decisión.** `crypto.scrypt` con `N=2^17`, `r=8`, `p=1` y sal de 32 bytes.
- **Alternativa.** argon2id (algo mejor en teoría) o bcrypt (peor).
- **Consecuencia.** Sin dependencias nativas y con parámetros equivalentes en la práctica. El coste por inicio de sesión ronda 300 ms, aceptable con 5 intentos por minuto.

## ADR-010 · Token QR aleatorio, no firmado

- **Contexto.** El QR se enseña en una pantalla y debe servir una sola vez.
- **Decisión.** 128 bits aleatorios, guardados como hash, con la caducidad del evento y marca de uso.
- **Alternativa.** JWT firmado dentro del QR: no se puede invalidar tras el primer uso.
- **Consecuencia.** Una fila por solicitud y una comprobación por escaneo. Garantiza el «un solo uso» que un JWT no da.

## ADR-011 · Una caja, un registro

- **Contexto.** El documento no aclaraba si un título con dos copias es uno o dos registros.
- **Decisión.** Cada copia física tiene su fila y su etiqueta de ejemplar; los duplicados se numeran.
- **Alternativa.** Un registro por título con contador de ejemplares.
- **Consecuencia.** Trazabilidad exacta y devoluciones sin ambigüedad. El catálogo muestra «Catan (2)» cuando hay dos cajas.

## ADR-012 · Sin funcionamiento sin conexión

- **Contexto.** Se asume red en el recinto y el sistema no es crítico.
- **Decisión.** Si no hay red, la aplicación lo dice y no acepta operaciones.
- **Alternativa.** Cola local con reconciliación: duplica el código de escritura y obliga a resolver conflictos.
- **Consecuencia.** Menos código y menos estados imposibles. Si la red falla, el mostrador espera; no se registran datos a medias.

## ADR-013 · Imágenes desde la API de BGG

- **Contexto.** El jugador elige mirando; el CSV no trae imágenes y el scraping está bloqueado.
- **Decisión.** Descargar las miniaturas con la API y el token de aplicación, a una petición por segundo, y guardarlas en el volumen de datos.
- **Alternativa.** Sin imágenes, o con una columna `image_url` rellenada a mano.
- **Consecuencia.** El catálogo se reconoce de un vistazo y el servidor no depende de BGG en cada visita. A cambio, hay un trámite previo y una descarga inicial de unos diez minutos.

## ADR-014 · Sin etiquetas QR en las cajas

- **Contexto.** Etiquetar 600 cajas es trabajo de campo y no hay un sistema de etiquetas fiable.
- **Decisión.** La devolución se identifica por el QR del jugador o por el nombre del juego entre los préstamos abiertos.
- **Alternativa.** Etiqueta por caja con QR impreso.
- **Consecuencia.** Cero trabajo previo y ninguna etiqueta que se caiga. A cambio, el controlador teclea parte del nombre cuando el jugador no está delante.


## ADR-015 · Correo solo para recuperar la contraseña

- **Contexto.** Sin correo, una cuenta local sin contraseña solo se arregla a mano en el mostrador. Con verificación de cuenta, un fallo del proveedor deja a alguien sin poder jugar.
- **Decisión.** Un único correo saliente: el enlace de recuperación. Nada de verificación, avisos ni resúmenes.
- **Alternativa.** Sin correo (restablecimiento por un administrador) o correo completo con verificación y avisos.
- **Consecuencia.** Quien escribe mal su correo puede recuperarlo igualmente pidiendo ayuda, y nadie se queda fuera por un rebote. A cambio, una cuenta con correo falso nunca se arregla sola: depende de que haya un administrador disponible.

## ADR-016 · Terminación TLS en Nginx Proxy Manager

- **Contexto.** El VPS ya publica todas sus aplicaciones con Nginx Proxy Manager: DNS en Cloudflare (solo DNS), proxy host en esa herramienta, certificado gestionado por ella y la aplicación escuchando en un puerto interno. Un Caddy propio en el compose añadiría un segundo terminador TLS y un segundo juego de certificados.
- **Decisión.** La aplicación sirve HTTP en un puerto configurable (`APP_PORT`, 4000 en producción y 4001 en staging), publicado solo en `127.0.0.1` y unido a la red Docker `proxy`, donde el proxy la resuelve por nombre de servicio. El proxy enruta el dominio, emite el certificado y aplica HSTS; la app emite las cabeceras de seguridad de SEC-07 y lee la IP y el esquema reales con `TRUST_PROXY_HOPS=1` (Cloudflare en solo DNS).
- **Alternativa.** Caddy en el compose (lo que decía 15.7): TLS automático, pero dos proxys delante del mismo host y dos formas de renovar certificados que mantener.
- **Consecuencia.** Un contenedor menos y el TLS en la herramienta que el sysop ya usa. A cambio, la app depende de `X-Forwarded-For`/`X-Forwarded-Proto` para el límite por IP y para los enlaces absolutos; mal configurado, SEC-06 cuenta a todos los clientes como uno. El límite de subida y los timeouts largos pasan al proxy. Si algún día se activa la nube naranja de Cloudflare, `TRUST_PROXY_HOPS` sube a 2.

## ADR-017 · Entrega continua con Actions, GHCR y etiqueta por SHA

- **Contexto.** El repositorio es público, hay un VPS con acceso SSH y se pide que un push probado llegue a producción sin intervención.
- **Decisión.** GitHub Actions ejecuta `quality`, `contract` y `e2e`; solo en `main` construye la imagen, la publica en GHCR etiquetada `sha-<corto>` y despliega por SSH con un wrapper que solo acepta `deploy <tag>`, `rollback` y `status`. El wrapper hace backup, migraciones, `up -d`, comprueba que `/health` declara el tag desplegado y revierte si no.
- **Alternativa.** Usar `latest` con un webhook de Portainer (más simple, sin rollback determinista) o Watchtower (despliega sin puerta de pruebas).
- **Consecuencia.** Cada versión en producción es una imagen inmutable que pasó las pruebas, y volver atrás es una orden. A cambio, el servidor guarda una clave SSH restringida por `command=` y el compose del servidor se actualiza a mano cuando cambia, no en cada despliegue.

## ADR-018 · Portainer como panel de operación, no como vía de despliegue

- **Contexto.** El VPS se administra con Portainer, y existe la tentación de dejar que Portainer haga el redeploy desde el repositorio Git.
- **Decisión.** Portainer queda para observar y operar (logs, estado, reinicio de emergencia). El despliegue lo hace el pipeline por SSH; el stack se levanta con `docker compose` desde `/srv/ludoteca`.
- **Alternativa.** Stack gestionado por Portainer con GitOps y webhook: Portainer actualiza el compose, pero no promueve etiquetas de imagen, así que acaba usando `latest`.
- **Consecuencia.** Una sola fuente de verdad del despliegue y rollback reproducible. A cambio, el stack aparece en Portainer como contenedores externos, sin botón de redeploy, y hay que resistir la tentación de editar contenedores desde su interfaz.

## ADR-019 · Puerto único interno y sin publicación en el host

- **Contexto.** Con dos entornos en el mismo VPS, mapear el puerto de fuera al 4000 de dentro (4000 prod, 4001 stg) hacía que el proxy, el healthcheck y el `.env` tuvieran que coincidir en tres sitios. El primer intento chocó con otro servicio que ya ocupaba el 4000 del host.
- **Decisión.** La app escucha en 4000 dentro del contenedor en todos los entornos y no se publica ningún puerto en el host. El proxy llega por la red Docker con el nombre del contenedor y el script de despliegue comprueba la salud con `docker compose exec`.
- **Alternativa.** Publicar en `127.0.0.1:${APP_PORT}` y que el proxy y el healthcheck usaran ese puerto: funciona, pero cualquier servicio del host puede ocuparlo y el fallo aparece como 502 solo en un entorno.
- **Consecuencia.** Un solo puerto que recordar y ningún choque posible. A cambio, no se puede hacer `curl` desde el host para comprobar: se usa `docker compose exec`, y si el contenedor no arranca, `exec` falla (que es justo lo que el despliegue necesita saber).

## ADR-020 · Módulos por fábrica, Ramda en el núcleo y código en inglés

- **Contexto.** El código inicial exportaba funciones sueltas (`export const ok = ...`), los comentarios y los mensajes estaban en castellano y no había librería funcional. Con la aplicación todavía pequeña, cambiar la forma de los módulos es barato; con veinte ficheros, no. Roberto pide cerrar esa convención ahora.
- **Decisión.** Tres reglas para todo el repositorio. (1) **Idioma**: todo el código en inglés —nombres, comentarios, JSDoc, mensajes de error y de log—, la documentación en castellano y los textos que ve la persona en `src/web/ui/es.json`. (2) **Fábricas**: cada módulo exporta una función que recibe su configuración y devuelve un objeto congelado con sus operaciones; el estado privado vive en el closure y la instancia se crea donde se compone. (3) **Ramda**: disponible en todo `src/`, incluido `domain`, usada donde simplifica y no para reescribir `map` o `filter` triviales.
- **Alternativa.** Mantener funciones sueltas (menos indirección, pero sin sitio natural para la configuración ni para el estado privado) y dejar Ramda fuera de `domain` (regla anterior: «domain no importa nada»). Traducir el código al inglés solo en los ficheros nuevos habría dejado dos estilos conviviendo.
- **Consecuencia.** El dominio acepta una dependencia externa por primera vez; se justifica porque Ramda son funciones puras sin I/O y no acopla a framework ni a base de datos, y la regla de lint sigue prohibiendo todo lo demás (`no-restricted-imports` con excepción explícita). Todo módulo nuevo nace con la forma fábrica-que-devuelve-objeto, y las pruebas instancian el módulo que necesitan en vez de importar singletons. Los textos de error del dominio pasan a ser un código estable con parámetros: quien redacta la frase es el catálogo, no la capa de reglas.
