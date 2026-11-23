import {readdirSync, statSync, unlinkSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Deja solo las `keep` copias más recientes de un directorio.
 *
 * Vive en el borde: lee el disco y borra ficheros. El nombre de los ficheros lo
 * decide quien llama (`pre-*.db`, `nightly-*.db`), no esta función.
 *
 * @param {string} dir Directorio donde están las copias.
 * @param {string} prefix Prefijo del nombre de fichero que se conserva.
 * @param {string} suffix Sufijo del nombre de fichero que se conserva.
 * @param {number} keep Cuántas copias se conservan. Si es menor que 1, no se borra nada.
 * @returns {string[]} Nombres de los ficheros borrados.
 */
export const pruneOldBackups = (dir, prefix, suffix, keep) => {
  if (!Number.isInteger(keep) || keep < 1) return [];

  const candidates = readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
    .map((name) => ({name, mtime: statSync(join(dir, name)).mtimeMs}))
    .sort((a, b) => b.mtime - a.mtime);

  const doomed = candidates.slice(keep).map((file) => file.name);
  for (const name of doomed) unlinkSync(join(dir, name));

  return doomed;
};