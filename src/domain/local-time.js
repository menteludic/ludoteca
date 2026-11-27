/**
 * Local time and instants, in the zone the event is read in (section 9.2).
 *
 * The database keeps instants; the people who run the event think in the clock
 * on the wall. This module is the only place where the two meet. It does not
 * name `Date` nor `Intl`: the calendar arrives as a dependency (`JsDate` in
 * production, a double in a test), so the zone rules can come from the runtime
 * and this code still calls no global.
 *
 * Two cases that a naive implementation gets wrong, and this one answers:
 *
 * - The hour March skips (02:30 on the last Sunday) does not exist. `toInstant`
 *   returns `null`, so nothing is silently moved to 03:30.
 * - The hour October repeats (02:30 on the last Sunday) exists twice. The answer
 *   is the first one, the summer one, which is the one a person means when they
 *   say "two thirty" before the clock goes back.
 */

import * as R from 'ramda';

/** Milliseconds in one day, used to catch the offsets around a change. */
const MILLIS_PER_DAY = 86_400_000;

/** A day field is written with two digits: `03`, not `3`. */
const DIGITS_IN_A_DAY_FIELD = 2;

/**
 * Builds the module for one zone.
 *
 * @param {{timeZone?: string, time: import('../infra/time/js-date.js').Calendar}} config
 *   Zone to read in (Madrid by default) and the calendar to read it with.
 * @returns {{toInstant: (date: string, clockTime: string) => string | null,
 *   toLocal: (instant: string | number | Date) => {date: string, time: string}}}
 *   Frozen module.
 */
const LocalTime = (config) => {
  if (config === undefined || config.time === undefined) {
    throw new Error('LocalTime needs the calendar');
  }

  const {timeZone = 'Europe/Madrid', time} = config;

  /**
   * Writes a calendar field with two digits, as the wall clock does.
   *
   * @param {number} value A calendar field.
   * @returns {string} Two digits.
   */
  const pad = (value) => String(value).padStart(DIGITS_IN_A_DAY_FIELD, '0');

  /**
   * Reads the calendar fields of an instant, in the configured zone.
   *
   * @param {number} instant Milliseconds since the epoch.
   * @returns {{year: number, month: number, day: number, hour: number,
   *   minute: number, second: number}} Fields as a person would read them.
   */
  const fields = (instant) => {
    /** @type {Array<{type: string, value: string}>} */
    const parts = time.formatParts(instant, timeZone);
    /**
     * Reads one field of the formatted instant.
     *
     * @param {string} type Field name, as the calendar names it.
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

    return time.fromUtcFields(local) - instant;
  };

  /**
   * Turns a date and a time read on the wall into an instant.
   *
   * Two offsets can be in force around a change: the day before and the day
   * after catch both. Every candidate that reads back as the hour asked for is
   * real; the smallest one is the first occurrence, which is the one a person
   * means before the clock goes back. When none reads back, that hour does not
   * exist in this zone.
   *
   * @param {string} date Day, `YYYY-MM-DD`.
   * @param {string} clockTime Time, `HH:mm`.
   * @returns {string | null} ISO instant, or `null` when the hour is skipped.
   */
  const toInstant = (date, clockTime) => {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = clockTime.split(':').map(Number);
    if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) return null;

    const wall = time.fromUtcFields({
      year: /** @type {number} */ (year),
      month: /** @type {number} */ (month),
      day: /** @type {number} */ (day),
      hour: /** @type {number} */ (hour),
      minute: /** @type {number} */ (minute),
      second: 0,
    });

    const offsets = R.uniq([
      offsetOf(wall - MILLIS_PER_DAY),
      offsetOf(wall),
      offsetOf(wall + MILLIS_PER_DAY),
    ]);

    const real = offsets
      .map((offset) => wall - offset)
      .filter((instant) => {
        const local = fields(instant);

        return local.year === year && local.month === month && local.day === day
          && `${pad(local.hour)}:${pad(local.minute)}` === clockTime;
      });

    if (real.length === 0) return null;

    return time.toIso(Math.min(...real));
  };

  /**
   * Reads an instant in the zone's clock, to show it.
   *
   * @param {string | number | Date} instant Anything that names an instant.
   * @returns {{date: string, time: string}} Day and time on the wall.
   */
  const toLocal = (instant) => {
    const local = fields(time.toMs(instant));

    return {
      date: `${local.year}-${pad(local.month)}-${pad(local.day)}`,
      time: `${pad(local.hour)}:${pad(local.minute)}`,
    };
  };

  return Object.freeze({toInstant, toLocal});
};

export {LocalTime};