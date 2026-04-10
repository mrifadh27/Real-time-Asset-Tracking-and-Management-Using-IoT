/**
 * src/modules/devices.js
 * Processes raw Firebase device data.
 * Detects ALL state transitions and fires appropriate alerts:
 *   offline → online  : 'online' alert
 *   inside → outside  : 'geofence' alert  (via geofence module)
 *   outside → inside  : 'geofence_enter'  (via geofence module)
 *   normal → overspeed: 'speed' alert
 *   overspeed → normal: 'speed_normal' alert
 *   normal → crash    : 'crash' alert
 *   crash → clear     : 'crash_clear' alert
 */

import { S, mapLayers }   from '../utils/state.js';
import { toF, toI, toBool, isValidGPS, haversineKm, haversineM } from '../utils/helpers.js';
import { fireAlert }      from './alerts.js';
import { checkGeofence, getGeofence } from './geofence.js';
import { batchUpdate }    from '../config/firebase.js';
import { showToast }      from '../utils/toast.js';
import { emit, EV }       from '../utils/events.js';

// ✅ CONSTANTS
const MIN_STATE_TRANSITION_TIME = 5000;   // 5 s min between transition alerts

/* ────────────────────────────────────────
   PROCESS ONE DEVICE
──────────────────────────────────────── */
export function processDevice(id, raw, now) {
  const lat     = toF(raw.lat);
  const lng     = toF(raw.lng);
  const alt     = toF(raw.altitude);
  const hdop    = toF(raw.hdop) || 99.9;
  const sats    = toI(raw.satellites);
  const hdg     = toF(raw.heading);
  const accel   = toF(raw.accel);
  const pitch   = toF(raw.pitch);
  const roll    = toF(raw.roll);
  const gpsValid  = toBool(raw.gpsValid);
  const gpsCached = toBool(raw.gpsCached);

  // ✅ Validate GPS before processing
  if (!isValidGPS(lat, lng)) {
    console.warn(`[GPS] Invalid coordinates for ${id}: lat=${lat}, lng=${lng}`);
    return;
  }

  const prev           = S.devices[id];
  const prevStatus     = S.prevStatus[id] || 'online';
  const lastTransition = S.lastStatusTransition[id] || 0;

  /* ── Speed ── */
  let speed = toF(raw.speed);
  if (speed <= 0 && prev && prev.lat !== 0 && lat !== 0) {
    const dt = (now - (prev._lastUpdate || now - 1000)) / 1000;
    if (dt > 0 && dt < 60) {
      speed = Math.min((haversineM(prev.lat, prev.lng, lat, lng) / dt) * 3.6, 300);
    }
  }
  speed = parseFloat(speed.toFixed(1));

  /* ── Distance (GPS glitch guard: reject > 500 m jumps) ── */
  let addDist = 0;
  if (prev && prev.lat !== 0 && lat !== 0 && gpsValid) {
    const d = haversineKm(prev.lat, prev.lng, lat, lng);
    if (d < 0.5) addDist = d;
  }
  const totalDist = parseFloat(((prev?.totalDist || 0) + addDist).toFixed(3));

  if (!S.tripStart[id]) S.tripStart[id] = now;
  if (!S.maxSpeed[id] || speed > S.maxSpeed[id]) S.maxSpeed[id] = speed;

  /* ── Build device object ── */
  const name = raw.name || `Device ${id}`;
  const device = {
    id, name,
    status: 'online',
    lat, lng,
    altitude:     alt,
    hdop,
    satellites:   sats,
    heading:      String(hdg).includes('NaN') ? 0 : Math.max(0, Math.min(360, hdg)),
    accel, pitch, roll,
    speed,
    totalDist,
    gpsValid,
    gpsCached,
    vehicleState: raw.vehicleState || 'parked',
    _lastUpdate:  now,
  };
  S.devices[id] = device;

  /* ── 1. BACK ONLINE detection ── */
  if (prevStatus === 'offline') {
    const timeSinceLastTransition = now - lastTransition;
    if (timeSinceLastTransition > MIN_STATE_TRANSITION_TIME) {
      if (!S.onlineAlertSent[id]) {
        // ✅ FIX BUG 1: Remove offline alerts from ALL three stores.
        // Previously only localAlerts + display list were cleared, so
        // mergeAndRender() pulled the old offline alert back from
        // S.firebaseAlerts, making it persist even after device was online.
        _clearOfflineAlerts(id);

        fireAlert(id, 'online', `${name} is back online`, name);
        S.onlineAlertSent[id]  = true;
        S.offlineAlertSent[id] = false;
        S.lastStatusTransition[id] = now;
      }
    }
  }

  // ✅ Clear offline timer on every live update
  clearTimeout(S.offlineTimers[id]);
  S.offlineTimers[id] = null;

  S.prevStatus[id] = 'online';

  /* ── 2. Route history ── */
  if (!mapLayers.routePts[id]) mapLayers.routePts[id] = [];
  if (lat !== 0 && lng !== 0 && gpsValid) {
    mapLayers.routePts[id].push([lat, lng]);
    if (mapLayers.routePts[id].length > 500) mapLayers.routePts[id].shift();
  }

  /* ── 3. Speed history ── */
  if (!S.history[id]) S.history[id] = [];
  S.history[id].push({ speed, accel, ts: now });
  if (S.history[id].length > 20) S.history[id].shift();

  /* ── 4. OVERSPEED / SPEED NORMAL ── */
  const wasOver = S.overspeedTracker[id] === true;
  const isOver  = speed > S.settings.speedThreshold && speed > 5;
  if (isOver && !wasOver) {
    S.overspeedTracker[id] = true;
    fireAlert(id, 'speed', `Overspeed: ${speed.toFixed(1)} km/h on ${name}`, name);
  } else if (!isOver && wasOver) {
    S.overspeedTracker[id] = false;
    fireAlert(id, 'speed_normal', `Speed normalised: ${speed.toFixed(1)} km/h on ${name}`, name);
  }

  /* ── 5. CRASH / CRASH_CLEAR ── */
  const wasCrash = S.crashTracker[id] === true;
  const isCrash  = accel > 0 && accel > S.settings.crashThreshold;
  if (isCrash && !wasCrash) {
    S.crashTracker[id] = true;
    fireAlert(id, 'crash', `Hard impact! ${accel.toFixed(2)}g on ${name}`, name);
  } else if (!isCrash && wasCrash) {
    S.crashTracker[id] = false;
    fireAlert(id, 'crash_clear', `Impact cleared on ${name}`, name);
  }

  /* ── 6. GEOFENCE check ── */
  checkGeofence(id, lat, lng, gpsValid);

  /* ── 7. Init geofence if brand new device ── */
  if (!S.geofences[id]) {
    S.geofences[id] = {
      lat: lat || 7.2906, lng: lng || 80.6337,
      radius: 500, active: true,
      isSet:  false,
      circle: null,
    };
  }

  /* ── 8. Offline buffer ── */
  if (!gpsValid && S.settings.offlineEnabled) {
    _bufferOffline(id, raw, now);
  }

  /* ── 9. Reset offline timer ── */
  _resetOfflineTimer(id);

  /* ── 10. Auto-centre map on first device ── */
  if (!S.firstDeviceSeen && lat !== 0 && lng !== 0) {
    S.firstDeviceSeen = true;
    window._vectorMap?.setView([lat, lng], 15);
    S.selectedId = id;
  }
}

