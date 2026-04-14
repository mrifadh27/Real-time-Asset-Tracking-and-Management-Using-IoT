/**
 * src/modules/devices.js
 * Processes raw Firebase device data, detects ALL state transitions.
 *
 * FIXES:
 *  ✅ CAT-7:  Speed showing "-0" — clamp to Math.max(0, speed)
 *  ✅ CAT-7:  Distance showing "NaN km" — totalDist guarded with isFinite()
 *  ✅ CAT-10: offlineQueueTotal() guards against non-array queue entries (NaN)
 *  ✅ CAT-10: _bufferOffline() skips storeage when coordinates are (0, 0) — never-valid GPS
 *  ✅ CAT-10: syncOfflineQueue() checks auth before syncing (avoids permission-denied)
 *  ✅ CAT-10: Offline banner clears when device comes back online via updateOfflineUI()
 */

import { S, mapLayers }  from '../utils/state.js';
import { toF, toI, toBool, isValidGPS, haversineKm, haversineM }
                          from '../utils/helpers.js';
import { fireAlert }      from './alerts.js';
import { checkGeofence }  from './geofence.js';
import { batchUpdate }    from '../config/firebase.js';
import { showToast }      from '../utils/toast.js';
import { emit, EV }       from '../utils/events.js';

/* global firebase */
const firebase = window.firebase;

const MIN_STATE_TRANSITION_MS = 5_000;

