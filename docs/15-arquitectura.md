# 15. Arquitectura

## 15.1 Vista general

```
   Móvil del jugador            Tablet del mostrador
   (PWA instalable)             (PWA, modo mostrador)
          │                              │
          └────────── HTTPS ─────────────┘
                         │
                ┌────────▼─────────┐
                │  Hono (Node 24)  │  API REST + estáticos
                │  rutas · zod     │
                └────────┬─────────┘
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
  ┌─────▼─────┐   ┌──────▼──────┐   ┌──────▼───────┐
  │  Dominio  │   │  Consultas  │   │  Adaptadores │
  │  (puro)   │   │  (lectura)  │   │  CSV, imágs. │
  └─────┬─────┘   └──────┬──────┘   └──────────────┘
        └────────┬───────┘
          ┌──────▼───────┐
          │   SQLite     │  datos + auditoría
          │   (WAL)      │
          └──────────────┘
```

Un proceso, un contenedor, un fichero de base de datos y el Nginx Proxy Manager que ya corre en el host (ADR-016). No hay servidor de base de datos que administrar, ni colas, ni microservicios.

## 15.2 Elección de la base de datos

Pediste el análisis. Estos son los números del sistema y la comparación:

**Volumen real:** 600 juegos, 10.000 cuentas, 5.000 préstamos por evento, 10.000 asientos de auditoría. En total, menos de 50 MB al año. **Escrituras:** 5 por segundo en el peor minuto. **Lecturas:** unas 50 por segundo.

| Criterio | SQLite | PostgreSQL | MariaDB | MongoDB |
|---|---|---|---|---|
| Instalación y operación | Ninguna: un fichero | Servidor, usuarios, `VACUUM`, actualizaciones | Servidor y configuración | Servidor y configuración |
| Copia de seguridad | Copiar un fichero o `VACUUM INTO` | `pg_dump` y restauración | `mysqldump` | `mongodump` |
| Concurrencia de escritura | Un escritor a la vez; lecturas simultáneas con WAL | Muchos escritores | Muchos escritores | Muchos escritores |
| ¿Aguanta este volumen? | Sí, con dos órdenes de magnitud de margen | Sí, de sobra | Sí, de sobra | Sí |
| Coste de mantenimiento | Mínimo | Medio | Medio | Medio |
| Transacciones y SQL | Sí | Sí | Sí | No |
| Encaje con el proyecto | **Alto** | Bajo: sobredimensionado | Bajo | Bajo: no hay documentos |

**Decisión: SQLite en modo WAL.** Con un solo evento abierto a la vez y 5 escrituras por segundo, el límite de un escritor no se toca nunca. A cambio, el sysop no administra ningún servidor de base de datos, la copia es copiar un fichero y la instalación es un contenedor.

**Salida si el sistema crece:** todo el acceso a datos está detrás de un repositorio con SQL estándar; migrar a PostgreSQL es cambiar el adaptador y el `docker-compose`, no la lógica. Se revisará si algún día hay varios eventos simultáneos o más de 50 escrituras por segundo sostenidas.

## 15.3 Event Sourcing: por qué no

El documento original lo pedía. Con el alcance de esta versión no se sostiene:

- Hay **un solo agregado con reglas** (el préstamo) y tres transiciones.
- No se necesita reconstruir estados pasados: el historial se lee de la propia tabla de préstamos.
- 5.000 préstamos por evento generan 15.000 asientos que no aportan nada frente a 5.000 filas con dos marcas de tiempo.
- El coste no es escribir el libro: es mantener proyecciones, migraciones por reconstrucción y un modelo mental que un voluntario no va a tener en la cabeza en marzo.

**Lo que se conserva del espíritu original:** una tabla de auditoría de solo anexión, con hash encadenado, que registra cada operación con su actor y su hora, y que no se puede alterar sin que se note. Es el 10 % del coste y cubre el 100 % de la necesidad real: saber quién hizo qué.

