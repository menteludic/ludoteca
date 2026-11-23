/**
 * Resultados como valores: una función de dominio devuelve éxito o error, nunca lanza.
 * El borde traduce el código estable a la respuesta HTTP y la interfaz a un texto.
 *
 * @typedef {{code: string, message: string}} DomainError
 * @typedef {{ok: true, value: unknown}} OkShape
 * @typedef {{ok: false, error: DomainError}} FailShape
 */

/**
 * Envuelve un valor en un resultado correcto.
 *
 * @template T
 * @param {T} value Valor que devuelve la operación.
 * @returns {{ok: true, value: T}} Resultado con el valor dentro.
 */
export const ok = (value) => ({ok: true, value});

/**
 * Construye un fallo con código estable y mensaje para la persona.
 *
 * @param {string} code Código estable (`GAME_NOT_AVAILABLE`, `EVENT_CLOSED`…).
 * @param {string} message Texto en castellano que dice qué hacer.
 * @returns {{ok: false, error: DomainError}} Resultado fallido.
 */
export const fail = (code, message) => ({ok: false, error: {code, message}});

/**
 * Indica si el resultado es correcto.
 *
 * @param {OkShape | FailShape} result Resultado a inspeccionar.
 * @returns {boolean} `true` cuando la operación salió bien.
 */
export const isOk = (result) => result.ok === true;

/**
 * Indica si el resultado es un fallo.
 *
 * @param {OkShape | FailShape} result Resultado a inspeccionar.
 * @returns {boolean} `true` cuando la operación falló.
 */
export const isFail = (result) => result.ok === false;