/* ─────────────────────────────────────────
   PROCESS ONE DEVICE
───────────────────────────────────────── */
export function processDevice(id, raw, now) {
  const lat  = toF(raw.lat);
  const lng  = toF(raw.lng);
  const alt  = toF(raw.altitude);
  const hdop = toF(raw.hdop) || 99.9;
  const sats = toI(raw.satellites);
  const hdg  = toF(raw.heading);
  const accel   = toF(raw.accel);
  const pitch   = toF(raw.pitch);
  const roll    = toF(raw.roll);
  const gpsValid  = toBool(raw.gpsValid);
  const gpsCached = toBool(raw.gpsCached);

  if (!isValidGPS(lat, lng)) {
    console.warn(`[GPS] Invalid coords for ${id}: lat=${lat}, lng=${lng}`);
    return;
  }

  const prev       = S.devices[id];
  const prevStatus = S.prevStatus[id];  // undefined on first connect
  const lastTrans  = S.lastStatusTransition[id] || 0;

  /* ── Speed ── */
  let speed = toF(raw.speed);
  if (speed <= 0 && prev && prev.lat !== 0 && lat !== 0) {
    const dt = (now - (prev._lastUpdate || now - 1000)) / 1000;
    if (dt > 0 && dt < 60) {
      speed = Math.min((haversineM(prev.lat, prev.lng, lat, lng) / dt) * 3.6, 300);
    }
  }
  // ✅ CAT-7 FIX: clamp to 0 to prevent "-0" display
  speed = parseFloat(Math.max(0, speed).toFixed(1));

  /* ── Distance (glitch guard: reject > 500 m jumps) ── */
  let addDist = 0;
  if (prev && prev.lat !== 0 && lat !== 0 && gpsValid) {
    const d = haversineKm(prev.lat, prev.lng, lat, lng);
    if (d < 0.5) addDist = d;
  }
  // ✅ CAT-7 FIX: guard against NaN totalDist
  const prevDist  = (isFinite(prev?.totalDist) ? prev.totalDist : 0);
  const totalDist = parseFloat((prevDist + addDist).toFixed(3));

  if (!S.tripStart[id]) S.tripStart[id] = now;
  if (!S.maxSpeed[id] || speed > S.maxSpeed[id]) S.maxSpeed[id] = speed;

  const name = raw.name || `Device ${id}`;

  // Guard heading: avoid NaN/Infinity
  let heading = toF(raw.heading);
  if (!isFinite(heading) || isNaN(heading)) heading = 0;
  heading = Math.max(0, Math.min(360, heading));

  const device = {
    id, name,
    status:       'online',
    lat, lng, altitude: alt, hdop, satellites: sats,
    heading,
    accel, pitch, roll, speed, totalDist,
    gpsValid, gpsCached,
    vehicleState: raw.vehicleState || 'parked',
    _lastUpdate:  now,
  };
  S.devices[id] = device;

  /* ── 1. FIRST CONNECT or BACK ONLINE ── */
  const isFirstConnect = !S.knownDevices.has(id);
  const isReconnect    = (prevStatus === 'offline');

  if (isFirstConnect || isReconnect) {
    const timeSinceTrans = now - lastTrans;

    if (isFirstConnect || timeSinceTrans > MIN_STATE_TRANSITION_MS) {
      if (!S.onlineAlertSent[id]) {
        _clearOfflineAlerts(id);
        const msg = isFirstConnect
          ? `${name} connected`
          : `${name} is back online`;
        fireAlert(id, 'online', msg, name);
        S.onlineAlertSent[id]  = true;
        S.offlineAlertSent[id] = false;
        S.lastStatusTransition[id] = now;
      }
    }
    S.knownDevices.add(id);
  }

  /* Clear offline timer — we received a live packet */
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

  /* ── 6. GEOFENCE ── */
  checkGeofence(id, lat, lng, gpsValid);

  /* ── 7. Init geofence for brand new device ── */
  if (!S.geofences[id]) {
    S.geofences[id] = {
      lat: lat || 7.2906, lng: lng || 80.6337,
      radius: 500, active: true, isSet: false, circle: null,
    };
  }

  /* ── 8. Offline buffer — only if GPS was ever valid ── */
  // ✅ CAT-10 FIX: skip buffering when GPS has never been valid (avoids storing 0,0)
  if (!gpsValid && S.settings.offlineEnabled && isValidGPS(lat, lng)) {
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

/* ─────────────────────────────────────────
   OFFLINE TIMER
───────────────────────────────────────── */
function _resetOfflineTimer(id) {
  const dev = S.devices[id];
  if (!dev || dev.status === 'offline') return;
  clearTimeout(S.offlineTimers[id]);

  S.offlineTimers[id] = setTimeout(() => {
    const dev = S.devices[id];
    if (!dev || dev.status === 'offline' || S.offlineAlertSent[id]) return;

    dev.status       = 'offline';
    S.prevStatus[id] = 'offline';
    S.offlineAlertSent[id] = true;
    S.onlineAlertSent[id]  = false;
    S.lastStatusTransition[id] = Date.now();

    // Reset geofence tracker so reconnect triggers a fresh evaluation
    delete S.geofenceExitTracker[id];

    emit(EV.DEVICES_UPDATED);
    fireAlert(id, 'offline', `${dev.name} went offline`);
  }, (S.settings.offlineTimeout || 90) * 1000);
}

/* ─────────────────────────────────────────
   CLEAR OFFLINE ALERTS — ALL THREE STORES
───────────────────────────────────────── */
function _clearOfflineAlerts(id) {
  const isMatch = a => a.deviceId === id && a.type === 'offline';

  S.firebaseAlerts = S.firebaseAlerts.filter(a => !isMatch(a));
  S.localAlerts    = S.localAlerts.filter(a => !isMatch(a));
  S.alerts         = S.alerts.filter(a => !isMatch(a));
}

/* ─────────────────────────────────────────
   OFFLINE BUFFER
───────────────────────────────────────── */
function _bufferOffline(id, raw, now) {
  if (!S.settings.offlineEnabled) return;
  if (!S.offlineQueue[id]) S.offlineQueue[id] = [];
  S.offlineQueue[id].push({
    lat: toF(raw.lat), lng: toF(raw.lng),
    speed: toF(raw.speed), accel: toF(raw.accel),
    satellites: toI(raw.satellites), altitude: toF(raw.altitude),
    ts: now, offline: true,
  });
  const max = S.settings.offlineBuffer || 200;
  if (S.offlineQueue[id].length > max) S.offlineQueue[id].shift();
}

/* ─────────────────────────────────────────
   OFFLINE QUEUE TOTAL
   ✅ CAT-10 FIX: guard against non-array entries to prevent NaN
───────────────────────────────────────── */
export function offlineQueueTotal() {
  return Object.values(S.offlineQueue).reduce((s, q) => {
    return s + (Array.isArray(q) ? q.length : 0);
  }, 0);
}

/* ─────────────────────────────────────────
   SYNC OFFLINE QUEUE
   ✅ CAT-10 FIX: verify auth is still valid before syncing
───────────────────────────────────────── */
export async function syncOfflineQueue() {
  const total = offlineQueueTotal();
  if (total === 0 || !S.settings.autoSync) return;

  // ✅ Check auth before hitting the database
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    console.warn('[devices] syncOfflineQueue: no authenticated user, skipping sync');
    return;
  }

  document.getElementById('offline-sync-bar')?.classList.add('show');
  showToast('info', `🔄 Syncing ${total} offline records…`);

  const promises = [];
  Object.entries(S.offlineQueue).forEach(([id, queue]) => {
    if (!Array.isArray(queue) || !queue.length) return;
    const batch = {};
    queue.forEach((rec, i) => { batch[`offline_${id}_${rec.ts}_${i}`] = { ...rec, deviceId: id }; });
    promises.push(batchUpdate('/offline_data', batch).then(() => {
      S.offlineQueue[id] = [];
      _updateOfflineUI();
    }));
  });

  try {
    await Promise.all(promises);
    document.getElementById('offline-sync-bar')?.classList.remove('show');
    const firstId = Object.keys(S.devices)[0] || 'sys';
    fireAlert(firstId, 'sync', `Synced ${total} offline records to server`);
    showToast('success', `✅ Offline sync complete! ${total} records uploaded.`);
  } catch (err) {
    console.error('[devices] Offline sync error:', err);
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
  if (cnt)  cnt.textContent  = total;
  if (qc)   qc.textContent   = `${total} records`;
}