/* ────────────────────────────────────────
   OFFLINE TIMER
──────────────────────────────────────── */
function _resetOfflineTimer(id) {
  const dev = S.devices[id];
  if (!dev || dev.status === 'offline') return;

  clearTimeout(S.offlineTimers[id]);

  const timeoutMs = (S.settings.offlineTimeout || 90) * 1000;

  S.offlineTimers[id] = setTimeout(() => {
    const dev = S.devices[id];
    if (!dev || dev.status === 'offline') return;
    if (S.offlineAlertSent[id]) return;

    dev.status       = 'offline';
    S.prevStatus[id] = 'offline';
    S.offlineAlertSent[id] = true;
    S.onlineAlertSent[id]  = false; // allow future online alert

    // ✅ FIX BUG 2: Reset the geofence tracker when device goes offline.
    // Without this, if the device was "inside" (tracker = false) before
    // going offline and returns to the same zone, checkGeofence would
    // see tracker=false and skip the geofence_enter alert entirely.
    // Setting to undefined forces a fresh evaluation on next update,
    // so the correct alert fires based on actual position after reconnect.
    delete S.geofenceExitTracker[id];

    S.lastStatusTransition[id] = Date.now();

    emit(EV.DEVICES_UPDATED);
    fireAlert(id, 'offline', `${dev.name} went offline`);
  }, timeoutMs);
}

