/**
 * src/modules/geofence.js
 * Per-device geofence:
 *  - isSet flag — alerts only fire after user configures the zone
 *  - Re-entry detection → fires 'geofence_enter' alert when device returns inside
 *  - Exit detection    → fires 'geofence' alert when device leaves
 *
 * ✅ FIX BUG 3: checkGeofence no longer gates on gpsValid for the distance
 *    calculation. gpsValid from firmware can be false for several seconds
 *    after reconnect even when coordinates are valid and fresh. We now
 *    rely on isValidGPS() (coordinate range check) as the gate instead,
 *    so geofence_enter fires reliably on the first valid update.
 */

import { S }         from '../utils/state.js';
import { haversineM, isValidGPS } from '../utils/helpers.js';
import { fireAlert } from './alerts.js';
import { showToast } from '../utils/toast.js';

let _map = null;

export function setMap(m) { _map = m; }

/* ────────────────────────────────────────
   GET / INIT
──────────────────────────────────────── */
export function getGeofence(id) {
  if (!S.geofences[id]) {
    S.geofences[id] = {
      lat: 7.2906, lng: 80.6337,
      radius: 500,
      active: true,
      isSet:  false,
      circle: null,
    };
  }
  return S.geofences[id];
}

/* ────────────────────────────────────────
   DRAW
──────────────────────────────────────── */
export function drawGeofence(id) {
  if (!_map) return;
  const gf = getGeofence(id);

  if (!gf.isSet || !gf.active) {
    if (gf.circle) {
      try { _map.removeLayer(gf.circle); } catch (_) {}
      gf.circle = null;
    }
    return;
  }

  if (gf.circle) {
    try {
      gf.circle.setLatLng([gf.lat, gf.lng]);
      gf.circle.setRadius(gf.radius);
    } catch (_) {}
    return;
  }

  gf.circle = window.L.circle([gf.lat, gf.lng], {
    radius:      gf.radius,
    color:       '#00E5FF',
    weight:      2,
    opacity:     0.7,
    fillColor:   '#00E5FF',
    fillOpacity: 0.08,
    dashArray:   '6 4',
    pane:        'geofencesPane',
    interactive: false,
  }).addTo(_map);
}

export function drawAllGeofences() {
  Object.keys(S.geofences).forEach(id => {
    const gf = getGeofence(id);
    if (gf.isSet && gf.active) drawGeofence(id);
  });
}

/* ────────────────────────────────────────
   CHECK (called on every device update)
──────────────────────────────────────── */
export function checkGeofence(id, lat, lng, gpsValid) {
  const gf = getGeofence(id);

  // ✅ FIX BUG 3: Gate on coordinate validity, NOT on gpsValid flag.
  // The firmware's gpsValid can stay false for several seconds after
  // reconnect even when it's sending accurate coordinates. Using
  // isValidGPS() ensures alerts fire on the very first valid packet.
  if (!gf.isSet || !gf.active || !isValidGPS(lat, lng)) return;

  const dist    = haversineM(lat, lng, gf.lat, gf.lng);
  const inside  = dist <= gf.radius;
  const wasOut  = S.geofenceExitTracker[id] === true;
  const devName = S.devices[id]?.name || id;

  if (!inside) {
    /* ── Device is OUTSIDE ── */
    if (wasOut === false || S.geofenceExitTracker[id] === undefined) {
      // Transition: was inside (or unknown/just reconnected) → now outside
      S.geofenceExitTracker[id] = true;
      const distM = Math.round(dist);
      fireAlert(id, 'geofence',
        `${devName} left the geofence zone (${distM}m away)`);
    }
  } else {
    /* ── Device is INSIDE ── */
    if (wasOut || S.geofenceExitTracker[id] === undefined) {
      // Transition: was outside (or unknown/just reconnected) → now inside
      // ✅ This now correctly fires after offline→online because the
      //    offline timer deletes S.geofenceExitTracker[id] (sets it to
      //    undefined), so any reconnect triggers a fresh alert.
      S.geofenceExitTracker[id] = false;
      fireAlert(id, 'geofence_enter',
        `${devName} is inside the geofence zone`);
    } else {
      S.geofenceExitTracker[id] = false;
    }
  }
}

/**
 * Current geofence status for a device.
 * @param {string} id
 * @returns {'inside'|'outside'|'not-set'}
 */
export function geofenceStatus(id) {
  const gf  = getGeofence(id);
  const dev = S.devices[id];
  if (!gf.isSet || !gf.active) return 'not-set';
  if (!dev || dev.lat === 0) return 'not-set';
  // ✅ Use coordinate validity, not gpsValid, for consistency
  if (!isValidGPS(dev.lat, dev.lng)) return 'not-set';
  const dist = haversineM(dev.lat, dev.lng, gf.lat, gf.lng);
  return dist <= gf.radius ? 'inside' : 'outside';
}

/* ────────────────────────────────────────
   DRAW MODE (click-on-map to set)
──────────────────────────────────────── */
let _drawMode     = false;
let _drawTargetId = null;

