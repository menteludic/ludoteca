import test from 'node:test';
import assert from 'node:assert/strict';

import {fail, isFail, isOk, ok} from '../../src/domain/result.js';

test('ok envuelve un valor sin perderlo', () => {
  const result = ok({id: 'g1'});

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {id: 'g1'});
});

test('fail guarda el código y el mensaje para la interfaz', () => {
  const result = fail('GAME_NOT_AVAILABLE', 'El juego está prestado');

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'GAME_NOT_AVAILABLE');
  assert.equal(result.error.message, 'El juego está prestado');
});

test('isOk e isFail distinguen los dos casos', () => {
  assert.equal(isOk(ok(1)), true);
  assert.equal(isFail(ok(1)), false);
  assert.equal(isOk(fail('E', 'm')), false);
  assert.equal(isFail(fail('E', 'm')), true);
});

test('un fallo no lanza: se puede inspeccionar sin try/catch', () => {
  const result = fail('EVENT_CLOSED', 'Ahora no se pueden coger juegos');

  assert.equal(result.error.code, 'EVENT_CLOSED');
  assert.equal('value' in result, false);
});