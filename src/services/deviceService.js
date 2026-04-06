/**
 * src/services/deviceService.js
 * Processes raw Firebase device data into typed Device objects.
 * Also manages speed history, distance, trip timing, and offline queue.
 */

import { state, mapLayers } from '../utils/state.js';
import { toFloat, toInt, toBool, haversineKm, haversineM } from '../utils/helpers.js';
import { alertService } from './alertService.js';
import { geofenceService } from './geofenceService.js';

/**
 * @typedef {Object} Device
 * @property {string}  id
 * @property {string}  name
 * @property {'online'|'offline'|'idle'} status
 * @property {number}  lat
 * @property {number}  lng
 * @property {number}  altitude
 * @property {number}  heading
 * @property {number}  hdop
 * @property {number}  satellites
 * @property {number}  accel
 * @property {number}  pitch
 * @property {number}  roll
 * @property {number}  speed
 * @property {number}  totalDist
 * @property {boolean} gpsValid
 * @property {boolean} gpsCached
 * @property {string}  vehicleState
 * @property {number}  _lastUpdate
 */

class DeviceService {
  /**
   * Process raw data for one device.
   * @param {string} id
   * @param {Object} raw  - raw Firebase snapshot value
   * @param {number} now  - Date.now()
   */
  process(id, raw, now) {
    const lat       = toFloat(raw.lat);
    const lng       = toFloat(raw.lng);
    const alt       = toFloat(raw.altitude);
    const hdop      = toFloat(raw.hdop) || 99.9;
    const sats      = toInt(raw.satellites);
    const hdg       = toFloat(raw.heading);
    const accel     = toFloat(raw.accel);
    const pitch     = toFloat(raw.pitch);
    const roll      = toFloat(raw.roll);
    const gpsValid  = toBool(raw.gpsValid);
    const gpsCached = toBool(raw.gpsCached);

    const prev = state.devices[id];

    // ── Speed: use firmware value first, compute fallback ──
    let speed = toFloat(raw.speed);
    if (speed <= 0 && prev && prev.lat !== 0 && lat !== 0) {
      const dt = (now - (prev._lastUpdate || now - 1000)) / 1000;
      if (dt > 0 && dt < 60) {
        const computed = (haversineM(prev.lat, prev.lng, lat, lng) / dt) * 3.6;
        speed = Math.min(computed, 300);
      }
    }
    speed = parseFloat(speed.toFixed(1));

    // ── Accumulated distance (only on valid GPS, reject GPS jumps) ──
    let addDist = 0;
    if (prev && prev.lat !== 0 && lat !== 0 && gpsValid) {
      const d = haversineKm(prev.lat, prev.lng, lat, lng);
      if (d < 0.5) addDist = d; // ignore jumps > 500 m (GPS glitch guard)
    }
    const totalDist = parseFloat(((prev ? prev.totalDist : 0) + addDist).toFixed(3));

    // ── Trip start / max speed ──
    if (!state.tripStart[id]) state.tripStart[id] = now;
    if (!state.maxSpeed[id] || speed > state.maxSpeed[id]) state.maxSpeed[id] = speed;

    // ── Overspeed alert ──
    if (speed > state.settings.speedThreshold && speed > 5) {
      alertService.fire(id, 'speed', `Overspeed: ${speed.toFixed(1)} km/h`, raw.name || id);
    }

    /** @type {Device} */
    const device = {
      id,
      name:         raw.name || `Device ${id}`,
      status:       'online',
      lat,  lng,
      altitude:     alt,
      hdop,
      satellites:   sats,
      heading:      hdg,
      accel,
      pitch,
      roll,
      speed,
      totalDist,
      gpsValid,
      gpsCached,
      vehicleState: raw.vehicleState || 'parked',
      _lastUpdate:  now,
    };

    state.devices[id] = device;

    // ── Route points (real GPS fixes only) ──
    if (!mapLayers.routePts[id]) mapLayers.routePts[id] = [];
    if (lat !== 0 && lng !== 0 && gpsValid) {
      mapLayers.routePts[id].push([lat, lng]);
      if (mapLayers.routePts[id].length > 500) mapLayers.routePts[id].shift();
    }

    // ── Speed history ──
    if (!state.history[id]) state.history[id] = [];
    state.history[id].push({ speed, accel, ts: now });
    if (state.history[id].length > 20) state.history[id].shift();

    // ── Geofence check & init ──
    geofenceService.checkDevice(id, lat, lng, gpsValid);
    if (!state.geofences[id]) {
      state.geofences[id] = {
        lat:    lat || 7.2906,
        lng:    lng || 80.6337,
        radius: 500,
        active: true,
        circle: null,
      };
    }

    // ── Offline buffer ──
    if (!gpsValid && state.settings.offlineEnabled) {
      this._bufferOffline(id, raw, now);
    }

    this._resetOfflineTimer(id);

    // ── Auto-centre map on first device seen ──
    if (!state.firstDeviceSeen && lat !== 0 && lng !== 0) {
      state.firstDeviceSeen = true;
      window._nextrackMap?.setView([lat, lng], 15);
      state.selectedId = id;
    }
  }

  /** @private */
  _bufferOffline(id, raw, now) {
    if (!state.offlineQueue[id]) state.offlineQueue[id] = [];
    state.offlineQueue[id].push({
      lat:        toFloat(raw.lat),
      lng:        toFloat(raw.lng),
      speed:      toFloat(raw.speed),
      accel:      toFloat(raw.accel),
      satellites: toInt(raw.satellites),
      altitude:   toFloat(raw.altitude),
      ts:         now,
      offline:    true,
    });
    const maxBuf = state.settings.offlineBuffer || 200;
    if (state.offlineQueue[id].length > maxBuf) state.offlineQueue[id].shift();
  }

  /** @private */
  _resetOfflineTimer(id) {
    clearTimeout(state.offlineTimers[id]);
    state.offlineTimers[id] = setTimeout(() => {
      const dev = state.devices[id];
      if (!dev) return;
      dev.status = 'offline';
      // Notify via custom event so UI can react
      window.dispatchEvent(new CustomEvent('device:offline', { detail: { id } }));
      alertService.fire(id, 'offline', `${dev.name} went offline`);
    }, state.settings.offlineTimeout * 1000);
  }

  /**
   * Get total queued offline record count.
   * @returns {number}
   */
  offlineQueueCount() {
    return Object.values(state.offlineQueue).reduce((s, q) => s + q.length, 0);
  }
}

export const deviceService = new DeviceService();
