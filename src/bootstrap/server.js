/**
 * Arranque de la aplicación. Es el único sitio con efectos globales: lee el
 * entorno, abre la base, monta el servidor y escribe en la salida.
 */

import {serve} from '@hono/node-server';

import {buildHealth} from '../app/health.js';
import {createApp} from '../http/app.js';
import {isDatabaseHealthy, openDatabase} from '../infra/sqlite/database.js';
import {schemaVersion} from '../infra/sqlite/migrations.js';

const PORT = Number(process.env.PORT ?? 4000);
const VERSION = process.env.APP_VERSION ?? 'dev';
const DATABASE_PATH = process.env.DATABASE_PATH ?? '/data/ludoteca.db';

/**
 * Escribe una línea de log en JSON, sin datos personales.
 *
 * @param {object} event Campos del evento.
 * @returns {void}
 */
const log = (event) => console.log(JSON.stringify({at: new Date().toISOString(), ...event}));

const db = openDatabase(DATABASE_PATH);

/**
 * Versión del esquema aplicada, o 0 si todavía no se ha migrado.
 *
 * @returns {number} Versión aplicada.
 */
const schema = () => {
  try {
    return schemaVersion(db);
  } catch {
    return 0;
  }
};

const app = createApp({
  requestId: () => crypto.randomUUID(),
  log,
  health: async () => buildHealth({
    version: VERSION,
    dbOk: isDatabaseHealthy(db),
    schema: schema(),
    now: new Date().toISOString(),
  }),
});

serve({fetch: app.fetch, port: PORT, hostname: '0.0.0.0'}, (info) => {
  log({event: 'listening', port: info.port, version: VERSION});
});