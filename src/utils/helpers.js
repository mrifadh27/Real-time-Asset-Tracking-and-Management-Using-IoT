/**
 * src/utils/helpers.js
 * Pure utility functions — no side effects, no DOM access, no state.
 */

export const toF  = v  => {
  const n = parseFloat(v);
  // Check for valid GPS coordinates
  if (!isFinite(n)) return 0;
  if (isNaN(n)) return 0;
  return n;
};
export const toI  = v  => { const n = parseInt(v, 10); return isFinite(n) ? n : 0; };
export const toBool = v => v === true || v === 'true';
export const isValidGPS = (lat, lng) => {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (!isFinite(latNum) || !isFinite(lngNum)) return false;
  if (isNaN(latNum) || isNaN(lngNum)) return false;
  if (latNum < -90 || latNum > 90) return false;   // invalid latitude
  if (lngNum < -180 || lngNum > 180) return false; // invalid longitude
  // Reject 0,0 only if both are exactly zero (unlikely real GPS)
  if (latNum === 0.0 && lngNum === 0.0) return false;
  return true;
};
export const clamp  = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export function haversineKm(lat1, lon1, lat2, lon2) {
  // ✅ IMPROVED: Validate inputs to prevent NaN propagation
  if (!isValidGPS(lat1, lon1) || !isValidGPS(lat2, lon2)) return 0;
  
  const R = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dL / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180)
            * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dG / 2) ** 2;
  const result = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return isFinite(result) ? result : 0;
}
export const haversineM = (a, b, c, d) => haversineKm(a, b, c, d) * 1000;

export function fmtTime(ts) {
  if (!ts) return '--';
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

export function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000)  return 'Just now';
  if (diff < 3600000) return `${Math.round(diff / 60000)} min ago`;
  return fmtTime(ts);
}

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* Safe DOM helpers */
export const $  = id  => document.getElementById(id);
export const setText = (id, v) => { const e = $(id); if (e) e.textContent = v; };
export const setHTML = (id, v) => { const e = $(id); if (e) e.innerHTML  = v; };
export const setVal  = (id, v) => { const e = $(id); if (e) e.value      = v; };
export const getTog  = id => $(id)?.classList.contains('on') ?? false;
export const setTog  = (id, on) => $(id)?.classList.toggle('on', !!on);
