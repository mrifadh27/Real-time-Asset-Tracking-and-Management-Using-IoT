/**
 * src/modules/geofence.js
 * Per-device geofence — draw mode, entry/exit detection, alert firing.
 *
 * FIXES (this version — complete rewrite of draw mode):
 *  ✅ GEOFENCE DRAW FIX: replaced ambiguous toggleDrawMode() with explicit
 *     startDrawMode(id) / cancelDrawMode() — geofence map click now ALWAYS works
 *  ✅ Map cursor changes to crosshair in draw mode (clear visual feedback)
 *  ✅ Escape key cancels draw mode
 *  ✅ Panel button text updated live ("Set Geofence" ↔ "✕ Cancel")
 *  ✅ resetGeofenceState() exported — called on logout to clean up click handler
 *  ✅ drawGeofence() guards against null map and double-circle creation
 *  ✅ Radius clamped 50 m – 50 000 m on every write path
 *  ✅ geofenceStatus() returns 'not-set' when device has no valid GPS
 *  ✅ CAT-9: saveGeofencesFromForm() validates lat/lng ranges
 */

import { S }         from '../utils/state.js';
import { haversineM, isValidGPS, formatDistance } from '../utils/helpers.js';
import { fireAlert } from './alerts.js';
import { showToast } from '../utils/toast.js';
import { emit, EV }  from '../utils/events.js';

let _map = null;
export function setMap(m) { _map = m; }

/* ─────────────────────────────────────────
   DRAW MODE STATE
───────────────────────────────────────── */
let _drawMode     = false;
let _drawTargetId = null;

/** Is draw mode currently active? */
export function isDrawModeActive() { return _drawMode; }

/* ─────────────────────────────────────────
   RESET (call on logout)
───────────────────────────────────────── */
export function resetGeofenceState() {
  if (_drawMode) _exitDrawUI();
  _drawMode     = false;
  _drawTargetId = null;
  _map          = null;
}

/* ─────────────────────────────────────────
   GET / INIT GEOFENCE FOR DEVICE
───────────────────────────────────────── */
export function getGeofence(id) {
  if (!S.geofences[id]) {
    S.geofences[id] = { lat: 7.2906, lng: 80.6337, radius: 500, active: true, isSet: false, circle: null };
  }
  return S.geofences[id];
}

/* ─────────────────────────────────────────
   START DRAW MODE  ← Main entry point
   Called from: panel button, sidebar gf-btn,
                map popup button, geofence-btn
───────────────────────────────────────── */
export function startDrawMode(id) {
  const targetId = id || S.selectedId;
  if (!targetId) {
    showToast('warning', '⚠️ Select a device first, then click "Set Geofence"');
    return;
  }
  if (!_map) {
    showToast('warning', '⚠️ Map not ready yet');
    return;
  }

  // If already in draw mode for a different device, switch target
  _drawMode     = true;
  _drawTargetId = targetId;

  const devName = S.devices[targetId]?.name || targetId;

  // ── Map ──
  _map.off('click', _onMapClick);
  _map.on('click', _onMapClick);
  _map.getContainer().style.cursor = 'crosshair';

  // ── Buttons ──
  const mapBtn   = document.getElementById('geofence-btn');
  const panelBtn = document.getElementById('panel-geofence-btn');
  mapBtn?.classList.add('active');
  if (mapBtn)   mapBtn.textContent   = '✕ Cancel Draw';
  panelBtn?.classList.add('drawing');
  if (panelBtn) panelBtn.textContent = '✕ Cancel Geofence';

  // ── Hint overlay ──
  const hint = document.getElementById('draw-hint');
  if (hint) {
    hint.style.display = 'block';
    hint.innerHTML = `<span style="font-weight:700">📌 Click the map</span> to set geofence centre for <b>${devName}</b><br>
      <small style="opacity:.7">Press <kbd style="background:rgba(255,255,255,.1);border-radius:3px;padding:1px 5px;font-size:10px">Esc</kbd> to cancel</small>`;
  }

  // ── Escape key ──
  document.addEventListener('keydown', _onEscKey);

  // ── Emit so panel can react ──
  emit(EV.DRAW_MODE_CHANGED, { active: true, deviceId: targetId });

  showToast('info', `📌 Click the map to set geofence for ${devName}`);
}

