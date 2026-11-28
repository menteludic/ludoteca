/**
 * Application start-up. The only place with global effects: it reads the
 * environment, opens the database, wires the modules and serves.
 */

import {readFileSync} from 'node:fs';

import {serve} from '@hono/node-server';

import {Health} from '../app/health.js';
import {App} from '../http/app.js';
import {Problems} from '../domain/problems.js';
import {Problem} from '../http/problem.js';
import {Database} from '../infra/sqlite/database.js';
import {Migrations} from '../infra/sqlite/migrations.js';
import {JsDate} from '../infra/time/js-date.js';

/** The clock and the calendar of the process, captured once and passed down. */
const time = JsDate({Date, Intl});

/**
 * Reads the wall clock as an ISO instant.
 *
 * @returns {string} Current instant.
 */
const clock = () => time.toIso(time.nowMs());

/** Port the container listens on when nothing says otherwise (ADR-019). */
const DEFAULT_PORT = 4000;

const PORT = Number(process.env.PORT ?? DEFAULT_PORT);
const VERSION = process.env.APP_VERSION ?? 'dev';
const DATABASE_PATH = process.env.DATABASE_PATH ?? '/data/ludoteca.db';

/**
 * Reads the interface catalogue once at start-up.
 *
 * @returns {{problems: {titles: Record<string, string>,
 *   details: Record<string, string>}}} Messages.
 */
const readMessages = () => JSON.parse(
  readFileSync(new URL('../web/ui/es.json', import.meta.url), 'utf8'),
);

/**
 * Writes one JSON log line, without personal data.
 *
 * @param {object} event Event fields.
 * @returns {void}
 */
const log = (event) => console.log(JSON.stringify({at: clock(), ...event}));

const messages = readMessages();
const database = Database({path: DATABASE_PATH});
const migrations = Migrations({database, clock});
const health = Health();
const problem = Problem({problems: Problems(), titles: messages.problems.titles});

/**
 * Schema version applied, or 0 when the database has not been migrated yet.
 *
 * @returns {number} Applied version.
 */
const schema = () => {
  try {
    return migrations.version();
  } catch {
    return 0;
  }
};

const {handler} = App({
  clock: time,
  requestId: () => crypto.randomUUID(),
  log,
  messages,
  problem,
  health: async () => health.build({
    version: VERSION,
    dbOk: database.isHealthy(),
    schema: schema(),
    now: clock(),
  }),
});

serve({fetch: handler.fetch, port: PORT, hostname: '0.0.0.0'}, (info) => {
  log({event: 'listening', port: info.port, version: VERSION});
});
