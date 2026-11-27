import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {Problems} from '../../src/domain/problems.js';

const messages = JSON.parse(readFileSync(new URL('../../src/web/ui/es.json', import.meta.url), 'utf8'));
const problems = Problems();

test('every code of the catalogue has a sentence for the person', () => {
  for (const code of problems.codes()) {
    const detail = messages.problems.details[code];

    assert.equal(typeof detail, 'string', `${code} has no detail in es.json`);
    assert.ok(detail.length > 3, `${code} has a useless detail`);
  }
});

test('every status the catalogue can answer with has a title', () => {
  for (const code of problems.codes()) {
    const status = problems.statusOf(code);

    assert.equal(typeof messages.problems.titles[String(status)], 'string',
      `status ${status} (${code}) has no title in es.json`);
  }
});

test('no detail is left behind without a code that uses it', () => {
  for (const code of Object.keys(messages.problems.details)) {
    assert.equal(problems.isKnown(code), true, `${code} has a detail but no code in the catalogue`);
  }
});