Si en el futuro se quiere Event Sourcing de verdad, las reglas del capítulo 8 no cambian: solo cambia dónde se guardan los hechos.

## 15.4 Stack

| Pieza | Elección | Por qué |
|---|---|---|
| Runtime | Node.js 24 LTS | Estable, en soporte, sin sorpresas |
| Correo | **SMTP del proveedor** | Solo recuperación; sin SDK propio, con el transporte que ya trae el runtime o `nodemailer` |
| HTTP | **Hono 4** | Funciones y composición, sin clases; validación con zod; 14 kB |
| Validación | zod | Un esquema por ruta; el mismo esquema valida y documenta |
| Base de datos | **`node:sqlite`** (incluido en Node) | Sin dependencias nativas ni compilación en Docker |
| Contraseñas | `node:crypto` scrypt | Sin dependencias nativas; algoritmo recomendado |
| Interfaz | **snabbdom** + **Fomantic-UI** | Nodos virtuales y el lenguaje visual pedido, sin jQuery en nuestro código |
| Empaquetado | esbuild | Un comando, sin configuración |
| Pruebas | `node:test` + `c8` | Incluidos en Node; sin framework que mantener |
| Navegador de pruebas | Playwright | Cinco flujos de extremo a extremo |
| Proxy | **Nginx Proxy Manager** del host (ADR-016) | TLS y certificados donde ya los gestiona el sysop; la app escucha HTTP en un puerto interno |

## 15.5 Comparativa de framework HTTP

| Criterio | Express 5 | Fastify 5 | Hono 4 |
|---|---|---|---|
| Estilo | Callbacks y middleware con estado | Plugins encapsulados, decoradores | Funciones puras, composición |
| ¿Necesita `new` o `this`? | No, pero su ecosistema sí lo usa | No, pero los plugins usan objetos con estado | No |
| Validación integrada | No | Sí (JSON Schema) | Sí (zod) |
| Tamaño | Medio | Medio | Muy pequeño |
| Encaje con «sin clases» | Bajo | Medio | **Alto** |

Se elige Hono. Express sigue siendo válido, pero su modelo de middleware obliga a estado compartido y a comprobar a mano lo que aquí se declara en el esquema.

## 15.6 Estructura del código

```
src/
  domain/          reglas puras: estados, préstamo, evento, juego
  app/             casos de uso: solicitar, entregar, devolver, cerrar
  infra/           sqlite, repositorios, csv, imágenes, correo, hash, sesiones
  http/            rutas Hono, esquemas zod, middleware de permisos
  web/             interfaz: vistas snabbdom, estilos, textos es.json
  bootstrap/       arranque y composición (único sitio con efectos)
test/
```

Regla de dependencia: `domain` importa solo módulos relativos y `ramda`; `app` importa `domain`; `infra` y `http` importan `app`; `bootstrap` importa todo. `class`, `new` y `this` están prohibidos en `domain` y `app`, y se comprueba con lint.

Ramda se admite también en `domain` porque son funciones puras sin I/O: no acopla el núcleo a ningún framework ni a la infraestructura (ADR-020).

Cada módulo exporta **una fábrica** que devuelve un objeto con sus operaciones, no funciones sueltas. El objeto que recibe la fábrica es su configuración, el estado privado vive en el closure y la instancia se crea donde se compone. Es lo que permite sustituir `Database` por un doble en una prueba sin tocar el dominio.

## 15.7 Despliegue

