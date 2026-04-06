/**
 * src/utils/helpers.js
 * Pure utility functions — no side effects, no DOM, no state.
 */

/**
 * Safely parse any value to a finite float, defaulting to 0.
 * @param {*} v
 * @returns {number}
 */
export function toFloat(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse integer safely.
 * @param {*} v
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function toInt(v, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse a boolean-ish value (Firebase sometimes sends strings).
 * @param {*} v
 * @returns {boolean}
 */
export function toBool(v) {
  return v === true || v === 'true';
}

/**
 * Haversine distance in kilometres.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number}
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R  = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lon2 - lon1) * Math.PI / 180;
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Haversine distance in metres.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number}
 */
export function haversineM(lat1, lon1, lat2, lon2) {
  return haversineKm(lat1, lon1, lat2, lon2) * 1000;
}

/**
 * Format a Unix timestamp as HH:MM:SS.
 * @param {number} ts
 * @returns {string}
 */
export function fmtTime(ts) {
  if (!ts) return '--';
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

/**
 * Clamp a value between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Truncate a string to a maximum length.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 8) {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