/* ────────────────────────────────────────
   CLEAR OFFLINE ALERTS — ALL THREE STORES
──────────────────────────────────────── */
function _clearOfflineAlerts(id) {
  const isMatch = a => a.deviceId === id && a.type === 'offline';

  // ✅ CRITICAL FIX: Must also purge from firebaseAlerts.
  // Old code only cleaned localAlerts + display list, so mergeAndRender()
  // re-pulled the offline alert from firebaseAlerts every time it ran.
  const fbBefore  = S.firebaseAlerts.length;
  S.firebaseAlerts = S.firebaseAlerts.filter(a => !isMatch(a));

  const locBefore = S.localAlerts.length;
  S.localAlerts   = S.localAlerts.filter(a => !isMatch(a));

  const dispBefore = S.alerts.length;
  S.alerts         = S.alerts.filter(a => !isMatch(a));

  const cleared = S.firebaseAlerts.length < fbBefore
               || S.localAlerts.length    < locBefore
               || S.alerts.length         < dispBefore;

  if (cleared) emit(EV.ALERT_FIRED, {});
}

/* ────────────────────────────────────────
   OFFLINE BUFFER
──────────────────────────────────────── */
function _bufferOffline(id, raw, now) {
  if (!S.settings.offlineEnabled) return;
  if (!S.offlineQueue[id]) S.offlineQueue[id] = [];
  S.offlineQueue[id].push({
    lat:        toF(raw.lat),
    lng:        toF(raw.lng),
    speed:      toF(raw.speed),
    accel:      toF(raw.accel),
    satellites: toI(raw.satellites),
    altitude:   toF(raw.altitude),
    ts: now, offline: true,
  });
  const max = S.settings.offlineBuffer || 200;
  if (S.offlineQueue[id].length > max) S.offlineQueue[id].shift();
}

export function offlineQueueTotal() {
  return Object.values(S.offlineQueue).reduce((s, q) => s + q.length, 0);
}

export async function syncOfflineQueue() {
  const total = offlineQueueTotal();
  if (total === 0 || !S.settings.autoSync) return;

  document.getElementById('offline-sync-bar')?.classList.add('show');
  showToast('info', `🔄 Syncing ${total} offline records…`);

  const promises = [];
  Object.entries(S.offlineQueue).forEach(([id, queue]) => {
    if (!queue.length) return;
    const batch = {};
    queue.forEach((rec, i) => {
      batch[`offline_${id}_${rec.ts}_${i}`] = { ...rec, deviceId: id };
    });
    promises.push(
      batchUpdate('/offline_data', batch).then(() => {
        S.offlineQueue[id] = [];
        _updateOfflineUI();
      })
    );
  });

  try {
    await Promise.all(promises);
    document.getElementById('offline-sync-bar')?.classList.remove('show');
    const firstId = Object.keys(S.devices)[0] || 'sys';
    fireAlert(firstId, 'sync', `Synced ${total} offline records to server`);
    showToast('success', `✅ Offline sync complete! ${total} records uploaded.`);
  } catch {
    document.getElementById('offline-sync-bar')?.classList.remove('show');
    showToast('danger', '❌ Offline sync failed. Will retry on reconnect.');
  }
}

export function updateOfflineUI() { _updateOfflineUI(); }

function _updateOfflineUI() {
  const total = offlineQueueTotal();
  const pill  = document.getElementById('offline-store-pill');
  const cnt   = document.getElementById('offline-store-count');
  const qc    = document.getElementById('offline-queue-count');
  if (pill) pill.classList.toggle('show', total > 0);
  if (cnt)  cnt.textContent = total;
  if (qc)   qc.textContent  = `${total} records`;
}
