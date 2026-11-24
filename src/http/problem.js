/**
 * HTTP errors in `application/problem+json` (RFC 9457). The `code` is stable
 * and consumed by the interface; the human wording comes from the catalogue,
 * never from this module.
 */

import * as R from 'ramda';

const DEFAULT_BASE = 'https://ludoteca.example/problems/';

/**
 * Builds the problem module with its catalogue of titles.
 *
 * @param {object} [config] Module configuration.
 * @param {string} [config.baseUrl] Base used for the `type` field.
 * @param {Record<string, string>} [config.titles] Status code to title.
 * @returns {{build: Function}} Problem helpers.
 */
const Problem = ({baseUrl = DEFAULT_BASE, titles = {}} = {}) => {
  /**
   * Builds one problem body.
   *
   * @param {number} status HTTP status code.
   * @param {string} code Stable code for the interface.
   * @param {string} detail Sentence for the person, without internal data.
   * @returns {{type: string, title: string, status: number, code: string,
   *   detail: string}} Problem body.
   */
  const build = (status, code, detail) => ({
    type: `${baseUrl}${code.toLowerCase()}`,
    title: R.propOr('Error', String(status), titles),
    status,
    code,
    detail,
  });

  return Object.freeze({build});
};

export {Problem};
