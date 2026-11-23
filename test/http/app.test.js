import test from 'node:test';
import assert from 'node:assert/strict';

import {createApp} from '../../src/http/app.js';

const healthy = async () => ({
  status: 'ok',
  version: 'sha-abc1234',
  db: 'ok',
  schema: 1,
  checkedAt: '2026-11-23T18:00:00.000Z',
});

/**
 * Crea la aplicación con dependencias controladas por la prueba.
 *
 * @param {object} [overrides] Sustituciones parciales de las dependencias.
 * @returns {{app: import('hono').Hono, events: object[]}} Aplicación y log capturado.
 */
const buildApp = (overrides = {}) => {
  const events = [];
  const app = createApp({
    health: healthy,
    requestId: () => 'req-1',
    log: (event) => events.push(event),
    ...overrides,
  });

  return {app, events};
};

test('devuelve 200 con la versión desplegada', async () => {
  const {app} = buildApp();

  const response = await app.request('/health');

  assert.equal(response.status, 200);
  assert.equal((await response.json()).version, 'sha-abc1234');
});

test('devuelve 503 cuando el estado es degradado', async () => {
  const {app} = buildApp({
    health: async () => ({status: 'degraded', version: 'sha-abc1234', db: 'ok', schema: 0,
      checkedAt: '2026-11-23T18:00:00.000Z'}),
  });

  const response = await app.request('/health');

  assert.equal(response.status, 503);
});

test('añade identificador de petición y prohíbe la caché', async () => {
  const {app} = buildApp();

  const response = await app.request('/health');

  assert.equal(response.headers.get('x-request-id'), 'req-1');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('una ruta desconocida responde 404 en problem+json', async () => {
  const {app} = buildApp();

  const response = await app.request('/no-existe');

  assert.equal(response.status, 404);
  assert.equal(response.headers.get('content-type'), 'application/problem+json');
  assert.equal((await response.json()).code, 'NOT_FOUND');
});

test('un error interno no filtra detalles y queda en el log', async () => {
  const {app, events} = buildApp({
    health: async () => {
      throw new Error('SELECT * FROM users WHERE dni_encrypted = ...');
    },
  });

  const response = await app.request('/health');
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.code, 'INTERNAL');
  assert.equal(JSON.stringify(body).includes('users'), false);
  assert.equal(events.some((event) => event.level === 'error'), true);
});

test('registra cada petición con su duración', async () => {
  const {app, events} = buildApp();

  await app.request('/health');

  const entry = events.find((event) => event.path === '/health');
  assert.equal(entry.method, 'GET');
  assert.equal(entry.status, 200);
  assert.equal(typeof entry.durationMs, 'number');
});