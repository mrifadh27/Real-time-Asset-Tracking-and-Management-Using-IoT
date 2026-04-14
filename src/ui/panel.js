/**
 * src/ui/panel.js
 * Right panel: active device card, live metrics, banners.
 *
 * FIXES:
 *  ✅ updatePanel() fully guards against null/missing device
 *  ✅ HDOP shows "N/A" instead of "NaN" when data absent
 *  ✅ Speed shows 0, never "-0"
 *  ✅ Distance and trip time use safe formatters
 *  ✅ Panel clears gracefully when selected device goes away
 */

import { S }                               from '../utils/state.js';
import { geofenceStatus }                  from '../modules/geofence.js';
import { updateMiniSpeed }                 from '../modules/analytics.js';
import { formatDistanceKm, formatTripTime } from '../utils/helpers.js';

export function updatePanel() {
  const d = S.devices[S.selectedId];
  if (!d) {
    // Device removed — clear the panel gracefully
    _t('active-name',  'No device selected');
    _t('active-lat',   '--'); _t('active-lng',   '--');
    _t('active-alt',   '--'); _t('active-hdg',   '--');
    _t('active-hdop',  '--'); _t('active-accel', '--');
    _t('active-tilt',  '--');
    const sb = document.getElementById('active-status');
    if (sb) { sb.className = 'status-badge offline'; sb.textContent = 'OFFLINE'; }
    return;
  }

  _t('active-name',  d.name);
  _t('active-lat',   isFinite(d.lat)  ? d.lat.toFixed(6)  : '--');
  _t('active-lng',   isFinite(d.lng)  ? d.lng.toFixed(6)  : '--');
  _t('active-alt',   isFinite(d.altitude) ? d.altitude.toFixed(1) + ' m' : '--');
  _t('active-hdg',   isFinite(d.heading)  ? d.heading.toFixed(1)  + ' °' : '--');
  _t('active-accel', isFinite(d.accel)    ? d.accel.toFixed(3)    + ' g' : '--');
  _t('active-tilt',  `${isFinite(d.pitch)?d.pitch.toFixed(1):'--'}° / ${isFinite(d.roll)?d.roll.toFixed(1):'--'}°`);

  /* HDOP — colour-coded */
  const hdopEl = document.getElementById('active-hdop');
  if (hdopEl) {
    const h = d.hdop;
    if (!isFinite(h) || h >= 99) {
      hdopEl.innerHTML = `<span style="color:var(--t3)">N/A</span>`;
    } else {
      const color = h<=1.5?'var(--success)':h<=3.0?'var(--warning)':h<=5.0?'#FF6B35':'var(--danger)';
      const acc   = h<=1.5?'~3 m':h<=3.0?'~8 m':h<=5.0?'~15 m':'>25 m';
      hdopEl.innerHTML = `<span style="color:${color}">${h.toFixed(2)}</span> <span style="font-size:10px;color:var(--t2)">(${acc})</span>`;
    }
  }

  /* Crash highlight */
  const accelEl = document.getElementById('active-accel');
  if (accelEl) accelEl.style.color = (d.accel > S.settings.crashThreshold) ? 'var(--danger)' : '';

  /* Status badge */
  const sb = document.getElementById('active-status');
  if (sb) { sb.className = `status-badge ${d.status}`; sb.textContent = d.status.toUpperCase(); }

  /* Geofence status */
  const gfSt = geofenceStatus(d.id);
  const gfEl = document.getElementById('active-gf-indicator');
  if (gfEl) {
    gfEl.className   = `gf-indicator ${gfSt}`;
    gfEl.textContent = gfSt==='inside'  ? '✓ Inside zone'
                     : gfSt==='outside' ? '⚠ Outside zone'
                     : '— Not configured';
  }

  /* Metrics */
  const speed = Math.max(0, d.speed); // never show "-0"
  _h('m-speed', `${speed}<span class="unit">km/h</span>`);

  const distStr   = formatDistanceKm(isFinite(d.totalDist) ? d.totalDist : 0);
  const distParts = distStr.split(' ');
  _h('m-dist', `${distParts[0]}<span class="unit">${distParts[1] || 'km'}</span>`);

  const tripMs = Math.max(0, Date.now() - (S.tripStart[d.id] || Date.now()));
  const { value: tVal, unit: tUnit } = formatTripTime(tripMs);
  _h('m-time', `${tVal}<span class="unit">${tUnit}</span>`);

  _t('m-sats', isFinite(d.satellites) ? d.satellites : '--');

  _t('m-gps-mode',
    d.gpsValid   ? '🛰️ GPS lock'   :
    d.gpsCached  ? '📍 Cached pos' : '📴 No GPS');

  const over = speed > S.settings.speedThreshold;
  const sc   = document.getElementById('m-speed-ch');
  if (sc) {
    sc.textContent = over        ? '⚠️ Overspeed!'
                   : speed > 0  ? `✅ Normal · ${d.vehicleState || 'moving'}`
                   : `🅿️ Parked · ${d.vehicleState || 'parked'}`;
    sc.className = `m-change ${over ? 'down' : speed > 0 ? 'up' : 'neutral'}`;
  }

  /* Banners */
  document.getElementById('offline-banner')?.classList.toggle('show', d.status === 'offline');
  document.getElementById('cached-banner')?.classList.toggle('show', d.gpsCached && d.status !== 'offline');

  /* Mini speed chart */
  updateMiniSpeed(d.id);
}

const _t = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
const _h = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML   = v; };
