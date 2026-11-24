import test from 'node:test';
import assert from 'node:assert/strict';

import {Health} from '../../src/app/health.js';

const now = '2026-11-23T18:00:00.000Z';
const health = Health();

test('is ready when the database answers and the schema is applied', () => {
  const body = health.build({version: 'sha-abc1234', dbOk: true, schema: 1, now});

  assert.deepEqual(body, {
    status: 'ok',
    version: 'sha-abc1234',
    db: 'ok',
    schema: 1,
    checkedAt: now,
  });
});

test('is degraded when the database does not answer', () => {
  const body = health.build({version: 'sha-abc1234', dbOk: false, schema: 1, now});

  assert.equal(body.status, 'degraded');
  assert.equal(body.db, 'unavailable');
});

test('is degraded when the database answers but the schema is missing', () => {
  const body = health.build({version: 'sha-abc1234', dbOk: true, schema: 0, now});

  assert.equal(body.status, 'degraded');
  assert.equal(body.db, 'ok');
});
