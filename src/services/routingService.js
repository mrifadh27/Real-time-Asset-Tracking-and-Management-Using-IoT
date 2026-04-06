/**
 * src/services/routingService.js
 * Route planning via OSRM public API.
 * Handles fetch, polyline display, progress tracking, and arrival detection.
 */

import { state } from '../utils/state.js';
import { haversineM } from '../utils/helpers.js';
import { showToast } from '../utils/toast.js';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

class RoutingService {
  /**
   * Fetch and display a route from the selected device to a destination.
   * @param {number} destLat
   * @param {number} destLng
   * @param {string} destName
   * @returns {Promise<void>}
   */
  async fetchRoute(destLat, destLng, destName) {
    const map = window._nextrackMap;
    if (!map) return;

    const dev = state.devices[state.selectedId];
    if (!dev) { showToast('warning', '⚠️ Device not found'); return; }
    if (!dev.lat || dev.lat === 0) {
      showToast('warning', '⚠️ Device has no GPS position yet. Waiting for fix…');
      return;
    }

    showToast('info', '🗺️ Fetching route…');
    this.clearRoute();

    try {
      const url = `${OSRM_BASE}/${dev.lng},${dev.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

      const data = await res.json();
      if (data.code !== 'Ok') throw new Error(`OSRM error: ${data.code}`);

      const route   = data.routes[0];
      const coords  = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const distKm  = (route.distance / 1000).toFixed(1);
      const etaMin  = Math.round(route.duration / 60);

      // Store route state
      state.navRoute.destLat    = destLat;
      state.navRoute.destLng    = destLng;
      state.navRoute.destName   = destName;
      state.navRoute.fullCoords = coords;
      state.navRoute.totalDist  = parseFloat(distKm);

      // Full route (dashed)
      state.navRoute.lineFull = L.polyline(coords, {
        color: '#00E5FF', weight: 4, opacity: 0.45, dashArray: '8 6',
      }).addTo(map);

      // Traveled portion (solid green)
      state.navRoute.line = L.polyline([[dev.lat, dev.lng]], {
        color: '#00D97E', weight: 5, opacity: 0.9,
      }).addTo(map);

      // Destination marker
      state.navRoute.destMarker = L.marker([destLat, destLng], {
        icon: L.divIcon({
          className: '',
          iconSize:  [38, 38],
          iconAnchor: [19, 38],
          html: `<div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center">
            <div style="width:30px;height:30px;border-radius:50%;background:rgba(255,107,53,.2);
              border:2px solid #FF6B35;display:flex;align-items:center;justify-content:center;
              font-size:16px;box-shadow:0 0 12px rgba(255,107,53,.5)">🏁</div>
          </div>`,
        }),
      }).addTo(map)
        .bindPopup(`<b>Destination</b><br>${destName}<br>${distKm} km · ~${etaMin} min`);

      map.fitBounds(
        L.latLngBounds([[dev.lat, dev.lng], [destLat, destLng]]),
        { padding: [50, 50] }
      );

      showToast('success', `✅ Route: ${distKm} km · ~${etaMin} min`);

      // Notify UI to update route meta panel
      window.dispatchEvent(new CustomEvent('route:loaded', {
        detail: { distKm, etaMin },
      }));

    } catch (err) {
      console.error('[RoutingService]', err);
      showToast('danger', '❌ Could not fetch route. Check internet connection.');
    }
  }

  /**
   * Update the traveled-portion polyline based on the device's current position.
   * @param {number} curLat
   * @param {number} curLng
   */
  updateProgress(curLat, curLng) {
    const { fullCoords, line, destLat, destLng, destName } = state.navRoute;
    if (!fullCoords.length || !line) return;

    // Find closest point on the route polyline
    let minDist = Infinity;
    let minIdx  = 0;
    fullCoords.forEach(([rlat, rlng], i) => {
      const d = haversineM(curLat, curLng, rlat, rlng);
      if (d < minDist) { minDist = d; minIdx = i; }
    });

    const traveled = fullCoords.slice(0, minIdx + 1);
    line.setLatLngs(traveled.length ? traveled : [[curLat, curLng]]);

    const pct = Math.round((minIdx / Math.max(fullCoords.length - 1, 1)) * 100);
    window.dispatchEvent(new CustomEvent('route:progress', { detail: { pct } }));

    // Arrival check (within 50 m)
    if (destLat && haversineM(curLat, curLng, destLat, destLng) < 50) {
      showToast('success', `🏁 Arrived at ${destName}!`);
      this.clearRoute();
    }
  }

  /** Remove all route layers from the map. */
  clearRoute() {
    const map = window._nextrackMap;
    const nr  = state.navRoute;

    ['line', 'lineFull', 'destMarker'].forEach(key => {
      if (nr[key]) {
        try { map?.removeLayer(nr[key]); } catch (_) {}
        nr[key] = null;
      }
    });

    nr.destLat    = null;
    nr.destLng    = null;
    nr.destName   = '';
    nr.fullCoords = [];
    nr.totalDist  = 0;

    window.dispatchEvent(new CustomEvent('route:cleared'));
  }
}

export const routingService = new RoutingService();