| Pieza | Decisión |
|---|---|
| Contenedores | Solo `app`, con el UID 10001. El TLS lo termina el Nginx Proxy Manager del host, no un Caddy propio. |
| Servidor | VPS de 1 vCPU y 2 GB, 6–10 €/mes, con Portainer como panel de operación. Dos entornos en `/home/ubuntu/docker/ludoteca/{prod,stg}` |
| Exposición | La app escucha HTTP en `0.0.0.0:4000` dentro del contenedor y se publica en `127.0.0.1:${APP_PORT}` del host, unida a la red Docker `proxy`. El proxy de Nginx la resuelve por nombre de servicio, enruta el dominio y emite el certificado. |
| Configuración | Variables de entorno en `/srv/ludoteca/.env`, fuera del repositorio |
| Datos | **Volumen Docker fuera del contenedor**: `/srv/ludoteca/data` montado en `/data`. Dentro viven `ludoteca.db`, `ludoteca.db-wal` y `images/`. Recrear o actualizar el contenedor no toca el dato. |
| Copias | `VACUUM INTO` diario sobre `/data`, más copia semanal cifrada fuera del host |
| CI/CD | Actions: `quality`, `contract` y `e2e`; en `main`, imagen `sha-<corto>` en GHCR y despliegue por SSH con healthcheck y rollback (ADR-017) |
| Monitorización | `/health` cada 5 minutos desde fuera; devuelve estado de la base, versión del esquema y SHA desplegado |

## 15.8 Decisiones de arquitectura

| ID | Decisión | Alternativa descartada | Consecuencia |
|---|---|---|---|
| ADR-001 | Tablas de estado + auditoría encadenada | Event Sourcing con CQRS | Menos código y menos mantenimiento; se pierde la reconstrucción temporal, que no se necesita |
| ADR-002 | SQLite con WAL | PostgreSQL | Un fichero, sin servidor; techo de escritura más bajo, lejos del uso real |
| ADR-003 | Hono | Express, Fastify | Sin clases ni estado compartido; ecosistema más pequeño |
| ADR-004 | CSV de BGG como vía principal | Scraping o API | Fiable y sin trámite; manual y sin imágenes |
| ADR-005 | Fomantic-UI | Semantic UI | Mantenimiento; mismas clases |
| ADR-006 | ESLint plano con reglas de Google | `eslint-config-google` | El paquete oficial está archivado; asumimos las reglas |
| ADR-007 | JavaScript con JSDoc y `checkJs` | TypeScript | Sin compilación; menos garantías de tipo |
| ADR-008 | Sesiones opacas en base de datos | JWT | Revocación inmediata; una consulta más por petición |
| ADR-009 | scrypt de `node:crypto` | argon2id | Sin dependencia nativa; configuración equivalente en seguridad práctica |
| ADR-010 | Token QR aleatorio guardado como hash | JWT firmado en el QR | Un solo uso y caducidad reales; una fila por solicitud |
| ADR-011 | Una caja, un registro | Un registro con contador | Trazabilidad por ejemplar; los duplicados se numeran |
| ADR-012 | Sin modo sin conexión | PWA con cola local | Mucho menos código; se asume red en el recinto |
| ADR-013 | Imágenes por API de BGG con token | CSV ampliado o sin imágenes | Requiere el trámite de registro; a cambio, el catálogo es reconocible de un vistazo |
| ADR-014 | Sin etiquetas QR en las cajas | Etiqueta por caja | Ahorra horas de trabajo y depende de algo que hoy no existe; la devolución va por el jugador |
| ADR-015 | Correo solo para recuperar la contraseña | Sin correo o correo completo | Desbloquea las cuentas locales sin depender de un rebote; asume un proveedor y tres registros DNS |
| ADR-016 | TLS en Nginx Proxy Manager; app en puerto interno | Caddy en el compose | Un contenedor menos; la app depende de las cabeceras `X-Forwarded-*` |
| ADR-017 | Actions + GHCR + SSH con etiqueta por SHA | Webhook de Portainer con `latest` | Despliegue automático con rollback determinista; exige una clave SSH restringida en el VPS |
| ADR-018 | Portainer como panel, no como despliegue | Stack gestionado con GitOps | Una sola fuente de verdad; el stack se ve como contenedores externos |
