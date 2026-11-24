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

- **Todo el código en inglés**: nombres, claves, comentarios, JSDoc, mensajes de error y de log. Nada de castellano dentro de `src/` ni de `test/`.
- **La documentación en castellano**: `docs/`, `README.md`, este fichero.
- Textos que ve la persona (títulos y detalles de error, etiquetas) en un único catálogo `src/web/ui/es.json`, con claves estables. El código los busca por clave; nunca escribe una frase en castellano.

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

Dependencias hacia dentro: `domain` importa solo módulos relativos y `ramda`; `app` importa `domain`; `infra` y `http` importan `app`; `bootstrap` importa todo. La regla se comprueba con ESLint, no con buenas intenciones.

### Módulos

Un módulo **no expone funciones sueltas**: expone una fábrica y el objeto con sus operaciones.

```js
const Result = () => {
  const ok = (value) => ({ok: true, value});
  return Object.freeze({ok});
};

export {Result};
```

- El objeto que recibe la fábrica es su configuración: `Database({path})`, `Problem({titles})`, `Migrations({database, clock})`.
- La instancia se crea donde se compone (`src/bootstrap/`, `src/cli.js`) o en la prueba. Nunca una instancia suelta a mitad de un módulo.
- El estado privado vive en el closure: quien usa `Database` no ve el driver, solo `exec`, `prepare`, `isHealthy`, `backup` y `close`.
- Se puede exportar la fábrica y nada más. La excepción se justifica en el propio fichero.

### Ramda

`ramda` está disponible en todo `src/`, incluido `domain`: son funciones puras, sin I/O ni framework, así que no acoplan el núcleo. Se usa donde simplifica de verdad —`propEq`, `propOr`, `curry`, `pipe`, `groupBy`, `sortBy`— y no para reescribir `map` o `filter` sobre un array de tres elementos. Si una línea nativa se lee mejor, se queda la nativa.

## Prohibiciones

- `class`, `new` y `this` en `src/domain` y `src/app` (regla de lint, no sugerencia).
- Exportar funciones sueltas desde un módulo de `src/`: se exporta la fábrica.
- Importar en `src/domain` cualquier cosa que no sea un módulo relativo o `ramda`.
- Escribir castellano en el código: comentarios, mensajes o nombres.
- Leer la hora del sistema en el núcleo: el instante entra como parámetro.
- Consultas construidas concatenando texto.
- Secretos, DNIs reales ni datos de producción en el repositorio o en las pruebas.
- `console.log` fuera de `src/cli.js` y `src/bootstrap/`.
- Bajar un umbral de cobertura o saltar una prueba para entregar antes.

## Cobertura

Umbral global 90 % (`src/domain` 95 %, `src/app` 90 %, `src/http` 85 %, `src/infra` 80 %, capítulo 16). Cubiertas `domain`, `app`, `http` e `infra`; `bootstrap` y `src/cli.js` se excluyen del cómputo porque son composición con efectos, y se verifican arrancando de verdad.

## Pruebas

`node:test`, un concepto por prueba, nombre en forma de frase. Los dobles van en los bordes (reloj, red, base de datos); el dominio se prueba con datos. Sin `sleep` para sincronizar.

## Commits

Conventional Commits en inglés (`feat:`, `fix`, `refactor`, `test`, `docs`, `chore`). Asunto en imperativo, menos de 72 caracteres. Una rama por cambio. Nunca `push --force` ni `reset --hard`.

## Decisiones

Las decisiones caras de revertir van a `docs/anexos/a-decisiones-adr.md` (convención del proyecto, no `docs/adr/`). Una ADR es una página: contexto, decisión, alternativa descartada y consecuencia.