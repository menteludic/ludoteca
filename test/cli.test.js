import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const cli = 'src/cli.js';

/**
 * Ejecuta el CLI con un entorno controlado.
 *
 * @param {string[]} args Argumentos del comando.
 * @param {string} databasePath Ruta de la base de datos.
 * @returns {{status: number | null, stdout: string}} Resultado del proceso.
 */
const runCli = (args, databasePath) => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    env: {...process.env, DATABASE_PATH: databasePath, APP_VERSION: 'sha-abc1234', NODE_NO_WARNINGS: '1'},
  });

  return {status: result.status, stdout: result.stdout};
};

test('migrate aplica el esquema y health lo confirma', () => {
  const db = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');

  const migrated = runCli(['migrate'], db);
  assert.equal(migrated.status, 0);
  assert.equal(JSON.parse(migrated.stdout).schema, 1);

  const health = runCli(['health'], db);
  assert.equal(health.status, 0);
  const body = JSON.parse(health.stdout);
  assert.equal(body.status, 'ok');
  assert.equal(body.version, 'sha-abc1234');
});

test('health falla si la base no tiene esquema', () => {
  const db = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');

  const result = runCli(['health'], db);

  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).status, 'degraded');
});

test('un comando desconocido sale con código 2', () => {
  const db = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');

  const result = runCli(['volcar-todo'], db);

  assert.equal(result.status, 2);
  assert.match(result.stdout, /comando desconocido/);
});