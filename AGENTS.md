# Reglas de este repositorio

Aplicación de préstamo de juegos para los eventos de la asociación. Este fichero manda sobre el `AGENTS.md` del directorio padre en lo que no contradiga el documento de proyecto.

## Comandos

| Qué | Cómo |
|---|---|
| Instalar | `make install` (`npm ci`, requiere `package-lock.json` en el repo) |
| Comprobar todo | `make check` = lint + tipos + pruebas con cobertura + banco de pruebas del script de despliegue |
| Solo pruebas | `make test` |
| Arrancar | `make start` |
| Despliegue local | `docker compose up` con `deploy/compose.yaml` adaptado |

Nada se da por terminado sin `make check` en verde y su salida real pegada en el informe.

## Idioma

- Código, nombres de ficheros, tablas, rutas y commits en **inglés**.
- Comentarios de código, documentación y textos de interfaz en **castellano**.
- Textos de la interfaz en un único fichero `src/web/ui/es.json` con claves estables.

## Arquitectura

```
src/
  domain/      reglas puras (sin I/O, sin reloj, sin aleatorio)
  app/         casos de uso; reciben dependencias ya construidas
  infra/       sqlite, repositorios, csv, imágenes, correo, hash, sesiones
  http/        rutas Hono, esquemas zod, middleware de permisos
  web/         vistas snabbdom, estilos, textos
  bootstrap/   arranque y composición: el único sitio con efectos globales
test/
deploy/        compose del servidor, preflight, scripts de despliegue
```

Dependencias hacia dentro: `domain` no importa nada; `app` importa `domain`; `infra` y `http` importan `app`; `bootstrap` importa todo. La regla se comprueba con ESLint, no con buenas intenciones.

## Prohibiciones

- `class`, `new` y `this` en `src/domain` y `src/app` (regla de lint, no sugerencia).
- Importar Hono, zod, SQLite o cualquier paquete en `src/domain`.
- Leer la hora del sistema en el núcleo: el instante entra como parámetro.
- Consultas construidas concatenando texto.
- Secretos, DNIs reales ni datos de producción en el repositorio o en las pruebas.
- `console.log` fuera de `src/cli.js` y `src/bootstrap/`.
- Bajar un umbral de cobertura o saltar una prueba para entregar antes.

## Cobertura

Umbral global 90 % (`src/domain` 95 %, `src/app` 90 %, `src/http` 85 %, `src/infra` 80 %, capítulo 16). Hoy solo existe `src/domain`; el resto de umbrales entran cuando exista su carpeta.

## Pruebas

`node:test`, un concepto por prueba, nombre en forma de frase. Los dobles van en los bordes (reloj, red, base de datos); el dominio se prueba con datos. Sin `sleep` para sincronizar.

## Commits

Conventional Commits en inglés (`feat:`, `fix`, `refactor`, `test`, `docs`, `chore`). Asunto en imperativo, menos de 72 caracteres. Una rama por cambio. Nunca `push --force` ni `reset --hard`.

## Decisiones

Las decisiones caras de revertir van a `docs/anexos/a-decisiones-adr.md` (convención del proyecto, no `docs/adr/`). Una ADR es una página: contexto, decisión, alternativa descartada y consecuencia.