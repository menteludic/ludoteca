import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {Database} from '../../src/infra/sqlite/database.js';
import {Migrations} from '../../src/infra/sqlite/migrations.js';

const now = '2026-11-23T18:00:00.000Z';

/**
 * Temporary directory for the database file.
 *
 * @returns {string} Directory path.
 */
const tempDir = () => mkdtempSync(join(tmpdir(), 'ludoteca-db-'));

test('the database answers with the pragmas applied', () => {
  const database = Database({path: join(tempDir(), 'test.db')});

  assert.equal(database.isHealthy(), true);
  assert.equal(database.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  database.close();
});

test('the backup leaves a file with the schema inside', () => {
  const dir = tempDir();
  const database = Database({path: join(dir, 'ludoteca.db')});
  Migrations({database, clock: () => now}).apply();
  const target = join(dir, 'pre-abc1234.db');

  database.backup(target);

  assert.equal(existsSync(target), true);
  const copy = Database({path: target});
  const tables = copy.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
  assert.equal(tables.some((/** @type {{name: string}} */ row) => row.name === 'loans'), true);
  copy.close();
});

test('it refuses an empty backup path', () => {
  const database = Database({path: join(tempDir(), 'test.db')});

  assert.throws(() => database.backup('  '), /empty/);
  database.close();
});
