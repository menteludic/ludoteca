import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readdirSync, utimesSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {pruneOldBackups} from '../../src/infra/files/prune.js';

/**
 * Crea un directorio temporal con copias de distintas horas.
 *
 * @param {string[]} names Nombres de fichero.
 * @returns {string} Ruta del directorio.
 */
const makeDir = (names) => {
  const dir = mkdtempSync(join(tmpdir(), 'ludoteca-prune-'));
  names.forEach((name, index) => {
    const file = join(dir, name);
    writeFileSync(file, 'copia');
    const when = new Date(2026, 10, 1 + index, 4, 0, 0);
    utimesSync(file, when, when);
  });

  return dir;
};

test('conserva las copias más recientes y borra el resto', () => {
  const dir = makeDir(['pre-1.db', 'pre-2.db', 'pre-3.db']);

  const removed = pruneOldBackups(dir, 'pre-', '.db', 2);

  assert.deepEqual(removed, ['pre-1.db']);
  assert.deepEqual(readdirSync(dir).sort(), ['pre-2.db', 'pre-3.db']);
});

test('no toca ficheros que no son copias', () => {
  const dir = makeDir(['pre-1.db', 'pre-2.db', 'notas.txt']);

  pruneOldBackups(dir, 'pre-', '.db', 1);

  assert.deepEqual(readdirSync(dir).sort(), ['notas.txt', 'pre-2.db']);
});

test('sin límite válido no borra nada', () => {
  const dir = makeDir(['pre-1.db']);

  const removed = pruneOldBackups(dir, 'pre-', '.db', 0);

  assert.deepEqual(removed, []);
  assert.deepEqual(readdirSync(dir), ['pre-1.db']);
});