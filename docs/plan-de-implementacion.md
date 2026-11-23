# Plan de implementación

Plan de ejecución de la aplicación de la Ludoteca, derivado del documento de proyecto v1.0 (`docs/`). Cada paso es una unidad que se puede revisar y aceptar por separado: tiene un entregable concreto, una comprobación que se ejecuta y una salida que se pega. Las fases F0–F6 y las horas son las del capítulo 19; aquí se abren en pasos. La topología de despliegue (Nginx Proxy Manager, GHCR y SSH) está en el ADR-016 y el ADR-017, y los comandos del servidor en `puesta-en-marcha-servidor.md`.

## 1. Cómo se audita un paso

Ningún paso se da por hecho con una explicación. Cada uno termina con:

1. **Una rama** (`feat/loan-delivery`, `chore/ci`) y commits pequeños en inglés con el porqué.
2. **La salida real de `make check`**: lint, `tsc --checkJs`, pruebas y cobertura (`domain` ≥ 95 %, `app` ≥ 90 %, `http` ≥ 85 %, `infra` ≥ 80 %, total ≥ 90 %).
3. **La prueba nueva, vista fallar antes** del código que la hace pasar.
4. **Un informe de tres líneas** en el hilo del paso: qué cambió, qué se ejecutó, qué queda.
5. **La revisión del diff** con las siete preguntas de 16.8. Si el paso añade una decisión cara de revertir, entra su ADR en `docs/adr/`.

Cuando un paso no se pueda ejecutar (sin VPS, sin token de BGG, sin aplicación de Facebook), se entrega con un doble en el borde y se dice explícitamente qué falta y quién lo desbloquea. No se simula una salida.

**Puerta de fase:** al cerrar cada fase hay una demostración de 10 minutos sobre el entorno real, con su lista de comprobación. Sin puerta no se empieza la siguiente fase.

## 2. La lista

### F0 · Preparación — 16 h · puerta: `main` despliega `/health`

| Paso | Entregable | Verificación |
|---|---|---|
| P01 | `AGENTS.md` del proyecto (comandos, capas, prohibiciones), árbol `src/{domain,app,infra,http,web,bootstrap}` y `test/`, `openapi.yaml` vacío con cabecera | `make check` arranca y falla por falta de pruebas, no por configuración |
| P02 | ESLint plano con reglas de Google y las restricciones de 16.5 (`class`, `new`, `this`, `innerHTML`, `max-lines` 300, JSDoc), `c8`, `node:test`, `Makefile` con `check` | `make lint` limpio sobre el esqueleto; una prueba trivial en rojo y luego en verde |
| P03 | `jsconfig.json` y `tsc --checkJs` sobre JSDoc | `npx tsc -p jsconfig.json` sin errores |
| P04 | CI (GitHub Actions o `make check` en el runner acordado): lint, tipos, pruebas con cobertura, `npm audit`, revisión de secretos | Pipeline en verde en el primer push; un commit con un `class` a propósito lo pone rojo |
| P05 | HTTP base: Hono, `GET /health`, errores `application/problem+json` con código estable, `request-id` y logs JSON sin PII | Prueba de contrato de `/health` y de forma del error; log de una petición revisado a mano |
| P06 | Esquema SQLite del Anexo C como migración `001_init.sql`, runner idempotente, `WAL` y `foreign_keys` activos | Prueba de integración: BD en fichero temporal, índices únicos parciales rechazan dos `DELIVERED` del mismo juego y dos préstamos vivos del mismo jugador |
| P07 | `Dockerfile` con UID 10001 y compose de desarrollo: la app sirve HTTP en `APP_PORT` (4000) publicada en `127.0.0.1`, volumen `./data:/data`, `.env.example` completo; CLI `migrate`, `backup`, `create-admin` | `docker compose up` y `/health` con base, esquema y versión; `migrate` dos veces seguidas no cambia nada; recrear el contenedor conserva la BD |
| P08 | Imagen `ghcr.io/menteludic/ludoteca:sha-<corto>` y despliegue por SSH con el wrapper del servidor: backup → pull → migrate → `up -d` → healthcheck que exige el SHA → rollback si no | Desplegar dos versiones seguidas: la segunda se sirve y `.last-good` apunta a la primera; desplegar una imagen que no arranca vuelve sola a la anterior; **requiere del sysop: usuario `deploy`, clave restringida, proxy host en NPM** |

