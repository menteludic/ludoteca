#!/usr/bin/env node
/**
 * Maintenance commands run by the deployment and by the host cron. This is the
 * edge: it reads the environment, opens the database and prints the outcome.
 *
 *   node src/cli.js health
 *   node src/cli.js migrate
 *   node src/cli.js backup --to /data/backups/pre-<sha>.db [--keep 5]
 */

import {existsSync, readdirSync, statSync, unlinkSync} from 'node:fs';
import {basename, dirname, join} from 'node:path';

import {Health} from './app/health.js';
import {Prune} from './infra/files/prune.js';
import {Database} from './infra/sqlite/database.js';
import {Migrations} from './infra/sqlite/migrations.js';

const {DATABASE_PATH = '/data/ludoteca.db', APP_VERSION = 'dev'} = process.env;

/**
 * Writes one JSON log line.
 *
 * @param {object} event Event fields.
 * @returns {void}
 */
const log = (event) => console.log(JSON.stringify(event));

/**
 * Reads an option with a value from the command line.
 *
 * @param {string[]} args Remaining arguments.
 * @param {string} flag Option name, dashes included (`--to`).
 * @returns {string | undefined} Found value.
 */
const option = (args, flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};

/**
 * Reports the service status and the exit code the healthcheck expects.
 *
 * @returns {number} 0 when the service is ready, 1 otherwise.
 */
const health = () => {
  const database = Database({path: DATABASE_PATH});
  const migrations = Migrations({database});
  const dbOk = database.isHealthy();
  let schema = 0;

  if (dbOk) {
    try {
      schema = migrations.version();
    } catch {
      schema = 0;
    }
  }

  const body = Health().build({
    version: APP_VERSION,
    dbOk,
    schema,
    now: new Date().toISOString(),
  });

  log(body);
  database.close();

  return body.status === 'ok' ? 0 : 1;
};

/**
 * Applies the pending migrations and reports how many went in.
 *
 * @returns {number} Exit code.
 */
const migrate = () => {
  const database = Database({path: DATABASE_PATH});
  const result = Migrations({database}).apply();

  log({command: 'migrate', applied: result.applied, schema: result.version});
  database.close();

  return 0;
};

/**
 * Copies the database with `VACUUM INTO` and trims the old copies.
 *
 * @param {string[]} args Remaining `backup` arguments.
 * @returns {number} Exit code.
 */
const backup = (args) => {
  const target = option(args, '--to');
  const keep = Number.parseInt(option(args, '--keep') ?? '', 10);

  if (target === undefined) {
    log({command: 'backup', error: 'missing --to'});
    return 2;
  }

  // `VACUUM INTO` refuses to overwrite, so a second deploy of the same tag
  // would die here. The copy belongs to that very tag: removing it first
  // keeps the command repeatable without touching other versions.
  if (existsSync(target)) unlinkSync(target);

  const database = Database({path: DATABASE_PATH});
  database.backup(target);
  database.close();

  const removed = Number.isNaN(keep) ? [] : Prune({fs: {readdirSync, statSync, unlinkSync}, join})
    .oldBackups(dirname(target), 'pre-', '.db', keep);

  log({command: 'backup', to: basename(target), pruned: removed.length});

  return 0;
};

/** @type {Record<string, (args: string[]) => number>} */
const COMMANDS = {
  health: () => health(),
  migrate: () => migrate(),
  backup: (args) => backup(args),
};

const [command = '', ...args] = process.argv.slice(2);
const run = COMMANDS[command];

if (run === undefined) {
  log({error: `unknown command: ${command}`, commands: Object.keys(COMMANDS)});
  process.exit(2);
}

process.exit(run(args));
