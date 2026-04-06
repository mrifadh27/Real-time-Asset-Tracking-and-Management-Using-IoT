/**
 * src/services/routeService.js
 * Route fetching via OSRM and real-time progress tracking.
 */

import { state } from '../utils/state.js';
import { haversineM } from '../utils/helpers.js';
import { showToast } from '../utils/toast.js';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

class RouteService {
  /**
   * Fetch a driving route from device position to destination.
   * @param {number} oLat  - origin latitude
   * @param {number} oLng  - origin longitude
   * @param {number} dLat  - destination latitude
   * @param {number} dLng  - destination longitude
   * @returns {Promise<{ coords: [number,number][], distKm: string, etaMin: number }|null>}
   */
  async fetchRoute(oLat, oLng, dLat, dLng) {
    const url = `${OSRM_BASE}/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;

    try {
      const res  = await fetch(url);
      const data = await res.json();

      if (data.code !== 'Ok') {
        throw new Error(`OSRM: ${data.code} — ${data.message || ''}`);
      }

      const route  = data.routes[0];
      const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      const distKm = (route.distance / 1000).toFixed(1);
      const etaMin = Math.round(route.duration / 60);

      return { coords, distKm, etaMin };
    } catch (err) {
      console.error('[RouteService] fetchRoute error:', err);
      return null;
    }
  }

  /**
   * Given current device position, find the closest point on the full route
   * and update the "traveled" polyline + percentage label.
   * @param {number} curLat
   * @param {number} curLng
   */
  updateProgress(curLat, curLng) {
    const nr = state.navRoute;
    if (!nr.fullCoords.length || !nr.line) return;

    let minDist = Infinity;
    let minIdx  = 0;

    nr.fullCoords.forEach(([rlat, rlng], i) => {
      const d = haversineM(curLat, curLng, rlat, rlng);
      if (d < minDist) { minDist = d; minIdx = i; }
    });

    const traveled = nr.fullCoords.slice(0, minIdx + 1);
    nr.line.setLatLngs(traveled.length ? traveled : [[curLat, curLng]]);

    const pct = Math.round((minIdx / Math.max(nr.fullCoords.length - 1, 1)) * 100);
    const el  = document.getElementById('route-pct-val');
    if (el) el.textContent = pct;

    // Arrival detection (within 50 m)
    const distToDest = haversineM(curLat, curLng, nr.destLat, nr.destLng);
    if (distToDest < 50) {
      showToast('success', `🏁 Arrived at ${nr.destName}!`);
      window._nextrackApp?.clearRoute();
    }
  }

  /**
   * Remove all route map layers and reset state.
   */
  clearLayers() {
    const nr  = state.navRoute;
    const map = window._nextrackMap;

    ['line', 'lineFull', 'destMarker'].forEach(key => {
      if (nr[key]) {
        try { map?.removeLayer(nr[key]); } catch (_) {}
        nr[key] = null;
      }
    });
  }
}

export const routeService = new RouteService();
