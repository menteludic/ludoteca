import assert from 'node:assert/strict';
import test from 'node:test';

import {JsDate} from '../../src/infra/time/js-date.js';

/**
 * A clock and a calendar that answer with numbers nobody else could produce, so
 * a test can tell whether the adapter asked them or made something up.
 *
 * @returns {object} The globals a test hands in.
 */
const doubles = () => {
  /**
   * Stands in for the language's Date.
   *
   * @param {*} value Instant handed to the constructor.
   */
  function FakeDate(value) {
    this.value = value;
  }
  FakeDate.prototype.getTime = function getTime() {
    return 1000;
  };
  FakeDate.prototype.toISOString = function toISOString() {
    return 'fake-iso';
  };
  FakeDate.now = () => 2000;
  FakeDate.UTC = (...fields) => {
    FakeDate.lastUtc = fields;
    return 3000;
  };

  /**
   * Stands in for the language's date formatter.
   *
   * @param {string} locale Unused.
   * @param {object} options Unused.
   */
  function FakeFormat(locale, options) {
    this.options = options;
    this.formatToParts = () => [{type: 'year', value: '2026'}, {type: 'literal', value: '-'}];
  }

  return {Date: FakeDate, Intl: {DateTimeFormat: FakeFormat}};
};

test('the adapter asks the clock it was handed, never a global', () => {
  const globals = doubles();
  const adapter = JsDate(globals);

  assert.equal(adapter.nowMs(), 2000);
  assert.equal(adapter.toMs('anything'), 1000);
  assert.equal(adapter.toIso(9), 'fake-iso');
  assert.equal(adapter.fromUtcFields({year: 2026, month: 3, day: 29, hour: 2, minute: 30}), 3000);
});

test('the month reaches the calendar as the language counts it', () => {
  const globals = doubles();
  const adapter = JsDate(globals);

  adapter.fromUtcFields({year: 2026, month: 3, day: 29, hour: 2, minute: 30});

  assert.deepEqual(globals.Date.lastUtc, [2026, 2, 29, 2, 30, 0]);
});

test('an epoch already in milliseconds is not handed to the constructor again', () => {
  let built = 0;

  /**
   * Counts constructions.
   *
   * @param {*} value Instant.
   */
  function Counting(value) {
    built += 1;
    this.value = value;
  }
  Counting.prototype.getTime = function getTime() {
    return 0;
  };

  const adapter = JsDate({
    Date: Counting,
    Intl: {DateTimeFormat: () => ({formatToParts: () => []})},
  });

  assert.equal(adapter.toMs(1234), 1234);
  assert.equal(built, 0);
  assert.equal(adapter.toMs('2026-11-28T11:00:00.000Z'), 0);
  assert.equal(built, 1);
});

test('the formatter receives the zone it has to read in', () => {
  const seen = [];

  /**
   * Records the options it was built with.
   *
   * @param {string} locale Unused.
   * @param {object} options Format options.
   */
  function Recording(locale, options) {
    seen.push(options);
    this.formatToParts = () => [{type: 'hour', value: '12'}];
  }

  const adapter = JsDate({Date: Date, Intl: {DateTimeFormat: Recording}});
  const parts = adapter.formatParts(0, 'Europe/Madrid');

  assert.equal(seen[0].timeZone, 'Europe/Madrid');
  assert.deepEqual(parts, [{type: 'hour', value: '12'}]);
});

test('with the real globals it reads and writes real instants', () => {
  const adapter = JsDate({Date, Intl});

  const iso = '2026-11-28T11:00:00.000Z';
  assert.equal(adapter.toIso(adapter.toMs(iso)), iso);
  assert.equal(adapter.toMs(0), 0);
  const newYear = {year: 2026, month: 1, day: 1, hour: 0, minute: 0};
  assert.equal(adapter.fromUtcFields(newYear), 1767225600000);
  assert.equal(typeof adapter.nowMs(), 'number');
});