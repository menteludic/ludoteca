import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {Database} from '../src/infra/sqlite/database.js';
import {Passwords} from '../src/infra/auth/passwords.js';
import {randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';

const cli = 'src/cli.js';

/**
 * Runs the CLI with a controlled environment.
 *
 * @param {string[]} args Command arguments.
 * @param {string} databasePath Database file path.
 * @param {string} [input] Text handed to the process on stdin.
 * @returns {{status: number | null, stdout: string}} Process result.
 */
const runCli = (args, databasePath, input) => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    input,
    env: {...process.env, DATABASE_PATH: databasePath, APP_VERSION: 'sha-abc1234', NODE_NO_WARNINGS: '1'},
  });

  return {status: result.status, stdout: result.stdout};
};

/**
 * Reads the account row and its roles from the database.
 *
 * @param {string} databasePath Database file path.
 * @param {string} email Account email.
 * @returns {{passwordHash: string | null, roles: string[]}} Stored account.
 */
const readAccount = (databasePath, email) => {
  const database = Database({path: databasePath});
  const row = /** @type {{id: string, password_hash: string | null} | undefined} */ (
    database.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email));
  const roles = /** @type {string[]} */ (database
    .prepare('SELECT role FROM user_roles WHERE user_id = ? ORDER BY role')
    .all(row?.id).map((/** @type {{role: string}} */ r) => r.role));
  database.close();

  return {passwordHash: row?.password_hash ?? null, roles};
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

test('backup can run twice over the same destination', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ludoteca-cli-'));
  const database = join(dir, 'ludoteca.db');
  const target = join(dir, 'pre-sha.db');
  runCli(['migrate'], database);

  const first = runCli(['backup', '--to', target], database);
  const second = runCli(['backup', '--to', target], database);

  assert.equal(first.status, 0);
  assert.equal(second.status, 0);
  assert.equal(existsSync(target), true);
});

test('backup without --to exits with code 2', () => {
  const database = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');
  runCli(['migrate'], database);

  const result = runCli(['backup'], database);

  assert.equal(result.status, 2);
  assert.match(result.stdout, /missing --to/);
});

test('create-admin leaves an account that can sign in as app admin', () => {
  const database = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');
  runCli(['migrate'], database);

  const result = runCli([
    'create-admin', '--email', 'ana@example.org', '--first-name', 'Ana',
    '--password', 'una frase larga de verdad',
  ], database);

  assert.equal(result.status, 0);
  const body = JSON.parse(result.stdout);
  assert.equal(body.command, 'create-admin');
  assert.equal(body.email, 'ana@example.org');
  assert.deepEqual(body.roles, ['app_admin']);

  const account = readAccount(database, 'ana@example.org');
  assert.deepEqual(account.roles, ['app_admin']);
  const passwords = Passwords({crypto: {scryptSync, randomBytes, timingSafeEqual}});
  assert.equal(passwords.verify('una frase larga de verdad', account.passwordHash ?? ''), true);
});

test('create-admin reads the password from stdin when it is not on the command line', () => {
  const database = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');
  runCli(['migrate'], database);

  const result = runCli(['create-admin', '--email', 'bea@example.org', '--first-name', 'Bea'],
    database, 'otra frase larga\n');

  assert.equal(result.status, 0);
  const account = readAccount(database, 'bea@example.org');
  const passwords = Passwords({crypto: {scryptSync, randomBytes, timingSafeEqual}});
  assert.equal(passwords.verify('otra frase larga', account.passwordHash ?? ''), true);
});

test('create-admin refuses the same email twice', () => {
  const database = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');
  runCli(['migrate'], database);
  const args = ['create-admin', '--email', 'ana@example.org', '--first-name', 'Ana',
    '--password', 'una frase larga de verdad'];
  assert.equal(runCli(args, database).status, 0);

  const again = runCli(args, database);

  assert.equal(again.status, 2);
  assert.equal(JSON.parse(again.stdout).error, 'email already taken');
});

test('create-admin refuses a short password and a missing email', () => {
  const database = join(mkdtempSync(join(tmpdir(), 'ludoteca-cli-')), 'ludoteca.db');
  runCli(['migrate'], database);

  const short = runCli(['create-admin', '--email', 'ana@example.org', '--first-name', 'Ana',
    '--password', 'corta'], database);
  assert.equal(short.status, 2);
  assert.equal(JSON.parse(short.stdout).error, 'password too short');

  const noEmail = runCli(['create-admin', '--first-name', 'Ana',
    '--password', 'una frase larga de verdad'], database);
  assert.equal(noEmail.status, 2);
  assert.equal(JSON.parse(noEmail.stdout).error, 'missing --email');
});