### F1 · Núcleo — 68 h · puerta: un evento abre y cierra solo y el catálogo está importado

| Paso | Entregable | Verificación |
|---|---|---|
| P09 | Errores como valores en dominio (`{ok,value}`/`{ok,error}`) y los códigos del Anexo D | Prueba de cada código; `domain` no importa nada |
| P10 | `calculateGameState` puro: Retirado → Prestado → Bloqueado → Disponible | Una prueba por rama y por el orden de precedencia de 4.2 |
| P11 | Franjas y estado del evento con reloj inyectado, zona `Europe/Madrid`, sin solapes, un solo evento abierto (RN-21, RN-22, RN-10) | Reloj simulado en marzo y octubre: la franja abre una sola vez; dos eventos solapados: solo uno abre |
| P12 | scrypt `N=2^17, r=8, p=1`, sal 32 B, 64 B de salida, comparación en tiempo constante (SEC-01) | Hash y verificación; la contraseña no aparece en logs ni en errores |
| P13 | Sesiones opacas: token 256 bits hasheado, cookie `HttpOnly/Secure/SameSite=Lax`, 7 días, 12 h y 30 min de inactividad en mostrador (SEC-02, RN-27) | Revocación inmediata, caducidad de tablet y cookie sin `HttpOnly` rechazada por la respuesta real |
| P14 | Registro, login/logout, perfil con DNI cifrado AES-256-GCM y `dni_masked`, API que enmascara por rol (RF-101..107, RN-19) | Matriz: titular entero, controlador `***123X`, admin de evento solo en el listado |
| P15 | Recuperación: token hasheado, un uso, 30 min, 3/h por cuenta, respuesta idéntica exista o no el correo; SMTP por interfaz (RF-105, SEC-17, RN-34..36) | Correo registrado y no registrado: misma respuesta; segundo uso rechazado; envío real con cuenta de pruebas |
| P16 | Roles y autorización deny-by-default; cada ruta declara roles y ámbito (SEC-04, RN-26) | Matriz rol × ruta generada desde el Anexo B y ejecutada contra el servidor: 100 % de las celdas correctas |
| P17 | Eventos: CRUD, franjas, configuración (accesos, TTL 1–120, límites del panel 1–20), página pública (RF-301..310, RN-28/29) | Guardar los tres accesos apagados se rechaza; la página pública responde sin sesión |
| P18 | Importación CSV: validación, previsualización de altas/cambios/desaparecidos, confirmación, bloqueo si hay evento abierto o juegos fuera (RF-201/202, RN-24, INV-09) | CSV de muestra y uno sintético de 600 filas; con evento abierto → `IMPORT_BLOCKED` con motivo |
| P19 | Catálogo: alta manual, duplicar ejemplar, retirada y reactivación, búsqueda sin acentos ni mayúsculas, export CSV (RF-203..211, RN-17/18, RN-30) | «Catan» y «Catan (2)» se prestan a la vez; búsqueda «catan» encuentra «Catán»; retirar con préstamo vivo → `GAME_ON_LOAN` |
| P20 | Descarga de miniaturas desde la API de BGG: token, 1 req/s, host permitido, estados `pending/ok/none/error`, reanudable y único (RF-212, SEC-17, ADR-013) | Doble de la API: reintento con error, `none` no se reintenta, URL externa rechazada; **bloqueado por token de BGG** |
| P21 | OAuth Google con `state` + PKCE y vinculación por correo verificado (RF-102, SEC-03) | `state` repetido y token de otro cliente rechazados; Facebook solo si hay aplicación aprobada (riesgo del cap. 19) |

