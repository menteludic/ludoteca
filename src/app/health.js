/**
 * Estado del servicio para `/health`. Es lo que compara el despliegue: si no
 * dice el SHA que acaba de publicarse, el despliegue ha fallado.
 *
 * Función pura: el instante y el resultado de la base entran como datos.
 *
 * @param {{version: string, dbOk: boolean, schema: number, now: string}} input
 *   Versión desplegada, si la base responde, versión del esquema aplicada y hora ISO.
 * @returns {{status: 'ok' | 'degraded', version: string, db: 'ok' | 'unavailable',
 *   schema: number, checkedAt: string}} Cuerpo del `/health`.
 */
export const buildHealth = ({version, dbOk, schema, now}) => {
  const ready = dbOk === true && schema > 0;

  return {
    status: ready ? 'ok' : 'degraded',
    version,
    db: dbOk === true ? 'ok' : 'unavailable',
    schema,
    checkedAt: now,
  };
};