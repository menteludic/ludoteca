import test from 'node:test';
import assert from 'node:assert/strict';

import {Problem} from '../../src/http/problem.js';

const problem = Problem({baseUrl: 'https://example.test/problems/', titles: {404: 'Not found'}});

test('builds an RFC 9457 body with the catalogue title', () => {
  const body = problem.build(404, 'GAME_NOT_FOUND', 'No such game.');

  assert.deepEqual(body, {
    type: 'https://example.test/problems/game_not_found',
    title: 'Not found',
    status: 404,
    code: 'GAME_NOT_FOUND',
    detail: 'No such game.',
  });
});

test('falls back to a generic title for an unknown status', () => {
  assert.equal(problem.build(418, 'TEAPOT', 'x').title, 'Error');
});

test('uses the default base when none is configured', () => {
  assert.match(Problem().build(500, 'INTERNAL', 'x').type, /ludoteca\.example/);
});
