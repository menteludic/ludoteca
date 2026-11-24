import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readdirSync, utimesSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import * as fs from 'node:fs';

import {Prune} from '../../src/infra/files/prune.js';

const prune = Prune({fs, join});

/**
 * Creates a temporary directory with copies from different days.
 *
 * @param {string[]} names File names.
 * @returns {string} Directory path.
 */
const makeDir = (names) => {
  const dir = mkdtempSync(join(tmpdir(), 'ludoteca-prune-'));
  names.forEach((name, index) => {
    const file = join(dir, name);
    writeFileSync(file, 'copy');
    const when = new Date(2026, 10, 1 + index, 4, 0, 0);
    utimesSync(file, when, when);
  });

  return dir;
};

test('keeps the newest copies and deletes the rest', () => {
  const dir = makeDir(['pre-1.db', 'pre-2.db', 'pre-3.db']);

  const removed = prune.oldBackups(dir, 'pre-', '.db', 2);

  assert.deepEqual(removed, ['pre-1.db']);
  assert.deepEqual(readdirSync(dir).sort(), ['pre-2.db', 'pre-3.db']);
});

test('leaves files that are not copies alone', () => {
  const dir = makeDir(['pre-1.db', 'pre-2.db', 'notes.txt']);

  prune.oldBackups(dir, 'pre-', '.db', 1);

  assert.deepEqual(readdirSync(dir).sort(), ['notes.txt', 'pre-2.db']);
});

test('deletes nothing without a valid limit', () => {
  const dir = makeDir(['pre-1.db']);

  const removed = prune.oldBackups(dir, 'pre-', '.db', 0);

  assert.deepEqual(removed, []);
  assert.deepEqual(readdirSync(dir), ['pre-1.db']);
});
