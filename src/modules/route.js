/**
 * src/modules/route.js
 * OSRM driving routes — fetch, render on map, track progress.
 *
 * FIXES:
 *  ✅ startRoute() is now exported (was missing from original) so main.js
 *     can call it from the "Get Route" button
 *  ✅ _destSearchTimer cleared when clearRoute() is called (no stale timer)
 *  ✅ Null checks on all DOM element accesses
 *  ✅ navRoute.totalDist guarded against NaN (isFinite check)
 */

import { S }          from '../utils/state.js';
import { haversineM, debounce } from '../utils/helpers.js';
import { showToast }  from '../utils/toast.js';
import { renderRoute as mapRenderRoute, removeRouteLayer } from './map.js';
import { searchLocations, addToSearchHistory } from './search.js';

let _destSearchTimer = null;

/* ────────────────────────────────────────
   DESTINATION SEARCH INPUT
──────────────────────────────────────── */
export function onDestInput(val) {
  const box = document.getElementById('dest-suggestions');
  if (!box) return;
  const q = (val || '').trim();
  if (q.length < 2) { box.classList.remove('visible'); return; }

  box.innerHTML = `<div class="dest-sug-status"><span class="spinner"></span> Searching…</div>`;
  box.classList.add('visible');

  clearTimeout(_destSearchTimer);
  _destSearchTimer = setTimeout(() => _searchDestinations(q), 300);
}

export function onDestKey(e) {
  if (e.key === 'Escape') document.getElementById('dest-suggestions')?.classList.remove('visible');
}

async function _searchDestinations(q) {
  const box = document.getElementById('dest-suggestions');
  if (!box) return;

  try {
    const dev    = S.devices[S.selectedId];
    const refLat = dev?.lat ?? null;
    const refLng = dev?.lng ?? null;

    const results = await searchLocations(q, refLat, refLng, 10);

    if (!results.length) {
      box.innerHTML = `<div class="dest-sug-status">No results found</div>`;
      return;
    }

    box.innerHTML = results.map(r => {
      const dist = r.distance ? `<span class="dest-dist">${r.distance.toFixed(1)} km</span>` : '';
      return `<div class="dest-sug-item"
        data-lat="${r.lat}" data-lng="${r.lng}"
        data-name="${r.name.replace(/"/g, '&quot;')}">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:16px">${r.icon}</span>
          <div style="flex:1; min-width:0;">
            <b>${r.name}</b>
            <small>${r.address}</small>
          </div>
          ${dist}
        </div>
      </div>`;
    }).join('');

    box.querySelectorAll('.dest-sug-item').forEach(item => {
      item.addEventListener('click', () => {
        _selectDest(
          parseFloat(item.dataset.lat),
          parseFloat(item.dataset.lng),
          item.dataset.name
        );
      });
    });
  } catch (err) {
    console.error('[dest-search] Error:', err);
    box.innerHTML = `<div class="dest-sug-status">Search error — check connection</div>`;
  }
}

function _selectDest(lat, lng, name) {
  const input = document.getElementById('dest-input');
  if (input) input.value = name;
  document.getElementById('dest-suggestions')?.classList.remove('visible');
  S.navRoute.destLat  = lat;
  S.navRoute.destLng  = lng;
  S.navRoute.destName = name;

  addToSearchHistory(name, lat, lng);
  showToast('info', `📍 Destination set: ${name}`);
}

