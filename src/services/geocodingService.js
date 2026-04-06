/**
 * src/services/geocodingService.js
 * Professional geocoding / reverse-geocoding via Nominatim.
 * Includes request deduplication, abort-on-supersede, and structured results.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const DEFAULT_LIMIT  = 6;
const USER_AGENT     = 'NexTrack-v5/1.0 (IoT Asset Tracker)';

/** @type {AbortController|null} */
let currentController = null;

/**
 * @typedef {Object} GeoResult
 * @property {number} lat
 * @property {number} lng
 * @property {string} displayName  - full display name
 * @property {string} primaryName  - first part (city / place name)
 * @property {string} secondaryName - rest of display name (country etc.)
 * @property {string} type
 * @property {string} osmId
 */

/**
 * Forward geocode a search query.
 * Aborts any in-flight request before starting a new one.
 * @param {string} query
 * @param {number} [limit=6]
 * @returns {Promise<GeoResult[]>}
 */
export async function searchPlaces(query, limit = DEFAULT_LIMIT) {
  if (!query || query.trim().length < 2) return [];

  // Abort previous request
  currentController?.abort();
  currentController = new AbortController();

  const params = new URLSearchParams({
    q:              query.trim(),
    format:         'json',
    limit:          String(limit),
    addressdetails: '1',
  });

  try {
    const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent':       USER_AGENT,
      },
      signal: currentController.signal,
    });

    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

    const raw = await res.json();
    return raw.map(normalise);
  } catch (err) {
    if (err.name === 'AbortError') return []; // superseded — silently drop
    console.error('[GeocodingService] Search error:', err);
    return [];
  }
}

/**
 * Reverse geocode a coordinate pair.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<GeoResult|null>}
 */
export async function reverseGeocode(lat, lng) {
  const params = new URLSearchParams({
    lat:            String(lat),
    lon:            String(lng),
    format:         'json',
    addressdetails: '1',
  });

  try {
    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    return raw.display_name ? normalise(raw) : null;
  } catch (err) {
    console.error('[GeocodingService] Reverse geocode error:', err);
    return null;
  }
}

/**
 * @param {Object} r - raw Nominatim result
 * @returns {GeoResult}
 */
function normalise(r) {
  const parts        = (r.display_name || '').split(', ');
  const primaryName  = parts[0] || r.display_name || '';
  const secondaryName = parts.slice(1, 3).join(', ');

  return {
    lat:           parseFloat(r.lat),
    lng:           parseFloat(r.lon),
    displayName:   r.display_name || '',
    primaryName,
    secondaryName,
    type:          r.type  || r.class || '',
    osmId:         `${r.osm_type || 'N'}${r.osm_id || ''}`,
  };
}
