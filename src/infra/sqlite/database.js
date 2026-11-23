import {DatabaseSync} from 'node:sqlite';

/**
 * Abre la base de datos con los PRAGMA que necesita la aplicación: WAL para que
 * las lecturas no esperen a la escritura, claves foráneas activas y espera
 * cuando otra escritura tiene el bloqueo.
 *
 * @param {string} path Ruta del fichero (`:memory:` en las pruebas).
 * @returns {DatabaseSync} Base abierta.
 */
export const openDatabase = (path) => {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');

  return db;
};

/**
 * Comprueba que la base responde a una consulta trivial.
 *
 * @param {DatabaseSync} db Base abierta.
 * @returns {boolean} `true` si la consulta devuelve una fila.
 */
export const isDatabaseHealthy = (db) => {
  try {
    const row = /** @type {{ok: number} | undefined} */ (db.prepare('SELECT 1 AS ok').get());
    return row?.ok === 1;
  } catch {
    return false;
  }
};

/**
 * Copia la base a otro fichero con `VACUUM INTO`. El destino lo elige el borde;
 * aquí solo se comprueba que la ruta no venga vacía.
 *
 * @param {DatabaseSync} db Base abierta.
 * @param {string} target Ruta del fichero de destino.
 * @returns {void}
 */
export const backupDatabase = (db, target) => {
  if (typeof target !== 'string' || target.trim() === '') {
    throw new Error('La ruta de la copia está vacía');
  }

  db.prepare('VACUUM INTO ?').run(target);
};