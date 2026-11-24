/**
 * Service status for `/health`. It is what the deployment compares: if it does
 * not report the SHA that was just published, the deployment failed.
 *
 * Pure function: both the instant and the database verdict arrive as data.
 */

/**
 * Builds the health module. No configuration today.
 *
 * @returns {{build: Function}} Health helpers.
 */
const Health = () => {
  /**
   * Builds the body served by `/health`.
   *
   * @param {{version: string, dbOk: boolean, schema: number, now: string}} input
   *   Deployed version, whether the database answers, applied schema and an ISO instant.
   * @returns {{status: 'ok' | 'degraded', version: string, db: 'ok' | 'unavailable',
   *   schema: number, checkedAt: string}} Body served by `/health`.
   */
  const build = ({version, dbOk, schema, now}) => {
    const ready = dbOk === true && schema > 0;

    return {
      status: ready ? 'ok' : 'degraded',
      version,
      db: dbOk === true ? 'ok' : 'unavailable',
      schema,
      checkedAt: now,
    };
  };

  return Object.freeze({build});
};

export {Health};