### F2 · Préstamo — 52 h · puerta: los cinco flujos e2e en verde

| Paso | Entregable | Verificación |
|---|---|---|
| P22 | Solicitud: RN-01..05, un préstamo activo, QR de 128 bits hasheado, código de 6 y caducidad por evento (RF-401/402, SEC-12, ADR-010) | Cada error con su código y su acción; el QR no se puede reconstruir desde la base |
| P23 | Caducidad programada cada minuto y cancelación por el jugador (RF-403/404, RN-06) | Reloj simulado: al minuto TTL el préstamo pasa a `CANCELLED` y el juego queda libre |
| P24 | Entrega por QR: un uso, caducado, evento abierto, concurrencia con dos peticiones simultáneas (RF-406, RN-07..10) | Dos entregas del mismo juego: una `DELIVERED`, otra `GAME_NOT_AVAILABLE`; QR usado dos veces → `QR_ALREADY_USED` |
| P25 | Devolución por QR o por préstamo, siempre permitida; jugador sin préstamo → aviso con su último préstamo (RF-504/505, RN-11..13, INV-05) | Devolución con evento cerrado aceptada; devolución sin préstamo abierto informa |
| P26 | Interfaz del jugador: evento, catálogo con estado y marcador de imagen, ficha, QR grande, préstamo activo, cancelar; textos en `ui/es.json`; PWA instalable (RF-405, RNF-05/09/10/11) | Lighthouse móvil: peso inicial ≤ 250 KB y primera carga ≤ 3 s; revisión visual a 360 y 1280 px |
| P27 | Mostrador: escáner de cámara, tres zonas con letra grande, confirmación de entrega, alternativa por nombre + inicial del DNI, avisos con acción (RF-501..508) | Prueba manual con la tablet real y QR impreso: entrega ≤ 20 s de mediana |
| P28 | Playwright: registro → perfil → solicitud → entrega → devolución → cierre | `make e2e` en verde sobre la imagen Docker; 5 de 5 |

### F3 · Estadísticas y cierre — 46 h · puerta: ciclo completo de un evento de prueba

| Paso | Entregable | Verificación |
|---|---|---|
| P29 | Cierre con juegos fuera, cierre forzoso `forced_close`, reapertura con autor (RF-306, RN-23, RN-21) | Cierre con dos préstamos fuera: aviso con lista, marca en cada préstamo y asiento por cada uno |
| P30 | Métricas MET-01..07 con umbral de uso configurable (RF-701..706) | Cálculo sobre un juego de datos fijo con cifras esperadas escritas a mano; ninguna consulta devuelve nombres, correos ni DNI |
| P31 | Panel de sala público `/panel`: tres listas, límites del evento, refresco 30 s, sin nombres (RF-707, RN-31..33) | Petición sin cookie → 200; sin evento abierto no hay listas; con límite 3 se ven 3 y los que más tiempo llevan |
| P32 | Informe del evento en pantalla, CSV de detalle y PDF de resumen (RF-705) | PDF y CSV abiertos y cotejados con las cifras de P30 |
| P33 | Administración: usuarios del evento con DNI y auditoría de cada apertura y exportación, visor de auditoría con filtros, `audit:verify`, estado del sistema, copia manual (RF-601..607, RN-16/25, SEC-13) | Alterar una fila de `audit_log` hace que `audit:verify` señale esa fila; controlador no ve el DNI completo |

### F4 · Prueba real — 20 h · puerta: criterios de 19.4

| Paso | Entregable | Verificación |
|---|---|---|
| P34 | Ensayo en local o evento pequeño: 3 puestos, 20 juegos, operadores reales | 100 operaciones seguidas sin error, mediana de entrega y devolución ≤ 20 s, cinco altas sin ayuda, incidencias anotadas con su causa |

