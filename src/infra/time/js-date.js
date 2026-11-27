/**
 * The language's clock and calendar, wrapped in one adapter.
 *
 * This is the only module of the project that names `Date` and `Intl`. The
 * domain receives this object as a dependency, so it never calls a global and a
 * future change of library is a change in one file, not in every rule.
 */

/**
 * @typedef {object} Calendar
 * @property {() => number} nowMs Milliseconds of the wall clock, right now.
 * @property {(value: string | number | Date) => number} toMs Read any instant.
 * @property {(ms: number) => string} toIso Write an instant as ISO, in UTC.
 * @property {(fields: UtcFields) => number} fromUtcFields Build an instant from fields.
 * @property {(ms: number, timeZone: string) => Array<{type: string, value: string}>} formatParts
 *   Read an instant in one zone.
 */

/**
 * Builds the adapter over the globals handed in.
 *
 * @param {{Date: DateConstructor,
 *   Intl: {DateTimeFormat: new (locale?: string, options?: object)
 *     => {formatToParts: (date: Date) => Array<{type: string, value: string}>}}}}
 *   globals The real globals in production, doubles in tests.
 * @returns {{nowMs: () => number, toMs: (value: string | number | Date) => number,
 *   toIso: (ms: number) => string,
 *   fromUtcFields: (fields: UtcFields) => number,
 *   formatParts: (ms: number, timeZone: string) => Array<{type: string, value: string}>}}
 *   Frozen adapter.
 */
const JsDate = ({Date, Intl}) => {
  /**
   * Milliseconds of the wall clock, right now.
   *
   * @returns {number} Epoch milliseconds.
   */
  const nowMs = () => Date.now();

  /**
   * Reads any instant as milliseconds since the epoch.
   *
   * @param {string | number | Date} value Instant as ISO string, epoch or Date.
   * @returns {number} Epoch milliseconds.
   */
  const toMs = (value) => (typeof value === 'number' ? value : new Date(value).getTime());

  /**
   * Writes an instant as an ISO string, in UTC.
   *
   * @param {number} ms Epoch milliseconds.
   * @returns {string} ISO instant.
   */
  const toIso = (ms) => new Date(ms).toISOString();

  /**
   * Builds the instant of a date and time read as if they were UTC. The zone
   * correction is the caller's job, because only the caller knows the zone.
   *
   * @param {UtcFields} fields Calendar fields.
   * @returns {number} Epoch milliseconds.
   */
  const fromUtcFields = (fields) => Date.UTC(
    fields.year, fields.month - 1, fields.day, fields.hour, fields.minute, fields.second ?? 0);

  /**
   * Reads an instant in one zone, as the fields a person would read.
   *
   * @param {number} ms Epoch milliseconds.
   * @param {string} timeZone IANA zone name.
   * @returns {Array<{type: string, value: string}>} Formatted parts.
   */
  const formatParts = (ms, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    return formatter.formatToParts(new Date(ms));
  };

  return Object.freeze({nowMs, toMs, toIso, fromUtcFields, formatParts});
};

/**
 * @typedef {object} UtcFields
 * @property {number} year Four digits.
 * @property {number} month One to twelve.
 * @property {number} day One to thirty-one.
 * @property {number} hour Zero to twenty-three.
 * @property {number} minute Zero to fifty-nine.
 * @property {number} [second] Zero to fifty-nine.
 */

export {JsDate};