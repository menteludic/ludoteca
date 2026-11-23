#!/usr/bin/env node
/**
 * Comandos de mantenimiento que ejecuta el despliegue y el cron del host.
 * Es borde: lee el entorno, abre la base y escribe en la salida.
 *
 *   node src/cli.js health
 *   node src/cli.js migrate
 *   node src/cli.js backup --to /data/backups/pre-sha.db [--keep 5]
 */

import {dirname, basename} from 'node:path';

import {buildHealth} from './app/health.js';
import {backupDatabase, isDatabaseHealthy, openDatabase} from './infra/sqlite/database.js';
import {pruneOldBackups} from './infra/files/prune.js';
import {applyMigrations, schemaVersion} from './infra/sqlite/migrations.js';

/**
 * Escribe una línea de log en JSON.
 *
 * @param {object} event Campos del evento.
 * @returns {void}
 */
const log = (event) => console.log(JSON.stringify(event));
const databasePath = process.env.DATABASE_PATH ?? '/data/ludoteca.db';
const version = process.env.APP_VERSION ?? 'dev';

/**
 * Lee una opción con valor de la línea de comandos.
 *
 * @param {string[]} args Argumentos restantes.
 * @param {string} flag Nombre de la opción, con guiones (`--to`).
 * @returns {string | undefined} Valor encontrado.
 */
const option = (args, flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};

/**
 * Versión del esquema aplicada, o 0 si la tabla de control no existe todavía.
 *
 * @param {import('node:sqlite').DatabaseSync} db Base abierta.
 * @returns {number} Versión aplicada.
 */
const safeSchemaVersion = (db) => {
  try {
    return schemaVersion(db);
  } catch {
    return 0;
  }
};

/**
 * Devuelve el estado del servicio y el código de salida que espera el healthcheck.
 *
 * @returns {number} 0 si el servicio está listo, 1 si no.
 */
const health = () => {
  const db = openDatabase(databasePath);
  const dbOk = isDatabaseHealthy(db);
  const body = buildHealth({
    version,
    dbOk,
    schema: dbOk ? safeSchemaVersion(db) : 0,
    now: new Date().toISOString(),
  });

  log(body);
  db.close();

  return body.status === 'ok' ? 0 : 1;
};

/**
 * Aplica las migraciones pendientes e informa de cuántas han entrado.
 *
 * @returns {number} Código de salida.
 */
const migrate = () => {
  const db = openDatabase(databasePath);
  const result = applyMigrations(db, new Date().toISOString());
  log({command: 'migrate', applied: result.applied, schema: result.version});
  db.close();

  return 0;
};

/**
 * Copia la base con `VACUUM INTO` y, si se pide, recorta las copias antiguas.
 *
 * @param {string[]} args Argumentos restantes de `backup`.
 * @returns {number} Código de salida.
 */
const backup = (args) => {
  const target = option(args, '--to');
  const keep = Number.parseInt(option(args, '--keep') ?? '', 10);

  if (target === undefined) {
    log({command: 'backup', error: 'falta --to'});
    return 2;
  }

  const db = openDatabase(databasePath);
  backupDatabase(db, target);
  db.close();

  const removed = Number.isNaN(keep)
    ? []
    : pruneOldBackups(dirname(target), 'pre-', '.db', keep);
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
  log({error: `comando desconocido: ${command}`, commands: Object.keys(COMMANDS)});
  process.exit(2);
}

process.exit(run(args));