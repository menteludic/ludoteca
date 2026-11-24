/**
 * SQLite at the edge. The handle stays inside the closure: callers get the
 * operations they need and never the driver itself, so pragmas and errors are
 * decided in one place.
 */

import {DatabaseSync} from 'node:sqlite';

/**
 * Opens a database with the pragmas the application needs: WAL so reads do not
 * wait for a write, foreign keys on, and a wait when another write holds the lock.
 *
 * @param {object} config Module configuration.
 * @param {string} config.path File path (`:memory:` in tests).
 * @returns {{exec: Function, prepare: Function, isHealthy: Function,
 *   backup: Function, close: Function}} Database operations.
 */
const Database = ({path}) => {
  const handle = new DatabaseSync(path);
  handle.exec('PRAGMA journal_mode = WAL');
  handle.exec('PRAGMA foreign_keys = ON');
  handle.exec('PRAGMA busy_timeout = 5000');

  /**
   * Runs one or more statements.
   *
   * @param {string} sql Statement or statements to run.
   * @returns {void}
   */
  const exec = (sql) => handle.exec(sql);

  /**
   * Prepares a statement.
   *
   * @param {string} sql Statement to prepare.
   * @returns {import('node:sqlite').StatementSync} Prepared statement.
   */
  const prepare = (sql) => handle.prepare(sql);

  /**
   * Checks that the database answers a trivial query.
   *
   * @returns {boolean} True when the query returns a row.
   */
  const isHealthy = () => {
    try {
      const row = /** @type {{ok: number} | undefined} */ (handle.prepare('SELECT 1 AS ok').get());
      return row?.ok === 1;
    } catch {
      return false;
    }
  };

  /**
   * Copies the database to another file with `VACUUM INTO`. The target is
   * chosen by the edge; here only an empty path is refused.
   *
   * @param {string} target Destination file path.
   * @returns {void}
   */
  const backup = (target) => {
    if (typeof target !== 'string' || target.trim() === '') {
      throw new Error('backup target path is empty');
    }

    handle.prepare('VACUUM INTO ?').run(target);
  };

  /**
   * Closes the handle.
   *
   * @returns {void}
   */
  const close = () => handle.close();

  return Object.freeze({exec, prepare, isHealthy, backup, close});
};

export {Database};
