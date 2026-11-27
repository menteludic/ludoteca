/**
 * The four states of a game (section 4.2), calculated and never stored.
 *
 * What the database keeps are the three decisions —`retired`, `blocked`,
 * `manuallyLent`— and the loans. The state is what they add up to, so a game
 * cannot be `available` in a row while it is out in the room.
 *
 * Precedence, when several apply: **retired → on loan → blocked → available**.
 * A retired game is never offered, even if an old event still lists it.
 */

import * as R from 'ramda';

/**
 * The state names, as the interface and the API write them.
 */
const STATES = Object.freeze({
  RETIRED: 'retired',
  ON_LOAN: 'on_loan',
  BLOCKED: 'blocked',
  AVAILABLE: 'available',
});

/**
 * Builds the module. It has nothing to configure: the rule is the rule.
 *
 * @returns {{calculate: (game: GameFacts) => string,
 *   states: Readonly<Record<string, string>>}} Frozen module.
 */
const GameState = () => {
  /**
   * Tells whether the game left the catalogue (RN-18).
   *
   * @param {GameFacts} game Facts of one game.
   * @returns {boolean} True when retired.
   */
  const isRetired = (game) => game.retired === true;

  /**
   * Tells whether the game is out of the shelves, by a loan or by hand.
   *
   * @param {GameFacts} game Facts of one game.
   * @returns {boolean} True when on loan.
   */
  const isOnLoan = (game) => game.manuallyLent === true || game.hasActiveLoan === true;

  /**
   * Tells whether an administrator holds the game back.
   *
   * @param {GameFacts} game Facts of one game.
   * @returns {boolean} True when blocked.
   */
  const isBlocked = (game) => game.blocked === true;

  /**
   * Calculates the state of one game.
   *
   * Anything that is not `true` counts as false: a row read from the database
   * comes as `0`/`1`, and the caller decides how to turn it into a boolean.
   *
   * @param {GameFacts} [game] Facts of one game.
   * @returns {string} One of `states`.
   */
  const calculate = (game = {}) => R.cond([
    [isRetired, R.always(STATES.RETIRED)],
    [isOnLoan, R.always(STATES.ON_LOAN)],
    [isBlocked, R.always(STATES.BLOCKED)],
    [R.T, R.always(STATES.AVAILABLE)],
  ])(game);

  return Object.freeze({calculate, states: STATES});
};

/**
 * @typedef {object} GameFacts
 * @property {boolean} [retired] Left the catalogue but keeps its history.
 * @property {boolean} [blocked] In the event but an administrator holds it back.
 * @property {boolean} [manuallyLent] An administrator marked it as lent.
 * @property {boolean} [hasActiveLoan] A loan of this game is still open.
 */

export {GameState};