/* ────────────────────────────────────────
   FETCH & RENDER ROUTE
──────────────────────────────────────── */
export async function startRoute() {
  if (!S.selectedId)       { showToast('warning', '⚠️ Select a device first'); return; }
  if (!S.navRoute.destLat) { showToast('warning', '⚠️ Search and select a destination first'); return; }

  const dev = S.devices[S.selectedId];
  if (!dev) { showToast('warning', '⚠️ Device not found'); return; }
  if (!isFinite(dev.lat) || !isFinite(dev.lng) || (dev.lat === 0 && dev.lng === 0)) {
    showToast('warning', '⚠️ Device has no GPS position yet'); return;
  }

  const destLat = parseFloat(S.navRoute.destLat);
  const destLng = parseFloat(S.navRoute.destLng);
  if (!isFinite(destLat) || !isFinite(destLng)) {
    showToast('warning', '⚠️ Invalid destination coordinates'); return;
  }

  showToast('info', '🗺️ Fetching route…');
  clearRoute();

  const nr = S.navRoute;
  try {
    const url  = `https://router.project-osrm.org/route/v1/driving/${dev.lng},${dev.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();

    if (data.code !== 'Ok') {
      throw new Error(`OSRM error: ${data.code}${data.message ? ' — ' + data.message : ''}`);
    }
    if (!Array.isArray(data.routes) || !data.routes.length) {
      throw new Error('No route found between these points');
    }

    const route  = data.routes[0];
    const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    const distKm = (route.distance / 1000).toFixed(1);
    const etaMin = Math.round(route.duration / 60);

    nr.fullCoords = coords;
    nr.totalDist  = isFinite(parseFloat(distKm)) ? parseFloat(distKm) : 0;
    // Preserve destination after clearRoute() above reset them
    nr.destLat  = destLat;
    nr.destLng  = destLng;
    nr.destName = S.navRoute.destName || 'Destination';

    mapRenderRoute({
      coords, distKm, etaMin,
      oLat: dev.lat, oLng: dev.lng,
      dLat: destLat, dLng: destLng,
      destName: nr.destName,
      navRoute: nr,
    });

    const _s = id => document.getElementById(id);
    _s('route-meta')?.style.setProperty('display', 'flex');
    if (_s('route-dist-val')) _s('route-dist-val').textContent = distKm;
    if (_s('route-eta-val'))  _s('route-eta-val').textContent  = etaMin;
    _s('route-progress-badge')?.style.setProperty('display', 'inline');
    _s('clear-route-btn')?.style.setProperty('display', 'flex');
    _s('btn-clear-route')?.style.setProperty('display', 'flex');

    showToast('success', `✅ Route: ${distKm} km · ~${etaMin} min`);
  } catch (e) {
    console.error('[route] fetch error:', e);
    showToast('danger', `❌ ${e.message || 'Could not fetch route. Check connection.'}`);
  }
}

/* ────────────────────────────────────────
   PROGRESS UPDATE
──────────────────────────────────────── */
export function updateProgress(curLat, curLng) {
  const nr = S.navRoute;
  if (!nr.fullCoords.length || !nr.line) return;

  let minDist = Infinity, minIdx = 0;
  nr.fullCoords.forEach(([rlat, rlng], i) => {
    const d = haversineM(curLat, curLng, rlat, rlng);
    if (d < minDist) { minDist = d; minIdx = i; }
  });

  const traveled = nr.fullCoords.slice(0, minIdx + 1);
  try {
    nr.line.setLatLngs(traveled.length ? traveled : [[curLat, curLng]]);
  } catch (e) {
    console.warn('[route] setLatLngs failed:', e);
    return;
  }

  const pct = Math.round((minIdx / Math.max(nr.fullCoords.length - 1, 1)) * 100);
  const el  = document.getElementById('route-pct-val');
  if (el) el.textContent = pct;

  if (haversineM(curLat, curLng, nr.destLat, nr.destLng) < 50) {
    showToast('success', `🏁 Arrived at ${nr.destName}!`);
    clearRoute();
  }
}

/* ────────────────────────────────────────
   CLEAR
──────────────────────────────────────── */
export function clearRoute() {
  // ✅ FIX: cancel any pending search timer
  clearTimeout(_destSearchTimer);
  _destSearchTimer = null;

  const nr = S.navRoute;
  ['line', 'lineFull', 'destMarker'].forEach(k => {
    if (nr[k]) { removeRouteLayer(nr[k]); nr[k] = null; }
  });
  nr.destLat    = null;
  nr.destLng    = null;
  nr.fullCoords = [];
  nr.destName   = '';
  nr.totalDist  = 0;

  const di = document.getElementById('dest-input');
  if (di) di.value = '';
  document.getElementById('dest-suggestions')?.classList.remove('visible');
  document.getElementById('route-meta')?.style.setProperty('display', 'none');
  document.getElementById('clear-route-btn')?.style.setProperty('display', 'none');
  document.getElementById('btn-clear-route')?.style.setProperty('display', 'none');
  document.getElementById('route-progress-badge')?.style.setProperty('display', 'none');
}
