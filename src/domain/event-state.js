/**
 * When an event is open (section 9).
 *
 * The database stores instants; the event also carries the zone it is read in,
 * but nothing here needs it: a slot opens at its first millisecond and closes
 * at its last, and the manual close holds until the end of the slot in course.
 *
 * The instant always arrives as a parameter. This module never reads a clock,
 * so the same call with the same instant answers the same thing forever.
 *
 * Rules kept here: RN-10 (delivery with the event closed), RN-21 (only one
 * event open at a time) and RN-22 (open and close with the slots, manual close
 * until the end of the slot in course).
 */

import * as R from 'ramda';

/**
 * Reads any instant the database or the caller may hand in.
 *
 * @param {string | number | Date} value Instant as ISO string, epoch or Date.
 * @returns {number} Milliseconds since the epoch.
 */
const ms = (value) => new Date(value).getTime();

/**
 * Builds the module. It has nothing to configure.
 *
 * @returns {{isOpen: (facts: OpenFacts) => boolean,
 *   slotInCourse: (slots: Slot[], at: Instant) => Slot | null,
 *   nextSlot: (slots: Slot[], at: Instant) => Slot | null,
 *   openEventOf: (events: EventWithSlots[], at: Instant) => EventWithSlots | null,
 *   slotsOverlap: (a: Slot, b: Slot) => boolean,
 *   slotFits: (event: EventRow, candidate: Slot) => boolean}} Frozen module.
 */
const EventState = () => {
  /**
   * Builds the facts of one slot in numbers, so the comparisons are one kind.
   *
   * @param {Slot} one Slot as stored.
   * @returns {{slot: Slot, start: number, end: number}} Slot and its bounds.
   */
  const bounds = (one) => ({slot: one, start: ms(one.startsAt), end: ms(one.endsAt)});

  /**
   * Tells whether an instant falls inside a slot, both ends included: the event
   * opens in the first minute of the slot and closes in the last one.
   *
   * @param {number} start Slot start, in milliseconds.
   * @param {number} end Slot end, in milliseconds.
   * @param {number} instant Instant to place, in milliseconds.
   * @returns {boolean} True when the slot is in course.
   */
  const contains = (start, end, instant) => instant >= start && instant <= end;

  /**
   * Returns the slot in course at an instant, or `null`.
   *
   * @param {Slot[]} slots Slots of one event, in any order.
   * @param {Instant} at Instant to place.
   * @returns {Slot | null} Slot in course.
   */
  const slotInCourse = (slots, at) => {
    const instant = ms(at);
    const found = (slots ?? []).find((one) => {
      const {start, end} = bounds(one);
      return contains(start, end, instant);
    });

    return found ?? null;
  };

  /**
   * Returns the first slot that has not ended yet: the one on screen when the
   * event is closed, and the one in course when it is open.
   *
   * @param {Slot[]} slots Slots of one event, in any order.
   * @param {Instant} at Instant to look from.
   * @returns {Slot | null} Next slot.
   */
  const nextSlot = (slots, at) => {
    const instant = ms(at);
    const pending = R.sortWith([R.ascend((/** @type {Slot} */ one) => ms(one.startsAt))])(
      (slots ?? []).filter((one) => ms(one.endsAt) >= instant));

    return /** @type {Slot | null} */ (pending[0] ?? null);
  };

  /**
   * Tells whether the event is open at an instant: a slot is in course and no
   * manual close is still holding.
   *
   * @param {OpenFacts} facts Event, its slots and the instant.
   * @returns {boolean} True when the event is open.
   */
  const isOpen = ({event, slots, at}) => {
    if (slotInCourse(slots, at) === null) return false;

    const until = event.manualClosedUntil;
    if (until === undefined || until === null) return true;

    return ms(at) > ms(until);
  };

  /**
   * Returns the single event that may be open at an instant (RN-21): of the
   * events with a slot in course, the one whose slot started first; if two
   * start together, the older event; and if they were created together, the
   * lower identifier, so the answer never depends on the order of the list.
   *
   * @param {EventWithSlots[]} events Events, each one with its slots.
   * @param {Instant} at Instant to place.
   * @returns {EventWithSlots | null} Event that opens, if any.
   */
  const openEventOf = (events, at) => {
    const instant = ms(at);
    const inCourse = (events ?? [])
      .map((one) => ({event: one, slot: slotInCourse(one.slots, at)}))
      .filter((pair) => pair.slot !== null && isOpen({event: pair.event, slots: [pair.slot], at}))
      .map((pair) => ({...pair, start: ms(/** @type {Slot} */ (pair.slot).startsAt)}));

    if (inCourse.length === 0) return null;

    const ranked = R.sortWith([
      R.ascend((pair) => pair.start),
      R.ascend((pair) => ms(pair.event.createdAt ?? instant)),
      R.ascend((pair) => pair.event.id),
    ], inCourse);

    const winner = /** @type {{event: EventWithSlots}} */ (ranked[0]);

    return winner.event;
  };

  /**
   * Tells whether two slots share a moment. Touching at the edge is not an
   * overlap: a slot may end exactly when the next one starts.
   *
   * @param {Slot} a One slot.
   * @param {Slot} b The other slot.
   * @returns {boolean} True when they overlap.
   */
  const slotsOverlap = (a, b) => {
    const first = bounds(a);
    const second = bounds(b);

    return first.start < second.end && second.start < first.end;
  };

  /**
   * Tells whether a slot sits inside its event and lasts a positive time.
   *
   * @param {EventRow} event Event that owns the slot.
   * @param {Slot} candidate Slot to place.
   * @returns {boolean} True when the slot fits.
   */
  const slotFits = (event, candidate) => {
    const start = ms(candidate.startsAt);
    const end = ms(candidate.endsAt);

    return start < end && start >= ms(event.startsAt) && end <= ms(event.endsAt);
  };

  return Object.freeze({isOpen, slotInCourse, nextSlot, openEventOf, slotsOverlap, slotFits});
};

/**
 * @typedef {string | number | Date} Instant Any instant the module accepts.
 */

/**
 * @typedef {object} Slot
 * @property {string} id Slot identifier.
 * @property {string} startsAt Start instant, ISO.
 * @property {string} endsAt End instant, ISO.
 */

/**
 * @typedef {object} EventRow
 * @property {string} id Event identifier.
 * @property {string} startsAt First instant of the event, ISO.
 * @property {string} endsAt Last instant of the event, ISO.
 * @property {string | null} [manualClosedUntil] End of the manual close, ISO.
 * @property {string} [createdAt] When the event was created, ISO.
 */

/**
 * @typedef {EventRow & {slots: Slot[]}} EventWithSlots
 */

/**
 * @typedef {object} OpenFacts
 * @property {EventRow} event Event being asked about.
 * @property {Slot[]} slots Its slots.
 * @property {Instant} at Instant to place.
 */

export {EventState};