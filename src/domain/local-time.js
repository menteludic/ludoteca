/**
 * Local time and instants, in the zone the event is read in (section 9.2).
 *
 * The database keeps instants; the people who run the event think in the clock
 * on the wall. This module is the only place where the two meet, and it is
 * built on `Intl`, so the zone rules come from the runtime's tz database
 * instead of a table written by hand that would be wrong twice a year.
 *
 * Two cases that a naive implementation gets wrong, and this one answers:
 *
 * - The hour March skips (02:30 on the last Sunday) does not exist. `toInstant`
 *   returns `null`, so nothing is silently moved to 03:30.
 * - The hour October repeats (02:30 on the last Sunday) exists twice. The answer
 *   is the first one, the summer one, which is the one a person means when they
 *   say "two thirty" before the clock goes back.
 */

/**
 * Builds the module for one zone.
 *
 * @param {{timeZone?: string}} [config] Zone to read in; Madrid by default.
 * @returns {{toInstant: (date: string, time: string) => string | null,
 *   toLocal: (instant: string | number | Date) => {date: string, time: string}}}
 *   Frozen module.
 */
const LocalTime = ({timeZone = 'Europe/Madrid'} = {}) => {
  /**
   * Writes a calendar field with two digits, as the wall clock does.
   *
   * @param {number} value A calendar field.
   * @returns {string} Two digits.
   */
  const pad = (value) => String(value).padStart(2, '0');

  /**
   * Reads the calendar fields of an instant, in the configured zone.
   *
   * @param {number} instant Milliseconds since the epoch.
   * @returns {{year: number, month: number, day: number, hour: number,
   *   minute: number, second: number}} Fields as a person would read them.
   */
  const fields = (instant) => {
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

    const parts = formatter.formatToParts(new Date(instant));
    /**
     * Reads one field of the formatted instant.
     *
     * @param {string} type Field name, as `Intl` names it.
     * @returns {number} Its value, or `NaN` when the field is missing.
     */
    const pick = (type) => Number(parts.find((part) => part.type === type)?.value ?? NaN);

    return {
      year: pick('year'),
      month: pick('month'),
      day: pick('day'),
      hour: pick('hour'),
      minute: pick('minute'),
      second: pick('second'),
    };
  };

  /**
   * Tells how far the zone's clock is from UTC at one instant.
   *
   * @param {number} instant Milliseconds since the epoch.
   * @returns {number} Offset in milliseconds.
   */
  const offsetOf = (instant) => {
    const local = fields(instant);

    return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
      - instant;
  };

  /**
   * Turns a date and a time read on the wall into an instant.
   *
   * Two passes: the first guess uses the offset of the instant it lands in, the
   * second corrects it. Then the result is read back; if the clock does not say
   * what was asked, that hour does not exist in this zone.
   *
   * @param {string} date Day, `YYYY-MM-DD`.
   * @param {string} time Time, `HH:mm`.
   * @returns {string | null} ISO instant, or `null` when the hour is skipped.
   */
  const toInstant = (date, time) => {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) return null;

    const wall = Date.UTC(
      /** @type {number} */ (year), /** @type {number} */ (month) - 1,
      /** @type {number} */ (day), /** @type {number} */ (hour), /** @type {number} */ (minute),
    );

    // Two offsets can be in force around a change: the day before and the day
    // after catch both. Every candidate that reads back as the hour asked for is
    // real; the smallest one is the first occurrence, which is the one a person
    // means before the clock goes back.
    const offsets = [...new Set([
      offsetOf(wall - 86400000),
      offsetOf(wall),
      offsetOf(wall + 86400000),
    ])];

    const real = offsets
      .map((offset) => wall - offset)
      .filter((instant) => {
        const local = fields(instant);
        return local.year === year && local.month === month && local.day === day
          && `${pad(local.hour)}:${pad(local.minute)}` === time;
      });

    if (real.length === 0) return null;

    return new Date(Math.min(...real)).toISOString();
  };

  /**
   * Reads an instant in the zone's clock, to show it.
   *
   * @param {string | number | Date} instant Anything that names an instant.
   * @returns {{date: string, time: string}} Day and time on the wall.
   */
  const toLocal = (instant) => {
    const local = fields(new Date(instant).getTime());

    return {
      date: `${local.year}-${pad(local.month)}-${pad(local.day)}`,
      time: `${pad(local.hour)}:${pad(local.minute)}`,
    };
  };

  return Object.freeze({toInstant, toLocal});
};

export {LocalTime};