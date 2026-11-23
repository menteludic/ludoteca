import {Hono} from 'hono';

import {problem} from './problem.js';

/**
 * @typedef {{status: 'ok' | 'degraded', version: string, db: 'ok' | 'unavailable',
 *   schema: number, checkedAt: string}} HealthBody
 */

/**
 * Devuelve un error con el tipo de contenido de RFC 9457.
 *
 * @param {import('hono').Context} c Contexto de Hono.
 * @param {400 | 401 | 403 | 404 | 409 | 413 | 429 | 500 | 503} status Código HTTP.
 * @param {string} code Código estable.
 * @param {string} detail Explicación para la persona.
 * @returns {Response} Respuesta serializada como `application/problem+json`.
 */
const asProblem = (c, status, code, detail) =>
  c.body(
    JSON.stringify(problem(status, code, detail)),
    status,
    {'content-type': 'application/problem+json'},
  );

/**
 * Crea la aplicación HTTP. Las dependencias entran desde el borde: aquí no se
 * lee el entorno, no se abre la base y no se escribe en la salida.
 *
 * @param {object} deps Dependencias del borde.
 * @param {() => Promise<HealthBody>} deps.health Devuelve el cuerpo de `/health`.
 * @param {() => string} deps.requestId Genera un identificador de petición.
 * @param {(event: object) => void} deps.log Escribe una línea de log estructurada.
 * @returns {Hono} Aplicación lista para servir o probar con `app.request`.
 */
export const createApp = ({health, requestId, log}) => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const id = requestId();
    c.header('X-Request-Id', id);
    c.header('Cache-Control', 'no-store');
    const started = Date.now();
    await next();
    log({
      requestId: id,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - started,
    });
  });

  app.get('/health', async (c) => {
    const body = await health();
    return c.json(body, body.status === 'ok' ? 200 : 503);
  });

  app.notFound((c) => asProblem(c, 404, 'NOT_FOUND', 'Esa dirección no existe.'));

  app.onError((err, c) => {
    log({level: 'error', error: err.message, path: c.req.path});
    return asProblem(c, 500, 'INTERNAL', 'Algo ha fallado por nuestra parte.');
  });

  return app;
};