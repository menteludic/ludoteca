/**
 * Keeps only the newest copies in a directory. It lives at the edge: it reads
 * the disk and deletes files. The file names are decided by the caller
 * (`pre-*.db`, `nightly-*.db`), not by this module.
 */

/**
 * Builds the pruning module.
 *
 * @param {object} config Module configuration.
 * @param {{readdirSync: Function, statSync: Function, unlinkSync: Function}} config.fs File system.
 * @param {(...parts: string[]) => string} config.join Builds a path.
 * @returns {{oldBackups: Function}} Pruning helpers.
 */
const Prune = ({fs, join}) => {
  /**
   * Deletes the copies beyond `keep`, oldest first.
   *
   * @param {string} dir Directory holding the copies.
   * @param {string} prefix Kept file name prefix.
   * @param {string} suffix Kept file name suffix.
   * @param {number} keep How many copies survive. Below 1 nothing is deleted.
   * @returns {string[]} Names of the deleted files.
   */
  const oldBackups = (dir, prefix, suffix, keep) => {
    if (!Number.isInteger(keep) || keep < 1) return [];

    const candidates = /** @type {string[]} */ (fs.readdirSync(dir))
      .filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
      .map((name) => ({name, mtime: fs.statSync(join(dir, name)).mtimeMs}))
      .sort((a, b) => b.mtime - a.mtime);

    const doomed = candidates.slice(keep).map((file) => file.name);
    for (const name of doomed) fs.unlinkSync(join(dir, name));

    return doomed;
  };

  return Object.freeze({oldBackups});
};

export {Prune};
