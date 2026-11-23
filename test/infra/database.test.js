import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {backupDatabase, isDatabaseHealthy, openDatabase} from '../../src/infra/sqlite/database.js';
import {applyMigrations} from '../../src/infra/sqlite/migrations.js';

const now = '2026-11-23T18:00:00.000Z';

/**
 * Directorio temporal para el fichero de base de datos.
 *
 * @returns {string} Ruta del directorio.
 */
const tempDir = () => mkdtempSync(join(tmpdir(), 'ludoteca-db-'));

test('la base responde con los PRAGMA aplicados', () => {
  const db = openDatabase(join(tempDir(), 'test.db'));

  assert.equal(isDatabaseHealthy(db), true);
  assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
});

test('la copia deja un fichero con el esquema dentro', () => {
  const dir = tempDir();
  const db = openDatabase(join(dir, 'ludoteca.db'));
  applyMigrations(db, now);
  const target = join(dir, 'pre-abc1234.db');

  backupDatabase(db, target);

  assert.equal(existsSync(target), true);
  const copy = openDatabase(target);
  const tables = copy.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
  assert.equal(tables.some((row) => row.name === 'loans'), true);
});

test('rechaza una ruta de copia vacía', () => {
  const db = openDatabase(join(tempDir(), 'test.db'));

  assert.throws(() => backupDatabase(db, '  '), /vacía/);
});