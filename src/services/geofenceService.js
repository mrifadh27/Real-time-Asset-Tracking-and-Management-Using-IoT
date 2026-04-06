/**
 * src/services/geofenceService.js
 * Per-device geofence management: storage, drawing, checking.
 */

import { state } from '../utils/state.js';
import { haversineM } from '../utils/helpers.js';
import { alertService } from './alertService.js';

class GeofenceService {
  /**
   * Return (and lazily initialise) the geofence for a device.
   * @param {string} id
   * @returns {{ lat: number, lng: number, radius: number, active: boolean, circle: L.Circle|null }}
   */
  get(id) {
    if (!state.geofences[id]) {
      state.geofences[id] = {
        lat:    7.2906,
        lng:    80.6337,
        radius: 500,
        active: true,
        circle: null,
      };
    }
    return state.geofences[id];
  }

  /**
   * Draw (or redraw) the geofence circle for a device.
   * Requires window._nextrackMap to be set.
   * @param {string} id
   */
  draw(id) {
    const map = window._nextrackMap;
    if (!map) return;

    const gf = this.get(id);
    if (gf.circle) {
      try { map.removeLayer(gf.circle); } catch (_) {}
      gf.circle = null;
    }
    if (!gf.active) return;

    gf.circle = L.circle([gf.lat, gf.lng], {
      radius:      gf.radius,
      color:       '#00E5FF',
      weight:      1.5,
      opacity:     0.5,
      fillColor:   '#00E5FF',
      fillOpacity: 0.04,
      dashArray:   '6 4',
    }).addTo(map);
  }

  /** Draw all known geofences. */
  drawAll() {
    Object.keys(state.geofences).forEach(id => this.draw(id));
  }

  /**
   * Check whether a device is inside its geofence and fire an alert if not.
   * @param {string} id
   * @param {number} lat
   * @param {number} lng
   * @param {boolean} gpsValid
   */
  checkDevice(id, lat, lng, gpsValid) {
    const gf = this.get(id);
    if (!gf.active || !lat || !lng || lat === 0 || !gpsValid) return;

    const dist = haversineM(lat, lng, gf.lat, gf.lng);
    if (dist > gf.radius) {
      alertService.fire(
        id,
        'geofence',
        `${state.devices[id]?.name || id} outside geofence (${Math.round(dist)} m away)`
      );
    }
  }

  /**
   * Save all geofences from the settings form inputs.
   */
  saveFromForm() {
    Object.keys(state.geofences).forEach(id => {
      const latEl = document.getElementById(`gf-lat-${id}`);
      const lngEl = document.getElementById(`gf-lng-${id}`);
      const radEl = document.getElementById(`gf-rad-${id}`);
      const actEl = document.getElementById(`gf-act-${id}`);
      const gf    = this.get(id);

      if (latEl) gf.lat    = parseFloat(latEl.value)  || gf.lat;
      if (lngEl) gf.lng    = parseFloat(lngEl.value)  || gf.lng;
      if (radEl) gf.radius = parseInt(radEl.value, 10) || gf.radius;
      if (actEl) gf.active = actEl.classList.contains('on');

      this.draw(id);
    });
  }
}

export const geofenceService = new GeofenceService();
