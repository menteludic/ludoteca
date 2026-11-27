import test from 'node:test';
import assert from 'node:assert/strict';

import {App} from '../../src/http/app.js';
import {Problems} from '../../src/domain/problems.js';
import {Problem} from '../../src/http/problem.js';

const messages = {
  problems: {
    titles: {404: 'Not found', 500: 'Internal error'},
    details: {NOT_FOUND: 'Route not found.', INTERNAL: 'Something failed.'},
  },
};

const healthy = async () => ({
  status: 'ok',
  version: 'sha-abc1234',
  db: 'ok',
  schema: 1,
  checkedAt: '2026-11-23T18:00:00.000Z',
});

/**
 * Builds the app with dependencies controlled by the test.
 *
 * @param {object} [overrides] Partial dependency overrides.
 * @returns {{handler: import('hono').Hono, events: object[]}} App and captured log.
 */
const buildApp = (overrides = {}) => {
  const events = [];
  const {handler} = App({
    clock: {nowMs: () => 0},
    health: healthy,
    requestId: () => 'req-1',
    log: (event) => events.push(event),
    problem: Problem({problems: Problems(), titles: messages.problems.titles}),
    messages,
    ...overrides,
  });

  return {handler, events};
};

test('answers 200 with the deployed version', async () => {
  const {handler} = buildApp();

  const response = await handler.request('/health');

  assert.equal(response.status, 200);
  assert.equal((await response.json()).version, 'sha-abc1234');
});

test('answers 503 when the status is degraded', async () => {
  const {handler} = buildApp({
    health: async () => ({status: 'degraded', version: 'sha-abc1234', db: 'ok', schema: 0,
      checkedAt: '2026-11-23T18:00:00.000Z'}),
  });

  const response = await handler.request('/health');

  assert.equal(response.status, 503);
});

test('adds a request identifier and forbids caching', async () => {
  const {handler} = buildApp();

  const response = await handler.request('/health');

  assert.equal(response.headers.get('x-request-id'), 'req-1');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('an unknown route answers 404 as problem+json', async () => {
  const {handler} = buildApp();

  const response = await handler.request('/does-not-exist');

  assert.equal(response.status, 404);
  assert.equal(response.headers.get('content-type'), 'application/problem+json');
  assert.equal((await response.json()).code, 'NOT_FOUND');
});

test('an internal error leaks nothing and reaches the log', async () => {
  const {handler, events} = buildApp({
    health: async () => {
      throw new Error('SELECT * FROM users WHERE dni_encrypted = ...');
    },
  });

  const response = await handler.request('/health');
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.code, 'INTERNAL');
  assert.equal(JSON.stringify(body).includes('users'), false);
  assert.equal(events.some((event) => event.level === 'error'), true);
});

test('logs every request with its duration', async () => {
  const {handler, events} = buildApp();

  await handler.request('/health');

  const entry = events.find((event) => event.path === '/health');
  assert.equal(entry.method, 'GET');
  assert.equal(entry.status, 200);
  assert.equal(typeof entry.durationMs, 'number');
});

