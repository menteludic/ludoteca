import assert from 'node:assert/strict';
import test from 'node:test';

import {GameState} from '../../src/domain/game-state.js';

const {calculate, states} = GameState();

test('a game with nothing against it is available', () => {
  assert.equal(calculate({}), states.AVAILABLE);
});

test('a game that left the catalogue is retired', () => {
  assert.equal(calculate({retired: true}), states.RETIRED);
});

test('a game an administrator holds back is blocked', () => {
  assert.equal(calculate({blocked: true}), states.BLOCKED);
});

test('a game an administrator marked as lent is on loan, without a loan row', () => {
  assert.equal(calculate({manuallyLent: true}), states.ON_LOAN);
});

test('a game with a live loan is on loan', () => {
  assert.equal(calculate({hasActiveLoan: true}), states.ON_LOAN);
});

test('retired wins over everything: a retired game is never offered', () => {
  assert.equal(calculate({retired: true, hasActiveLoan: true}), states.RETIRED);
  assert.equal(calculate({retired: true, blocked: true}), states.RETIRED);
  const allFour = {retired: true, blocked: true, manuallyLent: true, hasActiveLoan: true};

  assert.equal(calculate(allFour), states.RETIRED);
});

test('on loan wins over blocked', () => {
  assert.equal(calculate({hasActiveLoan: true, blocked: true}), states.ON_LOAN);
  assert.equal(calculate({manuallyLent: true, blocked: true}), states.ON_LOAN);
});

test('the four states are the four names of section 4.2, and nothing else', () => {
  assert.deepEqual(
    [states.RETIRED, states.ON_LOAN, states.BLOCKED, states.AVAILABLE],
    ['retired', 'on_loan', 'blocked', 'available'],
  );
});

test('the state is calculated, never stored: two calls do not remember each other', () => {
  assert.equal(calculate({blocked: true}), states.BLOCKED);
  assert.equal(calculate({}), states.AVAILABLE);
});

test('the input object is not modified', () => {
  const game = Object.freeze({
    retired: false, blocked: true, manuallyLent: false, hasActiveLoan: false,
  });

  assert.equal(calculate(game), states.BLOCKED);
});

test('the module and its states cannot be swapped from outside', () => {
  assert.throws(() => {
    /** @type {any} */ (states).AVAILABLE = 'disponible';
  }, TypeError);
  assert.equal(states.AVAILABLE, 'available');
});