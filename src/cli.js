#!/usr/bin/env node
/**
 * Maintenance commands run by the deployment and by the host cron. This is the
 * edge: it reads the environment, opens the database and prints the outcome.
 *
 *   node src/cli.js health
 *   node src/cli.js migrate
 *   node src/cli.js backup --to /data/backups/pre-<sha>.db [--keep 5]
 *   node src/cli.js create-admin --email <email> --first-name <name>
 *     [--last-name <surname>] [--password <password>]
 */

import {randomBytes, randomUUID, scryptSync, timingSafeEqual} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync, unlinkSync} from 'node:fs';
import {basename, dirname, join} from 'node:path';

import {Health} from './app/health.js';
import {Passwords} from './infra/auth/passwords.js';
import {Prune} from './infra/files/prune.js';
import {Database} from './infra/sqlite/database.js';
import {Migrations} from './infra/sqlite/migrations.js';
import {JsDate} from './infra/time/js-date.js';

const {DATABASE_PATH = '/data/ludoteca.db', APP_VERSION = 'dev'} = process.env;

/** Exit code of a command that did its job. */
const EXIT_OK = 0;
/** Exit code of a command that found the system unhealthy. */
const EXIT_FAILED = 1;
/** Exit code of a command called with the wrong arguments. */
const EXIT_USAGE = 2;
/** Node puts the first own argument after the executable and the script. */
const ARGV_OFFSET = 2;

/** The clock and the calendar of the process, captured here and passed down. */
const time = JsDate({Date, Intl});

/**
 * Reads the wall clock as an ISO instant.
 *
 * @returns {string} Current instant.
 */
const clock = () => time.toIso(time.nowMs());

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
  const migrations = Migrations({database, clock});
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
    now: clock(),
  });

  log(body);
  database.close();

  return body.status === 'ok' ? EXIT_OK : EXIT_FAILED;
};

/**
 * Applies the pending migrations and reports how many went in.
 *
 * @returns {number} Exit code.
 */
const migrate = () => {
  const database = Database({path: DATABASE_PATH});
  const result = Migrations({database, clock}).apply();

  log({command: 'migrate', applied: result.applied, schema: result.version});
  database.close();

  return EXIT_OK;
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
    return EXIT_USAGE;
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

  return EXIT_OK;
};

/**
 * Minimum length of a password (SEC-01).
 */
const MIN_PASSWORD_LENGTH = 12;

/**
 * Prints the outcome of a failed command and returns its exit code.
 *
 * @param {string} error Stable reason, never a sentence.
 * @returns {number} Exit code 2.
 */
const refuse = (error) => {
  log({command: 'create-admin', error});
  return EXIT_USAGE;
};

/**
 * Creates the first administrator account.
 *
 * The password never travels on the command line by default: it is read from
 * stdin, so it does not stay in the shell history or in the process list.
 *
 * @param {string[]} args Remaining `create-admin` arguments.
 * @returns {number} Exit code.
 */
const createAdmin = (args) => {
  const email = option(args, '--email')?.trim().toLowerCase();
  const firstName = option(args, '--first-name')?.trim();
  const lastName = option(args, '--last-name')?.trim();
  const inline = option(args, '--password');

  if (email === undefined || email === '') return refuse('missing --email');
  if (!email.includes('@')) return refuse('invalid --email');
  if (firstName === undefined || firstName === '') return refuse('missing --first-name');

  const password = (inline ?? readFileSync(0, 'utf8')).trim();
  if (password.length < MIN_PASSWORD_LENGTH) return refuse('password too short');

  const database = Database({path: DATABASE_PATH});

  if (database.prepare('SELECT 1 AS ok FROM users WHERE email = ?').get(email) !== undefined) {
    database.close();
    return refuse('email already taken');
  }

  const id = randomUUID();
  const hash = Passwords({crypto: {scryptSync, randomBytes, timingSafeEqual}}).hash(password);
  const now = clock();

  database.prepare(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, email, hash, firstName, lastName ?? null, now);
  database.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)').run(id, 'app_admin');
  database.close();

  log({command: 'create-admin', email, roles: ['app_admin']});

  return EXIT_OK;
};

/** @type {Record<string, (args: string[]) => number>} */
const COMMANDS = {
  health: () => health(),
  migrate: () => migrate(),
  backup: (args) => backup(args),
  'create-admin': (args) => createAdmin(args),
};

const [command = '', ...args] = process.argv.slice(ARGV_OFFSET);
const run = COMMANDS[command];

if (run === undefined) {
  log({error: `unknown command: ${command}`, commands: Object.keys(COMMANDS)});
  process.exit(EXIT_USAGE);
}

process.exit(run(args));
