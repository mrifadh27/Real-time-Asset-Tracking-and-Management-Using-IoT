/**
 * src/utils/helpers.js
 * Pure utility functions — no side effects, no DOM access, no state.
 */

export const toF    = v  => { const n = parseFloat(v);  return (isFinite(n) && !isNaN(n)) ? n : 0; };
export const toI    = v  => { const n = parseInt(v, 10); return isFinite(n) ? n : 0; };
export const toBool = v  => v === true || v === 'true';
export const clamp  = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export const isValidGPS = (lat, lng) => {
  const la = parseFloat(lat), ln = parseFloat(lng);
  if (!isFinite(la) || !isFinite(ln) || isNaN(la) || isNaN(ln)) return false;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return false;
  if (la === 0.0 && ln === 0.0) return false;
  return true;
};

export function haversineKm(lat1, lon1, lat2, lon2) {
  if (!isValidGPS(lat1, lon1) || !isValidGPS(lat2, lon2)) return 0;
  const R  = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dL / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180)
            * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dG / 2) ** 2;
  const r  = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return isFinite(r) ? r : 0;
}
export const haversineM = (a, b, c, d) => haversineKm(a, b, c, d) * 1000;

export function fmtTime(ts) {
  if (!ts) return '--';
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

/**
 * Issue 3 FIX — relativeTime:
 *  < 60 s   → "Just now"
 *  < 60 min → "X min ago"
 *  ≥ 60 min → "X hr Y min ago"  (or "X hr ago" if remainder is 0)
 */
export function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000)     return 'Just now';
  const totalMin = Math.floor(diff / 60_000);
  if (totalMin < 60)     return `${totalMin} min ago`;
  const hrs    = Math.floor(totalMin / 60);
  const remMin = totalMin % 60;
  if (remMin === 0)      return `${hrs} hr ago`;
  return `${hrs} hr ${remMin} min ago`;
}

/**
 * Issue 3 FIX — formatDistance (input: metres)
 *  < 1000 m  → "342 m"
 *  ≥ 1000 m  → "1.23 km"
 */
export function formatDistance(metres) {
  if (!isFinite(metres) || metres < 0) return '0 m';
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(2)} km`;
}

/**
 * Issue 3 FIX — formatDistanceKm (input: kilometres)
 *  < 1 km  → converts to metres → "342 m"
 *  ≥ 1 km  → "1.23 km"
 */
export function formatDistanceKm(km) {
  return formatDistance(km * 1000);
}

/**
 * Issue 3 FIX — formatTripTime (input: milliseconds)
 * Returns { value, unit } for flexible HTML rendering
 *  < 60 min → { value: '14', unit: 'min' }
 *  ≥ 60 min → { value: '1h 30', unit: 'min' }
 */
export function formatTripTime(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  if (totalMin < 60) return { value: `${totalMin}`, unit: 'min' };
  const hrs    = Math.floor(totalMin / 60);
  const remMin = totalMin % 60;
  return { value: `${hrs}h ${remMin}`, unit: 'min' };
}

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* Safe DOM helpers */
export const $       = id    => document.getElementById(id);
export const setText = (id, v) => { const e = $(id); if (e) e.textContent = v; };
export const setHTML = (id, v) => { const e = $(id); if (e) e.innerHTML   = v; };
export const setVal  = (id, v) => { const e = $(id); if (e) e.value       = v; };
export const getTog  = id    => $(id)?.classList.contains('on') ?? false;
export const setTog  = (id, on) => $(id)?.classList.toggle('on', !!on);
