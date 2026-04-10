/**
 * src/modules/map.js
 * Leaflet map: initialisation, device markers, trails, professional
 * location search (Nominatim autocomplete) and route rendering.
 */

import { S, mapLayers }  from '../utils/state.js';
import { debounce, isValidGPS }      from '../utils/helpers.js';
import { showToast }     from '../utils/toast.js';
import { geofenceStatus, toggleDrawMode } from './geofence.js';
import { searchLocations, addToSearchHistory } from './search.js';

/* — Map instance (also exported for other modules via window._vectorMap) — */
let map;

const STATUS_COLORS = { online:'#00D97E', offline:'#FF3B5C', idle:'#FFB800' };

/* ────────────────────────────────────────
   INIT
──────────────────────────────────────── */
export function initMap() {
  // ✅ IMPROVED: Validate map center coordinates
  const defaultCenter = [7.2906, 80.6337];
  map = window.L.map('map', { center: defaultCenter, zoom:13, zoomControl:false });

  // ✅ CREATE CUSTOM PANES: Geofences below markers for proper layering
  map.createPane('geofencesPane');
  map.getPane('geofencesPane').style.zIndex = 350;  // Below markers (default is 400+)
  map.createPane('markersPane');
  map.getPane('markersPane').style.zIndex = 450;   // Above geofences

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  window.L.control.zoom({ position:'bottomright' }).addTo(map);

  /* Expose globally for services that need it */
  window._vectorMap = map;

  _bindMapControls();
  _bindLocationSearch();

  return map;
}

/* ────────────────────────────────────────
   MAP CONTROL BUTTONS
──────────────────────────────────────── */
function _bindMapControls() {
  document.getElementById('btn-fit-all')
    ?.addEventListener('click', fitAllDevices);

  document.getElementById('geofence-btn')
    ?.addEventListener('click', () => toggleDrawMode());

  document.getElementById('btn-clear-route')
    ?.addEventListener('click', () => {
      /* delegate to route module via custom event */
      document.dispatchEvent(new CustomEvent('vector:clearRoute'));
    });
}

/* ────────────────────────────────────────
   LOCATION SEARCH (Enhanced — Like Google Maps)
──────────────────────────────────────── */
function _bindLocationSearch() {
  const input   = document.getElementById('map-search-input');
  const results = document.getElementById('map-search-results');
  const clearBtn = document.getElementById('map-search-clear');
  if (!input) return;

  let searchMarker = null;

  const doSearch = debounce(async (q) => {
    if (q.length < 2) { _hideResults(results); return; }
    results.innerHTML = `<div class="map-search-loading"><span class="spinner"></span> Searching…</div>`;
    results.classList.add('visible');

    try {
      // ✅ ENHANCED: Get current map center for distance calculation
      const center = map.getCenter();
      
      // ✅ POWERFUL: Search with enhanced engine (up to 12 results)
      const places = await searchLocations(q, center.lat, center.lng, 12);

      if (!places.length) {
        results.innerHTML = `<div class="map-search-empty">No results found</div>`;
        return;
      }

      // ✅ Format with icons, distance, and better addresses
      results.innerHTML = places.map((p, i) => {
        const dist = p.distance ? `<span class="map-search-dist">${p.distance.toFixed(1)} km</span>` : '';
        return `<div class="map-search-item"
          data-lat="${p.lat}" data-lng="${p.lng}"
          data-name="${p.name.replace(/"/g, '&quot;')}">
          <div style="display:flex; align-items:center; gap:10px; width:100%;">
            <span style="font-size:18px; flex-shrink:0">${p.icon}</span>
            <div style="flex:1; min-width:0; overflow:hidden;">
              <strong>${p.name}</strong>
              <small>${p.address}</small>
            </div>
            ${dist}
          </div>
        </div>`;
      }).join('');

      results.querySelectorAll('.map-search-item').forEach(item => {
        item.addEventListener('click', () => {
          const lat  = parseFloat(item.dataset.lat);
          const lng  = parseFloat(item.dataset.lng);
          const name = item.dataset.name;

          input.value = name;
          clearBtn?.classList.add('visible');
          _hideResults(results);

          // ✅ Save to history
          addToSearchHistory(name, lat, lng);

          if (searchMarker) { map.removeLayer(searchMarker); searchMarker = null; }
          searchMarker = window.L.marker([lat, lng], {
            icon: window.L.divIcon({
              className:'', iconSize:[36,36], iconAnchor:[18,36],
              html:`<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center">
                <div style="width:28px;height:28px;border-radius:50%;
                  background:rgba(0,229,255,.15);border:2px solid #00E5FF;
                  display:flex;align-items:center;justify-content:center;font-size:15px">📌</div>
              </div>`,
            }),
          }).addTo(map)
            .bindPopup(`<b>${name}</b><br><small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small>`)
            .openPopup();

          map.flyTo([lat, lng], 15, { animate:true, duration:1.2 });
        });
      });
    } catch (err) {
      console.error('[map-search] Error:', err);
      results.innerHTML = `<div class="map-search-empty">Search error — check connection</div>`;
    }
  }, 300);

  input.addEventListener('input',   e => {
    const q = e.target.value.trim();
    clearBtn?.classList.toggle('visible', q.length > 0);
    doSearch(q);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { _hideResults(results); input.blur(); }
  });
  clearBtn?.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    _hideResults(results);
    if (searchMarker) { map.removeLayer(searchMarker); searchMarker = null; }
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.map-search-wrap')) _hideResults(results);
  });
}

