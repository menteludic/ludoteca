/**
 * Results as values: a domain function returns success or failure and never
 * throws. The error carries a stable code and the parameters the interface
 * needs to render a sentence; the text itself lives in the UI catalogue, so
 * the domain holds no human wording.
 *
 * @typedef {{code: string, params: Record<string, string | number>}} DomainError
 * @typedef {{ok: true, value: unknown}} OkShape
 * @typedef {{ok: false, error: DomainError}} FailShape
 */

import * as R from 'ramda';

/**
 * Builds the result module.
 *
 * A factory rather than a bag of exports: callers receive the instance they
 * need and tests can build their own. No configuration today; the day one is
 * needed it arrives as the object this function takes.
 *
 * @returns {{ok: Function, fail: Function, isOk: Function, isFail: Function,
 *   unwrapOr: Function}} Result helpers.
 */
const Result = () => {
  /**
   * Wraps a value in a successful result.
   *
   * @template T
   * @param {T} value Value produced by the operation.
   * @returns {{ok: true, value: T}} Successful result.
   */
  const ok = (value) => ({ok: true, value});

  /**
   * Builds a failure from a stable code and its parameters.
   *
   * @param {string} code Stable code (`GAME_NOT_AVAILABLE`, `EVENT_CLOSED`…).
   * @param {Record<string, string | number>} [params] Data the message needs.
   * @returns {{ok: false, error: DomainError}} Failed result.
   */
  const fail = (code, params = {}) => ({ok: false, error: {code, params}});

  /**
   * Tells whether a result is successful.
   *
   * @param {OkShape | FailShape} result Result to inspect.
   * @returns {boolean} True when the operation succeeded.
   */
  const isOk = R.propEq(true, 'ok');

  /**
   * Tells whether a result is a failure.
   *
   * @param {OkShape | FailShape} result Result to inspect.
   * @returns {boolean} True when the operation failed.
   */
  const isFail = R.propEq(false, 'ok');

  /**
   * Returns the value of a successful result and a fallback otherwise.
   *
   * @param {*} fallback Value used when the result is a failure.
   * @param {OkShape | FailShape} result Result to read.
   * @returns {*} The value or the fallback.
   */
  const unwrapOr = R.curry((fallback, result) =>
    R.propOr(fallback, 'value', result));

  return Object.freeze({ok, fail, isOk, isFail, unwrapOr});
};

export {Result};
