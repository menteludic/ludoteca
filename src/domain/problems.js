/**
 * The stable error codes and the HTTP status each one answers with.
 *
 * The domain returns `{ok: false, error: {code, params}}`: a code the interface
 * can branch on, never a sentence. This catalogue is the single list of them,
 * so a code cannot appear in one route with one status and in another with a
 * different one. Appendix D fixes the eleven codes of the business rules;
 * `NOT_FOUND` and `INTERNAL` are the two answers the transport produces on its
 * own. The wording of `title` and `detail` lives in the catalogue of texts, not
 * here.
 *
 * The statuses are ADR-021: the appendix declares `Conflict` for a broken
 * business rule and `Forbidden` for a missing permission, and the rest follow
 * from what the request itself is.
 */

/**
 * The catalogue, keyed by code.
 *
 * @type {Readonly<Record<string, {status: number}>>}
 */
const CATALOG = Object.freeze({
  EVENT_CLOSED: Object.freeze({status: 409}),
  GAME_NOT_AVAILABLE: Object.freeze({status: 409}),
  LOAN_ALREADY_ACTIVE: Object.freeze({status: 409}),
  ADULT_REQUIRED: Object.freeze({status: 409}),
  PROFILE_INCOMPLETE: Object.freeze({status: 409}),
  QR_INVALID: Object.freeze({status: 400}),
  QR_EXPIRED: Object.freeze({status: 410}),
  QR_ALREADY_USED: Object.freeze({status: 409}),
  GAME_ON_LOAN: Object.freeze({status: 409}),
  FORBIDDEN: Object.freeze({status: 403}),
  IMPORT_BLOCKED: Object.freeze({status: 409}),
  NOT_FOUND: Object.freeze({status: 404}),
  INTERNAL: Object.freeze({status: 500}),
});

/**
 * Builds the module. It has nothing to configure: the catalogue is the data the
 * document fixes.
 *
 * @returns {{catalog: Readonly<Record<string, {status: number}>>,
 *   codes: () => string[], isKnown: (code: string) => boolean,
 *   statusOf: (code: string) => number | undefined}} Frozen module.
 */
const Problems = () => {
  /**
   * Lists the codes, in catalogue order.
   *
   * @returns {string[]} Copy of the names, so nobody edits the catalogue.
   */
  const codes = () => Object.keys(CATALOG);

  /**
   * Tells whether a code belongs to the catalogue.
   *
   * @param {string} code Candidate code.
   * @returns {boolean} True when it is known.
   */
  const isKnown = (code) => (typeof code === 'string' && code !== ''
    ? Object.hasOwn(CATALOG, code)
    : false);

  /**
   * Returns the status of a code, or `undefined` when it is not in the
   * catalogue. The domain does not throw: an unknown code is a value the edge
   * has to deal with, and it is the edge that turns it into a crash.
   *
   * @param {string} code Code of the catalogue.
   * @returns {number | undefined} HTTP status, when the code exists.
   */
  const statusOf = (code) => {
    if (!isKnown(code)) return undefined;
    return /** @type {{status: number}} */ (CATALOG[code]).status;
  };

  return Object.freeze({catalog: CATALOG, codes, isKnown, statusOf});
};

export {Problems};