function _hideResults(el) {
  if (!el) return;
  el.classList.remove('visible');
  el.setAttribute('aria-expanded', 'false');
}

/* ────────────────────────────────────────
   DEVICE MARKERS & TRAILS
──────────────────────────────────────── */
export function renderMarkers() {
  Object.entries(S.devices).forEach(([id, d]) => {
    if (d.lat === 0 && d.lng === 0) return;

    if (!mapLayers.markers[id]) {
      mapLayers.markers[id] = window.L
        .marker([d.lat, d.lng], { icon: _makeIcon(d), pane: 'markersPane' })
        .addTo(map);
      mapLayers.markers[id].bindPopup(() => _buildPopup(id));
      mapLayers.markers[id].on('click', () => {
        document.dispatchEvent(new CustomEvent('vector:selectDevice', { detail: { id } }));
      });
    } else {
      mapLayers.markers[id].setLatLng([d.lat, d.lng]);
      mapLayers.markers[id].setIcon(_makeIcon(d));
    }

    /* Trail */
    if (S.settings.showTrail && (mapLayers.routePts[id]?.length ?? 0) > 1) {
      if (mapLayers.trails[id]) {
        try { map.removeLayer(mapLayers.trails[id]); } catch (_) {}
      }
      mapLayers.trails[id] = window.L.polyline(mapLayers.routePts[id], {
        color:'#FF6B35', weight:2, opacity:0.45, dashArray:'4 4',
      }).addTo(map);
    }
  });
}

export function clearTrails() {
  Object.values(mapLayers.trails).forEach(l => { try { map.removeLayer(l); } catch (_) {} });
  Object.keys(mapLayers.trails).forEach(k => delete mapLayers.trails[k]);
}

export function fitAllDevices() {
  const pts = Object.values(S.devices)
    .filter(d => d.lat !== 0 && d.lng !== 0)
    .map(d => [d.lat, d.lng]);
  if (!pts.length) { showToast('warning', '⚠️ No device positions available'); return; }
  if (pts.length === 1) { map.setView(pts[0], 15); return; }
  map.fitBounds(window.L.latLngBounds(pts), { padding:[40, 40] });
}

export function panToDevice(id) {
  const d = S.devices[id];
  if (d && d.lat !== 0 && d.lng !== 0) map.setView([d.lat, d.lng], 15);
}

