import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

const cli = 'src/cli.js';

/**
 * Runs the CLI with a controlled environment.
 *
 * @param {string[]} args Command arguments.
 * @param {string} databasePath Database file path.
 * @returns {{status: number | null, stdout: string}} Process result.
 */
const runCli = (args, databasePath) => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    env: {...process.env, DATABASE_PATH: databasePath, APP_VERSION: 'sha-abc1234', NODE_NO_WARNINGS: '1'},
  });

  return {status: result.status, stdout: result.stdout};
};

test('migrate applies the schema and health confirms it', () => {
  const database = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');

  const migrated = runCli(['migrate'], database);
  assert.equal(migrated.status, 0);
  assert.equal(JSON.parse(migrated.stdout).schema, 1);

  const health = runCli(['health'], database);
  assert.equal(health.status, 0);
  const body = JSON.parse(health.stdout);
  assert.equal(body.status, 'ok');
  assert.equal(body.version, 'sha-abc1234');
});

test('health fails when the database has no schema', () => {
  const database = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');

  const result = runCli(['health'], database);

  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).status, 'degraded');
});

test('an unknown command exits with code 2', () => {
  const database = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');

  const result = runCli(['dump-everything'], database);

  assert.equal(result.status, 2);
  assert.match(result.stdout, /unknown command/);
});

test('backup without --to exits with code 2', () => {
  const database = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');
  runCli(['migrate'], database);

  const result = runCli(['backup'], database);

  assert.equal(result.status, 2);
  assert.match(result.stdout, /missing --to/);
});
