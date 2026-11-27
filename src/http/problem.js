/**
 * HTTP errors in `application/problem+json` (RFC 9457). The `code` is stable
 * and consumed by the interface; the human wording comes from the catalogue,
 * never from this module.
 */

const DEFAULT_BASE = 'https://ludoteca.example/problems/';

/**
 * @typedef {object} ProblemConfig
 * @property {ReturnType<import('../domain/problems.js').Problems>} problems
 *   The catalogue of stable codes; it fixes the status of each one.
 * @property {string} [baseUrl] Base used for the `type` field.
 * @property {Record<string, string>} [titles] Status code to title.
 */

/**
 * Builds the problem module with its catalogue of codes and titles.
 *
 * @param {ProblemConfig} config Module configuration.
 * @returns {{build: (code: string, detail: string) => {type: string,
 *   title: string, status: number, code: string, detail: string}}} Problem helpers.
 */
const Problem = (config) => {
  if (config === undefined || config.problems === undefined) {
    throw new Error('Problem needs the problems catalogue');
  }

  const {problems, baseUrl = DEFAULT_BASE, titles = {}} = config;
  /**
   * Builds one problem body. The status is looked up by code, so a caller
   * cannot answer the same code with two different statuses.
   *
   * @param {string} code Stable code for the interface.
   * @param {string} detail Sentence for the person, without internal data.
   * @returns {{type: string, title: string, status: number, code: string,
   *   detail: string}} Problem body.
   */
  const build = (code, detail) => {
    const status = problems.statusOf(code);
    if (status === undefined) throw new Error(`unknown error code: ${code}`);

    return {
      type: `${baseUrl}${code.toLowerCase()}`,
      title: titles[String(status)] ?? 'Error',
      status,
      code,
      detail,
    };
  };

  return Object.freeze({build});
};

export {Problem};