export function toggleDrawMode(targetId) {
  _drawMode     = !_drawMode;
  _drawTargetId = targetId || S.selectedId;

  const btn  = document.getElementById('geofence-btn');
  const hint = document.getElementById('draw-hint');

  if (_drawMode) {
    btn?.classList.add('active');
    if (hint) {
      hint.style.display = 'block';
      const name = _drawTargetId
        ? (S.devices[_drawTargetId]?.name || _drawTargetId)
        : 'a device';
      hint.textContent = `📌 Click the map to set the geofence centre for ${name}`;
    }
    _map?.on('click', _onMapClick);
  } else {
    btn?.classList.remove('active');
    if (hint) hint.style.display = 'none';
    _map?.off('click', _onMapClick);
  }
}

function _onMapClick(e) {
  const id = _drawTargetId || S.selectedId;
  if (!id) {
    showToast('warning', '⚠️ Select a device first');
    toggleDrawMode();
    return;
  }

  const gf   = getGeofence(id);
  gf.lat     = e.latlng.lat;
  gf.lng     = e.latlng.lng;
  gf.isSet   = true;

  const radEl = document.getElementById(`gf-rad-${id}`);
  if (radEl) gf.radius = parseInt(radEl.value, 10) || 500;

  // ✅ Reset to undefined so next checkGeofence fires the correct alert
  // for current position (inside → geofence_enter, outside → geofence)
  delete S.geofenceExitTracker[id];

  drawGeofence(id);
  updateGeofenceInfoBox(id);
  renderGeofenceTable();
  toggleDrawMode();

  showToast('success',
    `📐 Geofence set for ${S.devices[id]?.name || id}! Alerts now active.`);
}

export function updateGeofenceInfoBox(id) {
  const gf   = getGeofence(id);
  const info = document.getElementById('geofence-info');
  if (!info) return;
  info.style.display = 'block';
  info.innerHTML = `
    📐 <b>${S.devices[id]?.name || id}</b><br>
    Radius: ${gf.radius} m<br>
    ${gf.lat.toFixed(5)}, ${gf.lng.toFixed(5)}<br>
    <span style="color:var(--success);font-size:10px">✓ Active — alerts enabled</span>`;
}

/* ────────────────────────────────────────
   SAVE FROM SETTINGS FORM
──────────────────────────────────────── */
export function saveGeofencesFromForm() {
  let count = 0;
  Object.keys(S.geofences).forEach(id => {
    const latEl = document.getElementById(`gf-lat-${id}`);
    const lngEl = document.getElementById(`gf-lng-${id}`);
    const radEl = document.getElementById(`gf-rad-${id}`);
    const actEl = document.getElementById(`gf-act-${id}`);
    const gf    = getGeofence(id);

    if (latEl) gf.lat    = parseFloat(latEl.value)  || gf.lat;
    if (lngEl) gf.lng    = parseFloat(lngEl.value)  || gf.lng;
    if (radEl) gf.radius = parseInt(radEl.value, 10) || gf.radius;
    if (actEl) gf.active = actEl.classList.contains('on');
    gf.isSet = true;

    // ✅ Reset tracker to undefined so next check fires correct alert
    delete S.geofenceExitTracker[id];

    drawGeofence(id);
    count++;
  });
  renderGeofenceTable();
  showToast('success', `✅ Geofences saved for ${count} device(s)! Alerts now active.`);
}

/* ────────────────────────────────────────
   SETTINGS TABLE
──────────────────────────────────────── */
export function renderGeofenceTable() {
  const tbody = document.getElementById('gf-table-body');
  if (!tbody) return;
  const ids = Object.keys(S.devices);
  if (!ids.length) {
    tbody.innerHTML = `<tr>
      <td colspan="5" style="text-align:center;color:var(--t3);font-size:12px;padding:16px">
        No devices detected yet</td></tr>`;
    return;
  }
  tbody.innerHTML = ids.map(id => {
    const gf   = getGeofence(id);
    const name = S.devices[id]?.name || id;
    const badge = gf.isSet
      ? `<span class="gf-set-badge is-set">✓ SET</span>`
      : `<span class="gf-set-badge not-set">NOT SET</span>`;
    return `<tr>
      <td><span class="gf-badge">${name}</span>${badge}</td>
      <td><input class="gf-input-sm" id="gf-lat-${id}" type="number"
            value="${gf.lat.toFixed(5)}" step="0.00001"/></td>
      <td><input class="gf-input-sm" id="gf-lng-${id}" type="number"
            value="${gf.lng.toFixed(5)}" step="0.00001"/></td>
      <td><input class="gf-input-sm" id="gf-rad-${id}" type="number"
            value="${gf.radius}" min="50" max="50000" style="width:80px"/></td>
      <td><div class="toggle${gf.active ? ' on' : ''}" id="gf-act-${id}"
              onclick="this.classList.toggle('on')"></div></td>
    </tr>`;
  }).join('');
}
