import assert from 'node:assert/strict';
import test from 'node:test';

import {Problems} from '../../src/domain/problems.js';

const problems = Problems();

/**
 * The codes of appendix D, plus the two the transport already answers with,
 * and the status each one carries (ADR-021).
 */
const EXPECTED = {
  EVENT_CLOSED: 409,
  GAME_NOT_AVAILABLE: 409,
  LOAN_ALREADY_ACTIVE: 409,
  ADULT_REQUIRED: 409,
  PROFILE_INCOMPLETE: 409,
  QR_INVALID: 400,
  QR_EXPIRED: 410,
  QR_ALREADY_USED: 409,
  GAME_ON_LOAN: 409,
  FORBIDDEN: 403,
  IMPORT_BLOCKED: 409,
  NOT_FOUND: 404,
  INTERNAL: 500,
};

test('the catalogue carries every code of appendix D', () => {
  const fromAppendix = Object.keys(EXPECTED).filter((code) =>
    !['NOT_FOUND', 'INTERNAL'].includes(code));

  for (const code of fromAppendix) {
    assert.equal(problems.isKnown(code), true, `${code} is missing from the catalogue`);
  }
});

for (const [code, status] of Object.entries(EXPECTED)) {
  test(`${code} answers ${status}`, () => {
    assert.equal(problems.statusOf(code), status);
  });
}

test('every code of the catalogue has a status and a unique name', () => {
  const codes = problems.codes();

  assert.deepEqual([...codes].sort(), Object.keys(EXPECTED).sort());
  assert.equal(new Set(codes).size, codes.length);
  for (const code of codes) {
    assert.equal(typeof problems.statusOf(code), 'number');
  }
  assert.equal(problems.statusOf('NOT_A_CODE'), undefined);
});

test('a code that is not in the catalogue has no status, it is not guessed', () => {
  assert.equal(problems.isKnown('INVENTED_CODE'), false);
  assert.equal(problems.isKnown(''), false);
  assert.equal(problems.statusOf('INVENTED_CODE'), undefined);
});

test('the catalogue cannot be modified from outside', () => {
  assert.throws(() => {
    /** @type {any} */ (problems.catalog).EVENT_CLOSED = {status: 200};
  }, TypeError);
  assert.equal(problems.statusOf('EVENT_CLOSED'), 409);
});