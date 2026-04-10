/**
 * src/ui/panel.js
 * Right panel: active device card, live metrics, banners.
 */

import { S }                from '../utils/state.js';
import { geofenceStatus }   from '../modules/geofence.js';
import { updateMiniSpeed }  from '../modules/analytics.js';

export function updatePanel() {
  const d = S.devices[S.selectedId];
  if (!d) return;

  /* ── Device card ── */
  _t('active-name',  d.name);
  _t('active-lat',   d.lat.toFixed(6));
  _t('active-lng',   d.lng.toFixed(6));
  _t('active-alt',   d.altitude.toFixed(1) + ' m');
  _t('active-hdg',   d.heading.toFixed(1)  + ' °');
  _t('active-hdop',  d.hdop.toFixed(2));
  _t('active-accel', d.accel.toFixed(3)    + ' g');
  _t('active-tilt',  `${d.pitch.toFixed(1)}° / ${d.roll.toFixed(1)}°`);

  /* Crash highlight */
  const accelEl = document.getElementById('active-accel');
  if (accelEl) accelEl.style.color = d.accel > S.settings.crashThreshold ? 'var(--danger)' : '';

  /* Status badge */
  const sb = document.getElementById('active-status');
  if (sb) { sb.className = `status-badge ${d.status}`; sb.textContent = d.status.toUpperCase(); }

  /* ── Geofence status row ── */
  const gfSt  = geofenceStatus(d.id);
  const gfEl  = document.getElementById('active-gf-indicator');
  if (gfEl) {
    gfEl.className  = `gf-indicator ${gfSt}`;
    gfEl.textContent = gfSt === 'inside'  ? '✓ Inside zone'
                     : gfSt === 'outside' ? '⚠ Outside zone'
                     : '— Not configured';
  }

  /* ── Metrics ── */
  _h('m-speed', `${d.speed}<span class="unit">km/h</span>`);
  _h('m-dist',  `${d.totalDist.toFixed(2)}<span class="unit">km</span>`);

  const tripMin = Math.round((Date.now() - (S.tripStart[d.id] || Date.now())) / 60_000);
  _h('m-time', `${tripMin}<span class="unit">min</span>`);
  _t('m-sats', d.satellites);

  let gpsLabel = '📴 No GPS';
  if (d.gpsValid)       gpsLabel = '🛰️ GPS lock';
  else if (d.gpsCached) gpsLabel = '📍 Cached pos';
  _t('m-gps-mode', gpsLabel);

  const over = d.speed > S.settings.speedThreshold;
  const sc   = document.getElementById('m-speed-ch');
  if (sc) {
    sc.textContent = over          ? '⚠️ Overspeed!'
                   : d.speed > 0  ? `✅ Normal · ${d.vehicleState}`
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
const _h = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML  = v; };
