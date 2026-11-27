import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import yaml from 'js-yaml';

import {Problems} from '../../src/domain/problems.js';
import {App} from '../../src/http/app.js';
import {Problem} from '../../src/http/problem.js';

/**
 * The contract as written, so the tests compare it with the running code.
 *
 * @returns {any} Parsed OpenAPI document.
 */
const readSpec = () => yaml.load(readFileSync(new URL('../../openapi.yaml', import.meta.url), 'utf8'));

/**
 * Builds the app with the minimum dependencies the contract needs.
 *
 * @returns {{request: (path: string) => Promise<Response>}} Request entry point.
 */
const buildApp = () => {
  const {handler} = App({
    health: async () => ({
      status: 'ok',
      version: 'sha-abc1234',
      db: 'ok',
      schema: 1,
      checkedAt: '2026-11-25T00:00:00.000Z',
    }),
    requestId: () => 'req-1',
    log: () => {},
    problem: Problem({problems: Problems(), titles: {404: 'No encontrado', 500: 'Error interno'}}),
    messages: {
      problems: {
        titles: {404: 'No encontrado', 500: 'Error interno'},
        details: {NOT_FOUND: 'Esa dirección no existe.', INTERNAL: 'Algo falló.'},
      },
    },
  });

  return {request: (path) => handler.request(path)};
};

test('the contract names its version and its title', () => {
  const spec = readSpec();

  assert.match(String(spec.openapi), /^3\./);
  assert.equal(typeof spec.info.title, 'string');
  assert.equal(typeof spec.info.version, 'string');
});

test('every documented path is served, not answered with the default 404', async () => {
  const spec = readSpec();
  const {request} = buildApp();
  const paths = Object.keys(spec.paths ?? {});

  assert.ok(paths.length > 0, 'the contract documents no path');

  for (const path of paths) {
    const response = await request(path);
    assert.notEqual(response.status, 404, `${path} is documented but the app does not serve it`);
  }
});

test('every operation declares an operationId and at least one response', () => {
  const spec = readSpec();

  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(/** @type {any} */ (item))) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const op = /** @type {any} */ (operation);
      assert.equal(typeof op.operationId, 'string', `${method.toUpperCase()} ${path} has no operationId`);
      assert.ok(Object.keys(op.responses ?? {}).length > 0, `${method.toUpperCase()} ${path} declares no response`);
    }
  }
});

test('every component reference points at a declared component', () => {
  const spec = readSpec();
  const declared = new Set(Object.keys(spec.components?.schemas ?? {}));
  const refs = [...JSON.stringify(spec).matchAll(/#\/components\/schemas\/([A-Za-z0-9_]+)/g)]
    .map((match) => match[1]);

  assert.ok(refs.length > 0, 'the contract references no schema');
  for (const name of refs) {
    assert.ok(declared.has(name), `$ref points at an undeclared schema: ${name}`);
  }
});

test('the contract lists exactly the codes of the catalogue', () => {
  const spec = readSpec();
  const documented = /** @type {string[]} */ (spec.components.schemas.ErrorCode.enum);

  assert.deepEqual([...documented].sort(), Problems().codes().sort());
});
