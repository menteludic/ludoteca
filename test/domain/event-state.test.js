import assert from 'node:assert/strict';
import test from 'node:test';

import {EventState} from '../../src/domain/event-state.js';
import {JsDate} from '../../src/infra/time/js-date.js';

const {isOpen, slotInCourse, nextSlot, openEventOf, slotsOverlap, slotFits} =
  EventState({time: JsDate({Date, Intl})});

/**
 * Builds an ISO instant from a UTC day and time, so the cases read as clocks.
 *
 * @param {string} day Day, `YYYY-MM-DD`.
 * @param {string} time Time in UTC, `HH:mm`.
 * @returns {string} ISO instant.
 */
const at = (day, time) => `${day}T${time}:00.000Z`;

const slot = (id, startsAt, endsAt) => ({id, startsAt, endsAt});

const event = (id, extra = {}) => ({
  id, startsAt: at('2026-11-28', '08:00'), endsAt: at('2026-11-28', '20:00'), ...extra,
});

const MORNING = slot('s1', at('2026-11-28', '10:00'), at('2026-11-28', '14:00'));
const EVENING = slot('s2', at('2026-11-28', '16:00'), at('2026-11-28', '20:00'));

test('a game can be asked for inside a slot, at either end to the millisecond', () => {
  const facts = {event: event('e1'), slots: [MORNING]};

  assert.equal(isOpen({...facts, at: at('2026-11-28', '12:00')}), true);
  assert.equal(isOpen({...facts, at: MORNING.startsAt}), true);
  assert.equal(isOpen({...facts, at: MORNING.endsAt}), true);
});

test('the event is closed one millisecond outside every slot', () => {
  const facts = {event: event('e1'), slots: [MORNING, EVENING]};

  assert.equal(isOpen({...facts, at: at('2026-11-28', '09:59')}), false);
  assert.equal(isOpen({...facts, at: at('2026-11-28', '14:00')}), true);
  assert.equal(isOpen({...facts, at: at('2026-11-28', '15:00')}), false);
  assert.equal(isOpen({...facts, at: at('2026-11-28', '20:01')}), false);
});

test('an event without slots exists, closed, from the moment it is created', () => {
  assert.equal(isOpen({event: event('e1'), slots: [], at: at('2026-11-28', '12:00')}), false);
});

test('a manual close holds until the end of the slot in course', () => {
  const closed = event('e1', {manualClosedUntil: MORNING.endsAt});
  const slots = [MORNING];

  assert.equal(isOpen({event: closed, slots, at: at('2026-11-28', '11:00')}), false);
  assert.equal(isOpen({event: closed, slots, at: MORNING.endsAt}), false);
});

test('the next slot opens again after a manual close', () => {
  const closed = event('e1', {manualClosedUntil: MORNING.endsAt});
  const slots = [MORNING, EVENING];

  assert.equal(isOpen({event: closed, slots, at: at('2026-11-28', '17:00')}), true);
});

test('the slot in course is the one that contains the instant', () => {
  const slots = [MORNING, EVENING];

  assert.equal(slotInCourse(slots, at('2026-11-28', '11:00')).id, 's1');
  assert.equal(slotInCourse(slots, at('2026-11-28', '17:00')).id, 's2');
  assert.equal(slotInCourse(slots, at('2026-11-28', '15:00')), null);
});

test('the next slot is the first one that has not ended', () => {
  const slots = [EVENING, MORNING];

  assert.equal(nextSlot(slots, at('2026-11-28', '15:00')).id, 's2');
  assert.equal(nextSlot(slots, at('2026-11-28', '17:00')).id, 's2');
  assert.equal(nextSlot(slots, at('2026-11-28', '21:00')), null);
});

test('only one event opens at a time: the slot that started first wins', () => {
  const first = event('a', {slots: [slot('a1', at('2026-11-28', '10:00'), at('2026-11-28', '15:00'))]});
  const second = event('b', {slots: [slot('b1', at('2026-11-28', '12:00'), at('2026-11-28', '18:00'))]});

  assert.equal(openEventOf([first, second], at('2026-11-28', '13:00')).id, 'a');
  assert.equal(openEventOf([second, first], at('2026-11-28', '13:00')).id, 'a');
});

test('when two slots start at the same instant, the older event wins', () => {
  const older = event('a', {slots: [slot('a1', at('2026-11-28', '10:00'), at('2026-11-28', '15:00'))],
    createdAt: '2026-11-01T00:00:00.000Z'});
  const newer = event('b', {slots: [slot('b1', at('2026-11-28', '10:00'), at('2026-11-28', '18:00'))],
    createdAt: '2026-11-10T00:00:00.000Z'});

  assert.equal(openEventOf([newer, older], at('2026-11-28', '11:00')).id, 'a');
});

test('no event opens when no slot is in course', () => {
  assert.equal(openEventOf([event('a', {slots: [MORNING]})], at('2026-11-28', '23:00')), null);
});

test('two slots that touch at the edge do not overlap', () => {
  const first = slot('s1', at('2026-11-28', '10:00'), at('2026-11-28', '12:00'));
  const second = slot('s2', at('2026-11-28', '12:00'), at('2026-11-28', '14:00'));

  assert.equal(slotsOverlap(first, second), false);
});

test('two slots that share a minute overlap', () => {
  const first = slot('s1', at('2026-11-28', '10:00'), at('2026-11-28', '12:01'));
  const second = slot('s2', at('2026-11-28', '12:00'), at('2026-11-28', '14:00'));

  assert.equal(slotsOverlap(first, second), true);
});

test('a slot must sit inside the event', () => {
  const inside = event('e1');

  assert.equal(slotFits(inside, slot('x', at('2026-11-28', '09:00'), at('2026-11-28', '12:00'))), true);
  assert.equal(slotFits(inside, slot('x', at('2026-11-28', '07:00'), at('2026-11-28', '12:00'))), false);
  assert.equal(slotFits(inside, slot('x', at('2026-11-28', '18:00'), at('2026-11-28', '21:00'))), false);
  assert.equal(slotFits(inside, slot('x', at('2026-11-28', '12:00'), at('2026-11-28', '12:00'))), false);
});

test('the answer depends only on the instant handed in, never on a clock of its own', () => {
  const facts = {event: event('e1'), slots: [MORNING]};

  assert.equal(isOpen({...facts, at: at('2026-11-28', '11:00')}), true);
  assert.equal(isOpen({...facts, at: at('2026-11-28', '15:00')}), false);
  assert.equal(isOpen({...facts, at: at('2026-11-28', '11:00')}), true);
});

test('the module refuses to be built without a calendar', () => {
  assert.throws(() => EventState(/** @type {any} */ ({})), /calendar/);
});
