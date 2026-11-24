import test from 'node:test';
import assert from 'node:assert/strict';

import {Result} from '../../src/domain/result.js';

const result = Result();

test('ok wraps the value and reports success', () => {
  const out = result.ok(42);

  assert.deepEqual(out, {ok: true, value: 42});
  assert.equal(result.isOk(out), true);
  assert.equal(result.isFail(out), false);
});

test('fail carries a stable code and its parameters', () => {
  const out = result.fail('GAME_NOT_AVAILABLE', {gameId: 'g1'});

  assert.deepEqual(out, {ok: false, error: {code: 'GAME_NOT_AVAILABLE', params: {gameId: 'g1'}}});
  assert.equal(result.isFail(out), true);
  assert.equal(result.isOk(out), false);
});

test('fail without parameters still produces an object', () => {
  assert.deepEqual(result.fail('EVENT_CLOSED').error.params, {});
});

test('unwrapOr returns the value or the fallback', () => {
  assert.equal(result.unwrapOr('none', result.ok('value')), 'value');
  assert.equal(result.unwrapOr('none', result.fail('X')), 'none');
});

test('unwrapOr is curried, so it can be applied in two steps', () => {
  const orNone = result.unwrapOr('none');

  assert.equal(typeof orNone, 'function');
  assert.equal(orNone(result.ok('value')), 'value');
  assert.equal(orNone(result.fail('X')), 'none');
  assert.deepEqual([result.ok(1), result.fail('X')].map(orNone), [1, 'none']);
});

test('the module is frozen so nobody swaps its functions', () => {
  assert.equal(Object.isFrozen(result), true);
});
