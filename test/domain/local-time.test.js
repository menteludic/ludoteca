import assert from 'node:assert/strict';
import test from 'node:test';

import {LocalTime} from '../../src/domain/local-time.js';
import {JsDate} from '../../src/infra/time/js-date.js';

const calendar = JsDate({Date, Intl});
const madrid = LocalTime({time: calendar});

test('a winter hour keeps the offset of one hour', () => {
  assert.equal(madrid.toInstant('2026-11-28', '12:00'), '2026-11-28T11:00:00.000Z');
});

test('a summer hour carries the offset of two hours', () => {
  assert.equal(madrid.toInstant('2026-07-01', '12:00'), '2026-07-01T10:00:00.000Z');
});

test('the hour that March skips does not exist, and the answer says so', () => {
  // Last Sunday of March 2026: at 02:00 the clock jumps to 03:00.
  assert.equal(madrid.toInstant('2026-03-29', '02:30'), null);
  assert.equal(madrid.toInstant('2026-03-29', '03:30'), '2026-03-29T01:30:00.000Z');
});

test('the hour October repeats resolves to the first one, the summer one', () => {
  // Last Sunday of October 2026: at 03:00 the clock goes back to 02:00.
  assert.equal(madrid.toInstant('2026-10-25', '02:30'), '2026-10-25T00:30:00.000Z');
  assert.equal(madrid.toInstant('2026-10-25', '03:30'), '2026-10-25T02:30:00.000Z');
});

test('an instant is read back in the local clock it belongs to', () => {
  assert.deepEqual(madrid.toLocal('2026-11-28T11:00:00.000Z'), {date: '2026-11-28', time: '12:00'});
  assert.deepEqual(madrid.toLocal('2026-07-01T10:00:00.000Z'), {date: '2026-07-01', time: '12:00'});
});

test('local time and instant survive a round trip, on both sides of the change', () => {
  const cases = [
    ['2026-11-28', '12:00'],
    ['2026-07-01', '12:00'],
    ['2026-03-29', '03:30'],
    ['2026-10-25', '03:30'],
    ['2026-12-31', '23:59'],
  ];

  for (const [date, time] of cases) {
    const instant = madrid.toInstant(date, time);

    assert.equal(typeof instant, 'string', `${date} ${time} did not convert`);
    assert.deepEqual(madrid.toLocal(/** @type {string} */ (instant)), {date, time});
  }
});

test('a zone other than Madrid is a matter of configuration, not of code', () => {
  const utc = LocalTime({timeZone: 'UTC', time: calendar});

  assert.equal(utc.toInstant('2026-11-28', '12:00'), '2026-11-28T12:00:00.000Z');
});

test('the module refuses to be built without a calendar', () => {
  assert.throws(() => LocalTime(/** @type {any} */ ({})), /calendar/);
});