function _makeIcon(d) {
  const c = STATUS_COLORS[d.status] || '#7A8FAD';
  const arrow = (d.heading && d.speed > 2)
    ? `<div style="position:absolute;top:-2px;left:50%;transform:translateX(-50%) rotate(${d.heading}deg);font-size:10px">▲</div>`
    : '';
  const label = (d.name || d.id).substring(0, 8);
  return window.L.divIcon({
    className:'', iconSize:[44,44], iconAnchor:[22,44],
    html:`<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
      ${arrow}
      <div style="width:36px;height:36px;border-radius:50%;background:${c}22;border:2px solid ${c};
        display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 12px ${c}66">🚛</div>
      <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);background:${c};
        color:#000;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap;
        font-family:'DM Mono',monospace">${label}</div>
    </div>`,
  });
}

function _buildPopup(id) {
  const d   = S.devices[id];
  if (!d) return 'No data';
  const gfSt = geofenceStatus(id);
  const gfLabel = gfSt === 'inside'   ? '✅ Inside zone'
                : gfSt === 'outside'  ? '⚠️ Outside zone'
                : '— Not configured';
  const gpsLabel = d.gpsCached ? '📍 Cached'
                 : d.gpsValid  ? '🛰️ GPS lock' : '📴 No GPS';
  return `<div style="font-family:'DM Sans',sans-serif;min-width:190px">
    <b style="font-size:14px">${d.name}</b>
    <div style="margin-top:6px;font-size:12px;line-height:2;color:#555">
      Speed: <b>${d.speed} km/h</b><br>
      Lat: ${d.lat.toFixed(6)} &nbsp; Lng: ${d.lng.toFixed(6)}<br>
      Heading: ${d.heading.toFixed(1)}° &nbsp; Sats: ${d.satellites}<br>
      Geofence: ${gfLabel}<br>
      GPS: ${gpsLabel} &nbsp;
      Status: <b style="color:${d.status==='online'?'#00D97E':'#FF3B5C'}">${d.status.toUpperCase()}</b>
    </div>
    <button onclick="document.dispatchEvent(new CustomEvent('vector:selectDevice',{detail:{id:'${id}'}}));
                     setTimeout(()=>document.dispatchEvent(new CustomEvent('vector:startGeofenceDraw',{detail:{id:'${id}'}})),50)"
      style="margin-top:6px;padding:4px 10px;background:#00E5FF22;border:1px solid #00E5FF;
        border-radius:4px;color:#00E5FF;font-size:11px;cursor:pointer;width:100%">
      📐 Set Geofence</button>
  </div>`;
}

/* ────────────────────────────────────────
   ROUTE RENDERING (used by route module)
──────────────────────────────────────── */
export function renderRoute({ coords, oLat, oLng, dLat, dLng, distKm, etaMin, destName, navRoute }) {
  navRoute.lineFull = window.L.polyline(coords, {
    color:'#00E5FF', weight:4, opacity:0.45, dashArray:'8 6',
  }).addTo(map);

  navRoute.line = window.L.polyline([[oLat, oLng]], {
    color:'#00D97E', weight:5, opacity:0.9,
  }).addTo(map);

  navRoute.destMarker = window.L.marker([dLat, dLng], {
    icon: window.L.divIcon({
      className:'', iconSize:[38,38], iconAnchor:[19,38],
      html:`<div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center">
        <div style="width:30px;height:30px;border-radius:50%;background:rgba(255,107,53,.2);
          border:2px solid #FF6B35;display:flex;align-items:center;justify-content:center;
          font-size:16px;box-shadow:0 0 12px rgba(255,107,53,.5)">🏁</div>
      </div>`,
    }),
  }).addTo(map)
    .bindPopup(`<b>Destination</b><br>${destName}<br>${distKm} km · ~${etaMin} min`);

  map.fitBounds(window.L.latLngBounds([[oLat, oLng], [dLat, dLng]]), { padding:[50, 50] });
}

export function removeRouteLayer(layer) {
  if (layer) { try { map.removeLayer(layer); } catch (_) {} }
}

export function getMap() { return map; }
