"use strict";

/**
 * Map a given value from a given range into [0, 1]
 *
 * @param {*} value value to map
 * @param {*} from [range_start, range_end]
 * @returns the mapped value, clamped between 0 and 1
 */
export function mapToPercent(value, from) {
  return clamp(mapToRange(value, from, [0, 100]), 0, 100);
}

/**
 * Map a given value from a given range into [0, 1]
 *
 * @param {*} value value to map
 * @param {*} from [range_start, range_end]
 * @param {*} to [range_start, range_end]
 * @returns the mapped value, clamped between 0 and 1
 */
export function mapToRange(value, from, to) {
  return to[0] + ((value - from[0]) * (to[1] - to[0])) / (from[1] - from[0]);
}

/**
 * Clamp a value between a range
 *
 * @export
 * @param {*} value the value to clamp
 * @param {*} min the minimum to clamp to
 * @param {*} max the maximum to clamp to
 * @returns the clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
