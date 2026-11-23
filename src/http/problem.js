/**
 * Errores HTTP en formato `application/problem+json` (RFC 9457).
 * `code` es estable y lo consume la interfaz; `detail` está en castellano.
 */

/** @type {Record<number, string>} */
const TITLES = {
  400: 'Petición inválida',
  401: 'No autenticado',
  403: 'Sin permiso',
  404: 'No encontrado',
  409: 'Conflicto',
  413: 'Demasiado grande',
  429: 'Demasiadas peticiones',
  500: 'Error interno',
  503: 'Servicio no disponible',
};

const BASE = 'https://ludoteca.example/problems/';

/**
 * Construye el cuerpo de un error HTTP.
 *
 * @param {number} status Código HTTP.
 * @param {string} code Código estable para la interfaz (`GAME_NOT_AVAILABLE`…).
 * @param {string} detail Explicación para la persona, sin datos internos.
 * @returns {{type: string, title: string, status: number, code: string, detail: string}} Problema.
 */
export const problem = (status, code, detail) => ({
  type: `${BASE}${code.toLowerCase()}`,
  title: TITLES[status] ?? 'Error',
  status,
  code,
  detail,
});