/**
 * src/modules/route.js
 * OSRM driving routes — fetch, render on map, track progress.
 */

import { S }         from '../utils/state.js';
import { haversineM, debounce } from '../utils/helpers.js';
import { showToast } from '../utils/toast.js';
import { renderRoute as mapRenderRoute, removeRouteLayer } from './map.js';
import { searchLocations, addToSearchHistory, getSearchHistory } from './search.js';

let _destSearchTimer = null;

/* ────────────────────────────────────────
   DESTINATION SEARCH INPUT
──────────────────────────────────────── */
export function onDestInput(val) {
  const box = document.getElementById('dest-suggestions');
  if (!box) return;
  const q = val.trim();
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
    // ✅ Get reference location for distance calculation
    const dev = S.devices[S.selectedId];
    const refLat = dev?.lat || null;
    const refLng = dev?.lng || null;

    // ✅ POWERFUL: Search with enhanced engine
    const results = await searchLocations(q, refLat, refLng, 10);

    if (!results.length) {
      box.innerHTML = `<div class="dest-sug-status">No results found</div>`;
      return;
    }

    // ✅ Format with icons, distance, and address
    box.innerHTML = results.map((r, i) => {
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
  
  // ✅ Save to history
  addToSearchHistory(name, lat, lng);
  
  showToast('info', `📍 Destination set: ${name}`);
}

/* ────────────────────────────────────────
   FETCH & RENDER ROUTE
──────────────────────────────────────── */
export async function startRoute() {
  if (!S.selectedId)        { showToast('warning', '⚠️ Select a device first'); return; }
  if (!S.navRoute.destLat)  { showToast('warning', '⚠️ Search and select a destination first'); return; }

  const dev = S.devices[S.selectedId];
  if (!dev)                  { showToast('warning', '⚠️ Device not found'); return; }
  if (dev.lat === 0 || dev.lng === 0) { showToast('warning', '⚠️ Device has no GPS position yet'); return; }

  // ✅ IMPROVED: Validate destination coordinates
  const destLat = parseFloat(S.navRoute.destLat);
  const destLng = parseFloat(S.navRoute.destLng);
  if (!isFinite(destLat) || !isFinite(destLng)) {
    showToast('warning', '⚠️ Invalid destination coordinates');
    return;
  }

  showToast('info', '🗺️ Fetching route…');
  clearRoute();

  const nr = S.navRoute;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${dev.lng},${dev.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
    console.log('[route] fetching from OSRM:', url);
    
    const res  = await fetch(url);
    
    // ✅ IMPROVED: Check if response is ok before parsing
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // ✅ IMPROVED: Check response code
    if (data.code !== 'Ok') {
      console.error('[route] OSRM error code:', data.code, data.message);
      throw new Error(`OSRM Error: ${data.code}` + (data.message ? ` - ${data.message}` : ''));
    }

    // ✅ IMPROVED: Validate routes array exists
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found between these points');
    }

    const coords = data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    const distKm = (data.routes[0].distance / 1000).toFixed(1);
    const etaMin = Math.round(data.routes[0].duration / 60);

    nr.fullCoords = coords;
    nr.totalDist  = parseFloat(distKm);

    mapRenderRoute({
      coords, distKm, etaMin,
      oLat: dev.lat, oLng: dev.lng,
      dLat: destLat, dLng: destLng,
      destName: nr.destName,
      navRoute: nr,
    });

    /* Update right-panel route meta */
    document.getElementById('route-meta')?.style.setProperty('display','flex');
    document.getElementById('route-dist-val') && (document.getElementById('route-dist-val').textContent = distKm);
    document.getElementById('route-eta-val')  && (document.getElementById('route-eta-val').textContent  = etaMin);
    document.getElementById('route-progress-badge')?.style.setProperty('display','inline');
    document.getElementById('clear-route-btn')?.style.setProperty('display','flex');
    document.getElementById('btn-clear-route')?.style.setProperty('display','flex');

    showToast('success', `✅ Route: ${distKm} km · ~${etaMin} min`);
  } catch (e) {
    console.error('[route] fetch error:', e);
    showToast('danger', `❌ ${e.message || 'Could not fetch route. Check connection.'}`);
  }
}

/* ────────────────────────────────────────
   PROGRESS UPDATE (called on each device update)
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

  /* Arrival detection (< 50 m) */
  if (haversineM(curLat, curLng, nr.destLat, nr.destLng) < 50) {
    showToast('success', `🏁 Arrived at ${nr.destName}!`);
    clearRoute();
  }
}

/* ────────────────────────────────────────
   CLEAR
──────────────────────────────────────── */
export function clearRoute() {
  const nr = S.navRoute;
  ['line','lineFull','destMarker'].forEach(k => {
    if (nr[k]) { removeRouteLayer(nr[k]); nr[k] = null; }
  });
  nr.destLat = null; nr.destLng = null;
  nr.fullCoords = []; nr.destName = '';

  const di = document.getElementById('dest-input');
  if (di) di.value = '';
  document.getElementById('route-meta')?.style.setProperty('display','none');
  document.getElementById('clear-route-btn')?.style.setProperty('display','none');
  document.getElementById('btn-clear-route')?.style.setProperty('display','none');
  document.getElementById('route-progress-badge')?.style.setProperty('display','none');
}
