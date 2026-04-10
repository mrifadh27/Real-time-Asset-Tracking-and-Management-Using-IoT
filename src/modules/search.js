/**
 * src/modules/search.js
 * ✨ ENHANCED SEARCH ENGINE — Like Google Maps
 * Features:
 *   - Powerful Nominatim queries with ranking
 *   - Recent searches history
 *   - Current location option
 *   - Category suggestions
 *   - Distance calculation from reference point
 *   - Better result formatting & icons
 *   - Smart result scoring
 */

import { haversineKm } from '../utils/helpers.js';

// ── SEARCH HISTORY STORAGE ──
const HISTORY_KEY = 'vector_search_history';
const MAX_HISTORY = 10;

export function getSearchHistory() {
  const stored = localStorage.getItem(HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function addToSearchHistory(name, lat, lng) {
  if (!name || !lat || !lng) return;
  let history = getSearchHistory();
  // Remove duplicates
  history = history.filter(h => !(h.lat === lat && h.lng === lng));
  // Add new entry at start
  history.unshift({ name, lat, lng, ts: Date.now() });
  // Keep only recent
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearSearchHistory() {
  localStorage.removeItem(HISTORY_KEY);
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
      headers: { 'Accept-Language': 'en' }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const results = await res.json();

    // ✅ ENHANCED: Score and sort results
    return results.map(r => ({
      name: r.name || r.display_name.split(',')[0],
      fullName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      type: _getPlaceType(r),
      icon: _getPlaceIcon(r),
      category: r.category,
      address: _formatAddress(r),
      distance: refLat && refLng ? haversineKm(refLat, refLng, r.lat, r.lon) : null,
      importance: parseFloat(r.importance || 0),
      boundingbox: r.boundingbox,
    })).sort((a, b) => {
      // Sort by: type relevance, distance (if available), importance
      const typeScore = (a.type === 'address' ? 100 : a.type === 'place' ? 50 : 10) - 
                       (b.type === 'address' ? 100 : b.type === 'place' ? 50 : 10);
      if (typeScore !== 0) return typeScore;
      
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return b.importance - a.importance;
    });
  } catch (err) {
    console.error('[search] Error:', err);
    return [];
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
      name: data.address.name || data.address.road || data.address.town || 'Unknown Location',
      fullName: data.display_name,
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      address: _formatAddress(data),
    };
  } catch (err) {
    console.error('[geocode] Error:', err);
    return null;
  }
}

// ── CATEGORY SUGGESTIONS ──
export const PLACE_CATEGORIES = [
  { icon: '🍔', name: 'Restaurants', query: 'restaurant' },
  { icon: '🏨', name: 'Hotels', query: 'hotel' },
  { icon: '⛽', name: 'Gas Stations', query: 'fuel' },
  { icon: '🏥', name: 'Hospitals', query: 'hospital' },
  { icon: '🅿️', name: 'Parking', query: 'parking' },
  { icon: '☕', name: 'Cafes', query: 'cafe' },
  { icon: '🏦', name: 'Banks', query: 'bank' },
  { icon: '🛒', name: 'Supermarkets', query: 'supermarket' },
];

export async function searchCategory(category, refLat, refLng) {
  return searchLocations(category, refLat, refLng, 8);
}

// ── HELPERS ──
function _getPlaceType(result) {
  const category = result.category?.toLowerCase() || '';
  const type = result.type?.toLowerCase() || '';
  
  if (category === 'place') return 'place';
  if (category === 'address' || category === 'building') return 'address';
  if (category === 'amenity') return 'place';
  if (category === 'shop') return 'business';
  if (category === 'leisure' || category === 'tourism') return 'landmark';
  
  return 'location';
}

function _getPlaceIcon(result) {
  const category = result.category?.toLowerCase() || '';
  const type = result.type?.toLowerCase() || '';
  
  // Address
  if (category === 'building' || category === 'address') return '🏠';
  if (type === 'house' || type === 'apartment') return '🏠';
  
  // Shop/Business
  if (category === 'shop') {
    if (type === 'supermarket') return '🛒';
    if (type === 'bar' || type === 'pub') return '🍺';
    if (type === 'restaurant') return '🍔';
    return '🏪';
  }
  
  // Amenity
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
  
  // Tourism/Leisure
  if (category === 'tourism' || category === 'leisure') {
    if (type === 'hotel' || type === 'guest_house') return '🏨';
    if (type === 'attraction') return '🎯';
    if (type === 'museum') return '🖼️';
    if (type === 'monument') return '🏛️';
    if (type === 'park') return '🌳';
    return '📸';
  }
  
  // Place
  if (category === 'place') {
    if (type === 'city' || type === 'town') return '🏙️';
    if (type === 'village') return '🏘️';
    if (type === 'county' || type === 'region') return '🗺️';
    return '📍';
  }
  
  // Default
  return '📍';
}

function _formatAddress(result) {
  if (typeof result === 'object' && result.address) {
    const addr = result.address;
    const parts = [];
    if (addr.road) parts.push(addr.road);
    if (addr.town || addr.city) parts.push(addr.town || addr.city);
    if (addr.state) parts.push(addr.state);
    return parts.slice(0, 2).join(', ') || result.display_name.split(',').slice(1, 3).join(',').trim();
  }
  if (typeof result === 'string') return result;
  return '';
}
