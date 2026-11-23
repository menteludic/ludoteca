# Ludoteca

Sistema de préstamo de juegos de mesa para los eventos de la asociación. Una web, sin instalar nada, para que un jugador pida un juego, lo recoja en el mostrador y lo devuelva, y para que la organización sepa en todo momento qué está fuera y quién lo tiene.

Pensado para un evento real: 600 juegos, 1.500 asistentes al día, 120 préstamos en hora punta y 4–6 puestos de control.

## Estado

**Documentación cerrada (v1.0).** Aún no hay código. El siguiente paso es el esqueleto de la aplicación y las primeras pruebas.

## Qué hace

- **Jugador:** se registra, consulta el catálogo con imágenes, pide un juego, lo recoge con un QR y lo devuelve.
- **Controlador:** entrega y recibe juegos desde una página de mostrador; no ve datos personales que no necesite.
- **Organización:** abre y cierra el evento, bloquea juegos, consulta quién tiene qué y saca estadísticas al cerrar.
- **Sala:** un panel público, sin sesión, con los juegos que están fuera y los rankings del evento.

Una regla que ordena todo lo demás: **un juego por jugador a la vez**, sin reservas ni cola de espera.

## Arquitectura

| Pieza | Elección |
|---|---|
| Runtime | Node.js 24 LTS |
| HTTP | Hono 4 con contrato OpenAPI |
| Datos | SQLite en WAL con `node:sqlite`, en un volumen fuera del contenedor |
| Interfaz | snabbdom + Fomantic-UI, sin paso de compilación |
| Servidor | VPS con Nginx Proxy Manager; la app escucha HTTP en un puerto interno (ADR-016) |
| Pruebas | `node:test`, TDD, cobertura global del 90 % |

Sin Event Sourcing: tablas de estado y auditoría de solo anexión con hash encadenado. El detalle y las alternativas descartadas están en `docs/15-arquitectura.md` y `docs/anexos/a-decisiones-adr.md`.

## Estructura

```
.
├── README.md          Este fichero
└── docs/              Documentación de proyecto, un fichero por área
    ├── README.md      Índice de áreas
    ├── guia-de-usuario.md
    ├── 01..20-*.md    Capítulos
    ├── anexos/        ADR, matriz de endpoints, esquema SQL, OpenAPI, pruebas
    └── referencia/    Documento v1.0 completo, congelado
```

El código vivirá en `src/` con la estructura por capas que describe `docs/15-arquitectura.md`; todavía no existe.

## Documentación

Empieza por `docs/README.md`. Si buscas el documento completo de una vez, está en `docs/referencia/documento-proyecto-ludoteca-v1.0.html`.

## Puesta en marcha

Lo que hay que preparar en el VPS (usuario de despliegue, clave SSH restringida, proxy de Nginx, Cloudflare, copias) está en `docs/puesta-en-marcha-servidor.md`. Necesita el volumen de datos (`/home/ubuntu/docker/ludoteca/prod/data`) fuera del contenedor y una copia de seguridad probada antes del evento.

## Convenciones

- Código, nombres y commits en inglés; documentación de usuario y conversación, en castellano.
- Una rama por cambio. Nada de `push --force` ni `reset --hard` sobre trabajo ajeno.
- Antes de dar algo por terminado: lint limpio, pruebas en verde y la salida real pegada en el informe.