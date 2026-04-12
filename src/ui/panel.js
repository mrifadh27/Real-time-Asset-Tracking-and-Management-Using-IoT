/**
 * src/ui/panel.js
 * Right panel: active device card, live metrics, banners.
 *
 * FIXES (Issue 3):
 *  ✅ Distance: shows metres (m) when < 1 km, kilometres (km) when ≥ 1 km.
 *  ✅ Trip time: shows "X min" when < 60 min, "Xh Ymin" when ≥ 60 min.
 *  ✅ HDOP: colour-coded — green ≤1.5, yellow ≤3.0, orange ≤5.0, red >5.0.
 *  ✅ GPS accuracy estimate shown next to HDOP.
 */

import { S }                          from '../utils/state.js';
import { geofenceStatus }             from '../modules/geofence.js';
import { updateMiniSpeed }            from '../modules/analytics.js';
import { formatDistanceKm, formatTripTime } from '../utils/helpers.js';

export function updatePanel() {
  const d = S.devices[S.selectedId];
  if (!d) return;

  /* ── Device card ── */
  _t('active-name',  d.name);
  _t('active-lat',   d.lat.toFixed(6));
  _t('active-lng',   d.lng.toFixed(6));
  _t('active-alt',   d.altitude.toFixed(1) + ' m');
  _t('active-hdg',   d.heading.toFixed(1)  + ' °');
  _t('active-accel', d.accel.toFixed(3)    + ' g');
  _t('active-tilt',  `${d.pitch.toFixed(1)}° / ${d.roll.toFixed(1)}°`);

  /* ── HDOP: colour-code by accuracy + estimated accuracy label ── */
  const hdopEl = document.getElementById('active-hdop');
  if (hdopEl) {
    const h     = d.hdop;
    const color = h <= 1.5 ? 'var(--success)'
                : h <= 3.0 ? 'var(--warning)'
                : h <= 5.0 ? '#FF6B35'
                :             'var(--danger)';
    const acc   = h <= 1.5 ? '~3 m' : h <= 3.0 ? '~8 m' : h <= 5.0 ? '~15 m' : '>25 m';
    hdopEl.innerHTML = `<span style="color:${color}">${h.toFixed(2)}</span> <span style="font-size:10px;color:var(--t2)">(${acc})</span>`;
  }

  /* Crash highlight */
  const accelEl = document.getElementById('active-accel');
  if (accelEl) accelEl.style.color = d.accel > S.settings.crashThreshold ? 'var(--danger)' : '';

  /* Status badge */
  const sb = document.getElementById('active-status');
  if (sb) { sb.className = `status-badge ${d.status}`; sb.textContent = d.status.toUpperCase(); }

  /* ── Geofence status ── */
  const gfSt = geofenceStatus(d.id);
  const gfEl = document.getElementById('active-gf-indicator');
  if (gfEl) {
    gfEl.className   = `gf-indicator ${gfSt}`;
    gfEl.textContent = gfSt === 'inside'  ? '✓ Inside zone'
                     : gfSt === 'outside' ? '⚠ Outside zone'
                     : '— Not configured';
  }

  /* ── Metrics ── */
  _h('m-speed', `${d.speed}<span class="unit">km/h</span>`);

  // ✅ Issue 3 FIX — Distance: metres if < 1 km, kilometres if ≥ 1 km
  const distStr = formatDistanceKm(d.totalDist);
  const distParts = distStr.split(' ');
  _h('m-dist', `${distParts[0]}<span class="unit">${distParts[1]}</span>`);

  // ✅ Issue 3 FIX — Trip time: "Xh Ymin" if ≥ 60 min, "X min" otherwise
  const tripMs = Date.now() - (S.tripStart[d.id] || Date.now());
  const { value: tVal, unit: tUnit } = formatTripTime(tripMs);
  _h('m-time', `${tVal}<span class="unit">${tUnit}</span>`);

  _t('m-sats', d.satellites);

  let gpsLabel = '📴 No GPS';
  if (d.gpsValid)       gpsLabel = '🛰️ GPS lock';
  else if (d.gpsCached) gpsLabel = '📍 Cached pos';
  _t('m-gps-mode', gpsLabel);

  const over = d.speed > S.settings.speedThreshold;
  const sc   = document.getElementById('m-speed-ch');
  if (sc) {
    sc.textContent = over         ? '⚠️ Overspeed!'
                   : d.speed > 0 ? `✅ Normal · ${d.vehicleState}`
                   : `Parked · ${d.vehicleState}`;
    sc.className   = `m-change ${over ? 'down' : d.speed > 0 ? 'up' : 'neutral'}`;
  }

  /* ── Banners ── */
  document.getElementById('offline-banner')
    ?.classList.toggle('show', d.status === 'offline');
  document.getElementById('cached-banner')
    ?.classList.toggle('show', d.gpsCached && d.status !== 'offline');

  /* ── Mini speed chart ── */
  updateMiniSpeed(d.id);
}

const _t = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
const _h = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML   = v; };
