/**
 * src/modules/search.js
 * Enhanced Search Engine — Nominatim autocomplete with history.
 *
 * FIXES:
 *  ✅ CAT-12: All localStorage calls wrapped in try/catch (private/incognito mode safety)
 */

import { haversineKm } from '../utils/helpers.js';

// ── SEARCH HISTORY STORAGE ──
const HISTORY_KEY = 'vector_search_history';
const MAX_HISTORY = 10;

/* ── Safe localStorage helpers ── */
function lsGet(key, fallback = null) {
  try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, val); } catch (_) {}
}
function lsRemove(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}

export function getSearchHistory() {
  try {
    const stored = lsGet(HISTORY_KEY, '[]');
    return JSON.parse(stored || '[]');
  } catch (_) { return []; }
}

export function addToSearchHistory(name, lat, lng) {
  if (!name || !lat || !lng) return;
  try {
    let history = getSearchHistory();
    history = history.filter(h => !(h.lat === lat && h.lng === lng));
    history.unshift({ name, lat, lng, ts: Date.now() });
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    lsSet(HISTORY_KEY, JSON.stringify(history));
  } catch (_) {}
}

export function clearSearchHistory() {
  lsRemove(HISTORY_KEY);
}

// ── POWERFUL NOMINATIM SEARCH ──
export async function searchLocations(query, refLat = null, refLng = null, limit = 12) {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', limit);
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('extratags', '1');
    url.searchParams.set('namedetails', '1');

    const res = await fetch(url.toString(), {
      headers: { 'Accept-Language': 'en' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const results = await res.json();
    if (!Array.isArray(results)) return [];

    return results.map(r => ({
      name:        r.name || (r.display_name || '').split(',')[0],
      fullName:    r.display_name || '',
      lat:         parseFloat(r.lat),
      lng:         parseFloat(r.lon),
      type:        _getPlaceType(r),
      icon:        _getPlaceIcon(r),
      category:    r.category,
      address:     _formatAddress(r),
      distance:    (refLat != null && refLng != null)
                     ? haversineKm(refLat, refLng, parseFloat(r.lat), parseFloat(r.lon))
                     : null,
      importance:  parseFloat(r.importance || 0),
      boundingbox: r.boundingbox,
    })).sort((a, b) => {
      const typeScore = (_typeRank(a.type)) - (_typeRank(b.type));
      if (typeScore !== 0) return typeScore;
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      return b.importance - a.importance;
    });
  } catch (err) {
    console.error('[search] Error:', err);
    return [];
  }
}

function _typeRank(type) {
  switch (type) {
    case 'address':  return 1;
    case 'place':    return 2;
    case 'business': return 3;
    case 'landmark': return 4;
    default:         return 5;
  }
}

// ── REVERSE GEOCODING ──
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      name:     data.address?.name || data.address?.road || data.address?.town || 'Unknown Location',
      fullName: data.display_name || '',
      lat:      parseFloat(data.lat),
      lng:      parseFloat(data.lon),
      address:  _formatAddress(data),
    };
  } catch (err) {
    console.error('[geocode] Error:', err);
    return null;
  }
}

// ── CATEGORY SUGGESTIONS ──
export const PLACE_CATEGORIES = [
  { icon: '🍔', name: 'Restaurants', query: 'restaurant' },
  { icon: '🏨', name: 'Hotels',      query: 'hotel' },
  { icon: '⛽', name: 'Gas Stations',query: 'fuel' },
  { icon: '🏥', name: 'Hospitals',   query: 'hospital' },
  { icon: '🅿️', name: 'Parking',    query: 'parking' },
  { icon: '☕', name: 'Cafes',       query: 'cafe' },
  { icon: '🏦', name: 'Banks',       query: 'bank' },
  { icon: '🛒', name: 'Supermarkets',query: 'supermarket' },
];

export async function searchCategory(category, refLat, refLng) {
  return searchLocations(category, refLat, refLng, 8);
}

// ── HELPERS ──
function _getPlaceType(result) {
  const category = (result.category || '').toLowerCase();
  if (category === 'place') return 'place';
  if (category === 'address' || category === 'building') return 'address';
  if (category === 'amenity') return 'place';
  if (category === 'shop') return 'business';
  if (category === 'leisure' || category === 'tourism') return 'landmark';
  return 'location';
}

function _getPlaceIcon(result) {
  const category = (result.category || '').toLowerCase();
  const type     = (result.type || '').toLowerCase();

  if (category === 'building' || category === 'address') return '🏠';
  if (type === 'house' || type === 'apartment') return '🏠';

  if (category === 'shop') {
    if (type === 'supermarket') return '🛒';
    if (type === 'bar' || type === 'pub') return '🍺';
    if (type === 'restaurant') return '🍔';
    return '🏪';
  }

  if (category === 'amenity') {
    if (type === 'restaurant' || type === 'cafe' || type === 'fast_food') return '🍽️';
    if (type === 'hospital' || type === 'pharmacy') return '🏥';
    if (type === 'parking' || type === 'parking_space') return '🅿️';
    if (type === 'fuel') return '⛽';
    if (type === 'bank' || type === 'atm') return '🏦';
    if (type === 'library') return '📚';
    if (type === 'school' || type === 'university') return '🎓';
    if (type === 'police') return '🚔';
    if (type === 'fire_station') return '🚒';
    return '📍';
  }

  if (category === 'tourism' || category === 'leisure') {
    if (type === 'hotel' || type === 'guest_house') return '🏨';
    if (type === 'attraction') return '🎯';
    if (type === 'museum') return '🖼️';
    if (type === 'monument') return '🏛️';
    if (type === 'park') return '🌳';
    return '📸';
  }

  if (category === 'place') {
    if (type === 'city' || type === 'town') return '🏙️';
    if (type === 'village') return '🏘️';
    if (type === 'county' || type === 'region') return '🗺️';
    return '📍';
  }

  return '📍';
}

function _formatAddress(result) {
  if (result && typeof result === 'object' && result.address) {
    const addr  = result.address;
    const parts = [];
    if (addr.road)              parts.push(addr.road);
    if (addr.town || addr.city) parts.push(addr.town || addr.city);
    if (addr.state)             parts.push(addr.state);
    if (parts.length)           return parts.slice(0, 2).join(', ');
    return (result.display_name || '').split(',').slice(1, 3).join(',').trim();
  }
  if (typeof result === 'string') return result;
  return '';
}
