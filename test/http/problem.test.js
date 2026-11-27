import test from 'node:test';
import assert from 'node:assert/strict';

import {Problems} from '../../src/domain/problems.js';
import {Problem} from '../../src/http/problem.js';

const problems = Problems();
const problem = Problem({
  problems,
  baseUrl: 'https://example.test/problems/',
  titles: {403: 'Forbidden', 404: 'Not found', 409: 'Conflict'},
});

test('builds an RFC 9457 body with the catalogue title', () => {
  const body = problem.build('NOT_FOUND', 'No such game.');

  assert.deepEqual(body, {
    type: 'https://example.test/problems/not_found',
    title: 'Not found',
    status: 404,
    code: 'NOT_FOUND',
    detail: 'No such game.',
  });
});

test('the status comes from the catalogue, never from the caller', () => {
  assert.equal(problem.build('EVENT_CLOSED', 'El evento está cerrado.').status, 409);
  assert.equal(problem.build('EVENT_CLOSED', 'x').title, 'Conflict');
  assert.equal(problem.build('FORBIDDEN', 'x').status, 403);
});

test('falls back to a generic title for a status without one', () => {
  assert.equal(problem.build('QR_EXPIRED', 'x').title, 'Error');
});

test('a code outside the catalogue is refused', () => {
  assert.throws(() => problem.build('TEAPOT', 'x'), /unknown error code/);
});

test('a module without the catalogue fails when it is built', () => {
  assert.throws(() => Problem(/** @type {any} */ ({})), /catalogue/);
});

test('uses the default base when none is configured', () => {
  const fallback = Problem({problems, titles: {500: 'Internal'}});

  assert.match(fallback.build('INTERNAL', 'x').type, /ludoteca\.example/);
});