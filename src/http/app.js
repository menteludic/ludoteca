/**
 * HTTP surface. Every dependency arrives from the edge: this module does not
 * read the environment, does not open the database and does not print.
 */

import {Hono} from 'hono';

/**
 * @typedef {{status: 'ok' | 'degraded', version: string, db: 'ok' | 'unavailable',
 *   schema: number, checkedAt: string}} HealthBody
 * @typedef {{problems: {titles: Record<string, string>, details: Record<string, string>}}} Messages
 */

/**
 * Builds the HTTP application.
 *
 * @param {object} deps Edge dependencies.
 * @param {() => Promise<HealthBody>} deps.health Returns the `/health` body.
 * @param {() => string} deps.requestId Generates a request identifier.
 * @param {(event: object) => void} deps.log Writes a structured log line.
 * @param {{build: Function}} deps.problem Builds a problem body.
 * @param {Messages} deps.messages Catalogue of interface texts.
 * @returns {{handler: Hono}} Application ready to serve or to test with `handler.request`.
 */
const App = ({health, requestId, log, problem, messages}) => {
  const handler = new Hono();

  /**
   * Answers with an RFC 9457 body.
   *
   * @param {import('hono').Context} c Hono context.
   * @param {string} code Stable code; its status comes from the catalogue.
   * @param {string} detail Sentence for the person.
   * @returns {Response} Response typed as `application/problem+json`.
   */
  const asProblem = (c, code, detail) => {
    const body = problem.build(code, detail);

    return c.body(
      JSON.stringify(body),
      /** @type {any} */ (body.status),
      {'content-type': 'application/problem+json'},
    );
  };

  handler.use('*', async (c, next) => {
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

  handler.get('/health', async (c) => {
    const body = await health();
    return c.json(body, body.status === 'ok' ? 200 : 503);
  });

  handler.notFound((c) =>
    asProblem(c, 'NOT_FOUND', messages.problems.details.NOT_FOUND ?? 'Not found'));

  handler.onError((err, c) => {
    log({level: 'error', error: err.message, path: c.req.path});
    return asProblem(c, 'INTERNAL', messages.problems.details.INTERNAL ?? 'Internal error');
  });

  return Object.freeze({handler});
};

export {App};