/* ─────────────────────────────────────────
   CANCEL DRAW MODE
───────────────────────────────────────── */
export function cancelDrawMode() {
  _exitDrawUI();
  _drawMode     = false;
  _drawTargetId = null;
  emit(EV.DRAW_MODE_CHANGED, { active: false, deviceId: null });
}

/* ─────────────────────────────────────────
   TOGGLE (for the map controls button)
───────────────────────────────────────── */
export function toggleDrawMode(targetId) {
  if (_drawMode) cancelDrawMode();
  else           startDrawMode(targetId);
}

function _exitDrawUI() {
  if (_map) {
    _map.off('click', _onMapClick);
    try { _map.getContainer().style.cursor = ''; } catch(_) {}
  }
  document.removeEventListener('keydown', _onEscKey);

  const mapBtn   = document.getElementById('geofence-btn');
  const panelBtn = document.getElementById('panel-geofence-btn');
  mapBtn?.classList.remove('active');
  if (mapBtn)   mapBtn.textContent   = '📐 Set Geofence';
  panelBtn?.classList.remove('drawing');
  if (panelBtn) panelBtn.textContent = '📐 Set Geofence';

  const hint = document.getElementById('draw-hint');
  if (hint) hint.style.display = 'none';
}

function _onEscKey(e) {
  if (e.key === 'Escape' && _drawMode) cancelDrawMode();
}

function _onMapClick(e) {
  const id = _drawTargetId || S.selectedId;
  if (!id) { showToast('warning', '⚠️ Select a device first'); cancelDrawMode(); return; }

  const gf = getGeofence(id);
  gf.lat   = e.latlng.lat;
  gf.lng   = e.latlng.lng;
  gf.isSet = true;

  // Clamp radius from input if present, else keep existing
  const radEl = document.getElementById(`gf-rad-${id}`);
  if (radEl) {
    const v = parseInt(radEl.value, 10);
    gf.radius = isFinite(v) ? Math.max(50, Math.min(50000, v)) : gf.radius;
  }

  // Reset tracker so next check fires correct enter/exit alert
  delete S.geofenceExitTracker[id];

  drawGeofence(id);
  updateGeofenceInfoBox(id);
  renderGeofenceTable();
  cancelDrawMode();

  showToast('success', `✅ Geofence set for ${S.devices[id]?.name || id}! Radius: ${gf.radius} m`);
}

/* ─────────────────────────────────────────
   DRAW CIRCLE ON MAP
───────────────────────────────────────── */
export function drawGeofence(id) {
  if (!_map) return;
  const gf = getGeofence(id);

  if (!gf.isSet || !gf.active) {
    if (gf.circle) { try { _map.removeLayer(gf.circle); } catch(_) {} gf.circle = null; }
    return;
  }

  if (gf.circle) {
    try {
      gf.circle.setLatLng([gf.lat, gf.lng]);
      gf.circle.setRadius(gf.radius);
      return;
    } catch (_) {
      try { _map.removeLayer(gf.circle); } catch(__) {}
      gf.circle = null;
    }
  }

  gf.circle = window.L.circle([gf.lat, gf.lng], {
    radius: gf.radius, color: '#00E5FF', weight: 2, opacity: 0.8,
    fillColor: '#00E5FF', fillOpacity: 0.08, dashArray: '6 4',
    pane: 'geofencesPane', interactive: false,
  }).addTo(_map);
}

export function drawAllGeofences() {
  Object.keys(S.geofences).forEach(id => {
    const gf = S.geofences[id];
    if (gf?.isSet && gf?.active) drawGeofence(id);
  });
}