### F5 · Endurecimiento — 31 h · puerta: revisión de permisos y prueba de carga

| Paso | Entregable | Verificación |
|---|---|---|
| P35 | Accesibilidad WCAG 2.2 AA: contraste 7:1 en mostrador, objetivos de 44 px, zoom 200 % (RNF-05) | `axe` sin violaciones en las cinco pantallas principales; revisión manual de teclado |
| P36 | Seguridad: cabeceras y CSP, CSRF de doble envío, límite de intentos, revisión de secretos y de logs (SEC-05..11, SEC-15/16) | Prueba de petición cruzada rechazada; 20 intentos de login limitados con mensaje genérico; muestra de logs sin DNI, correo ni token |
| P37 | Carga con k6: 50 usuarios y 5 operaciones/s (RNF-01/02, T-26/T-27) | p95 ≤ 500 ms y cero 5xx; 10 entregas simultáneas del mismo juego dejan una sola válida |
| P38 | Textos definitivos, guía de usuario, tarjeta plastificada del puesto, formación de 15 min y traspaso del runbook al sysop (RNF-17) | Una persona nueva completa el alta siguiendo solo la guía |

### F6 · Evento — 12 h · puerta: KPIs medidos y evento cerrado

| Paso | Entregable | Verificación |
|---|---|---|
| P39 | Producción: proxy host y certificado en NPM, Cloudflare en Full (strict), SPF/DKIM/DMARC, primera cuenta, catálogo real, evento y franjas, lista E.1 | Enlace de recuperación que llega a la bandeja; `https://ludoteca.floyd303.com/health` declara el SHA desplegado; humo con cinco juegos en dos puestos |
| P40 | Evento con guardia; cierre, informe, copia de seguridad y restauración cronometrada; KPIs en el documento | Restauración ≤ 30 min verificada; KPI-01..04 anotados con su medición |

## 3. Orden y dependencias

- F0 entera antes de cualquier caso de uso: sin esquema, migraciones, CI y `/health` desplegado no hay dónde apoyar F1.
- Dentro de F1: P09–P11 primero (dominio y tiempo), después acceso (P12–P16), después evento y catálogo (P17–P21). El catálogo (P18) puede adelantarse al acceso si se quiere ver la importación antes.
- F2 depende de F1 completa salvo P20 y P21, que pueden llegar después de P22 si el token de BGG o la aplicación de Facebook se retrasan.
- P28 (e2e) es la puerta real de F2: se escribe contra lo ya construido, no antes.
- F3 depende de F2. P30 y P31 pueden ir en paralelo con P32 y P33.
- F4, F5 y F6 son secuenciales: no se endurece lo que no se ha probado con personas.

## 4. Bloqueos externos

| Bloqueo | Afecta a | Quién lo desbloquea | Plan si no llega |
|---|---|---|---|
| Usuario `deploy`, clave SSH y proxy host en NPM | P08, P39 | Roberto (sysop) | Mientras no existan: se despliega a mano con el mismo script y la puerta de F0 se cierra en local |
| Destino de las copias fuera del VPS | P39 | Roberto | Copia diaria en `/data/backups` y traslado manual hasta acordar `restic`/`rclone` |
| Token de aplicación de BGG | P20 | Roberto (registro en BGG) | Catálogo sin miniaturas y marcador con la inicial; `image_url` del CSV como respaldo |
| Aplicación de Facebook | P21 | Roberto / la asociación | Facebook desactivado por evento; Google y cuenta local cubren el caso |
| Proveedor de correo y registros DNS | P15, P39 | Sysop | Doble del transporte en pruebas; en producción, enlace a bandeja de spam (documentado) |

## 5. Lo que no está en este plan

Cola de espera, reservas, plazos, incidencias, pagos, modo sin conexión, etiquetas QR en las cajas, notificaciones y multi-evento. Están en `docs/20-mejoras-futuras.md` con su motivo. Si alguno entra, cambia el modelo de datos y necesita su ADR antes de la primera línea.