/* ─────────────────────────────────────────
   GEOFENCE CHECK (called per device update)
───────────────────────────────────────── */
export function checkGeofence(id, lat, lng) {
  const gf = getGeofence(id);
  if (!gf.isSet || !gf.active || !isValidGPS(lat, lng)) return;

  const dist    = haversineM(lat, lng, gf.lat, gf.lng);
  const inside  = dist <= gf.radius;
  const wasOut  = S.geofenceExitTracker[id] === true;
  const devName = S.devices[id]?.name || id;

  if (!inside) {
    if (wasOut === false || S.geofenceExitTracker[id] === undefined) {
      S.geofenceExitTracker[id] = true;
      fireAlert(id, 'geofence', `${devName} left the geofence zone (${formatDistance(dist)} away)`);
    }
  } else {
    if (wasOut || S.geofenceExitTracker[id] === undefined) {
      S.geofenceExitTracker[id] = false;
      fireAlert(id, 'geofence_enter', `${devName} is inside the geofence zone`);
    } else {
      S.geofenceExitTracker[id] = false;
    }
  }
}

export function geofenceStatus(id) {
  const gf  = getGeofence(id);
  const dev = S.devices[id];
  if (!gf.isSet || !gf.active) return 'not-set';
  if (!dev || !isValidGPS(dev.lat, dev.lng)) return 'not-set';
  return haversineM(dev.lat, dev.lng, gf.lat, gf.lng) <= gf.radius ? 'inside' : 'outside';
}

/* ─────────────────────────────────────────
   GEOFENCE INFO BOX (map overlay)
───────────────────────────────────────── */
export function updateGeofenceInfoBox(id) {
  const gf   = getGeofence(id);
  const info = document.getElementById('geofence-info');
  if (!info) return;
  info.style.display = 'block';
  info.innerHTML = `
    📐 <b>${S.devices[id]?.name || id}</b><br>
    Radius: ${gf.radius} m &nbsp;|&nbsp; ${gf.lat.toFixed(5)}, ${gf.lng.toFixed(5)}<br>
    <span style="color:var(--success);font-size:10px">✓ Active — alerts enabled</span>`;
}

/* ─────────────────────────────────────────
   SAVE FROM SETTINGS FORM
───────────────────────────────────────── */
export function saveGeofencesFromForm() {
  let count = 0;
  Object.keys(S.geofences).forEach(id => {
    const latEl = document.getElementById(`gf-lat-${id}`);
    const lngEl = document.getElementById(`gf-lng-${id}`);
    const radEl = document.getElementById(`gf-rad-${id}`);
    const actEl = document.getElementById(`gf-act-${id}`);
    const gf    = getGeofence(id);

    if (latEl) { const v = parseFloat(latEl.value); if (isFinite(v) && v >= -90  && v <= 90)  gf.lat    = v; }
    if (lngEl) { const v = parseFloat(lngEl.value); if (isFinite(v) && v >= -180 && v <= 180) gf.lng    = v; }
    if (radEl) { const v = parseInt(radEl.value,10); gf.radius = isFinite(v) ? Math.max(50,Math.min(50000,v)) : gf.radius; }
    if (actEl) { gf.active = actEl.classList.contains('on'); }
    gf.isSet = true;
    delete S.geofenceExitTracker[id];
    drawGeofence(id);
    count++;
  });
  renderGeofenceTable();
  showToast('success', `✅ Geofences saved for ${count} device(s)!`);
}

/* ─────────────────────────────────────────
   SETTINGS TABLE
───────────────────────────────────────── */
export function renderGeofenceTable() {
  const tbody = document.getElementById('gf-table-body');
  if (!tbody) return;
  const ids = Object.keys(S.devices);
  if (!ids.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--t3);font-size:12px;padding:16px">No devices detected yet</td></tr>`;
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
      <td><input class="gf-input-sm" id="gf-lat-${id}" type="number" value="${gf.lat.toFixed(5)}" step="0.00001"/></td>
      <td><input class="gf-input-sm" id="gf-lng-${id}" type="number" value="${gf.lng.toFixed(5)}" step="0.00001"/></td>
      <td><input class="gf-input-sm" id="gf-rad-${id}" type="number" value="${gf.radius}" min="50" max="50000" style="width:80px"/></td>
      <td><div class="toggle${gf.active?' on':''}" id="gf-act-${id}" onclick="this.classList.toggle('on')"></div></td>
    </tr>`;
  }).join('');
}
