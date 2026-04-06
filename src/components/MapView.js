/**
 * src/components/MapView.js
 * Leaflet map with:
 *  - Device markers with heading arrows
 *  - Trail polylines
 *  - Professional map search (Nominatim autocomplete)
 *  - Geofence draw mode
 *  - OSRM route rendering
 */

import { state, mapLayers } from '../utils/state.js';
import { geofenceService }  from '../services/geofenceService.js';
import { searchPlaces }     from '../services/geocodingService.js';
import { debounce }         from '../utils/helpers.js';
import { showToast }        from '../utils/toast.js';

/** @type {L.Map} */
let map;

/** Geofence draw-mode state */
let gfDrawMode     = false;
let gfDrawTargetId = null;

/** Callbacks */
let _onDeviceClick = null;

const STATUS_COLORS = {
  online:  '#00D97E',
  offline: '#FF3B5C',
  idle:    '#FFB800',
};

export const MapView = {
  /**
   * Build and return the map container element.
   * Must call MapView.init() after inserting into the DOM.
   * @param {{ onDeviceClick: Function }} callbacks
   * @returns {HTMLElement}
   */
  render({ onDeviceClick }) {
    _onDeviceClick = onDeviceClick;

    const wrap = document.createElement('div');
    wrap.className = 'map-wrap';
    wrap.innerHTML = `
      <div id="map"></div>

      <!-- Map controls (top-left) -->
      <div class="map-ctrls">
        <button class="map-btn" id="btn-fit-all">🔍 Fit All</button>
        <button class="map-btn" id="btn-geofence">📐 Set Geofence</button>
        <button class="map-btn" id="btn-clear-route"
          style="display:none;color:var(--danger)">✕ Clear Route</button>
      </div>

      <!-- Professional map search (top-right) -->
      <div class="map-search-wrap">
        <input
          type="text"
          id="map-search-input"
          class="map-search-input"
          placeholder="🔍 Search any location…"
          autocomplete="off"
          spellcheck="false"
          aria-label="Search location"
          aria-autocomplete="list"
          aria-expanded="false"
        />
        <button class="map-search-clear" id="map-search-clear" aria-label="Clear search">✕</button>
        <div class="map-search-results" id="map-search-results" role="listbox"></div>
      </div>

      <!-- Geofence info (bottom-left) -->
      <div class="geofence-info" id="geofence-info"></div>
      <!-- Draw hint (bottom-right) -->
      <div class="draw-hint" id="draw-hint">📌 Click map to set geofence center</div>
    `;

    return wrap;
  },

  /** Initialise Leaflet map. Must be called after the element is in the DOM. */
  init() {
    map = L.map('map', {
      center:      [7.2906, 80.6337],
      zoom:        13,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom:     19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Expose globally for services
    window._nextrackMap = map;

    this._bindControls();
    this._bindSearch();
  },

  /** @private — bind map control buttons */
  _bindControls() {
    document.getElementById('btn-fit-all')
      ?.addEventListener('click', () => this.fitAllDevices());

    document.getElementById('btn-geofence')
      ?.addEventListener('click', () => this.toggleGeofenceDraw());

    document.getElementById('btn-clear-route')
      ?.addEventListener('click', () => window._nextrackApp?.clearRoute());
  },

  // ─────────────────────────────────────────
  // PROFESSIONAL MAP SEARCH
  // ─────────────────────────────────────────

  /** @private — bind the map search input */
  _bindSearch() {
    const input   = document.getElementById('map-search-input');
    const results = document.getElementById('map-search-results');
    const clear   = document.getElementById('map-search-clear');
    if (!input) return;

    /** @type {L.Marker|null} */
    let searchMarker = null;

    const doSearch = debounce(async (q) => {
      if (q.length < 3) {
        this._hideSearchResults();
        return;
      }
      this._showSearchLoading();

      const places = await searchPlaces(q, 6);

      if (!places.length) {
        this._showSearchEmpty();
        return;
      }

      results.innerHTML = places.map((p, i) => `
        <div class="map-search-item" role="option" data-idx="${i}"
             data-lat="${p.lat}" data-lng="${p.lng}"
             data-name="${p.primaryName.replace(/"/g, '&quot;')}">
          <strong>${p.primaryName}</strong>
          <small>${p.secondaryName}</small>
        </div>`).join('');

      results.classList.add('visible');
      input.setAttribute('aria-expanded', 'true');

      // Click handler
      results.querySelectorAll('.map-search-item').forEach(item => {
        item.addEventListener('click', () => {
          const lat  = parseFloat(item.dataset.lat);
          const lng  = parseFloat(item.dataset.lng);
          const name = item.dataset.name;

          input.value = name;
          clear.classList.add('visible');
          this._hideSearchResults();

          // Remove previous search marker
          if (searchMarker) { map.removeLayer(searchMarker); searchMarker = null; }

          // Place a marker and fly to it
          searchMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: '',
              iconSize:  [36, 36],
              iconAnchor:[18, 36],
              html: `<div style="width:36px;height:36px;display:flex;align-items:center;
                      justify-content:center;filter:drop-shadow(0 2px 8px rgba(0,229,255,.6))">
                       <div style="width:28px;height:28px;border-radius:50%;
                         background:rgba(0,229,255,.15);border:2px solid #00E5FF;
                         display:flex;align-items:center;justify-content:center;font-size:15px">📌</div>
                     </div>`,
            }),
          }).addTo(map);

          searchMarker.bindPopup(
            `<b>${name}</b><br><span style="font-size:11px;color:#888">
              ${lat.toFixed(5)}, ${lng.toFixed(5)}</span>`
          ).openPopup();

          map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 });
        });
      });
    }, 350);

    input.addEventListener('input', e => {
      const q = e.target.value.trim();
      clear.classList.toggle('visible', q.length > 0);
      doSearch(q);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this._hideSearchResults();
        input.blur();
      }
    });

    clear.addEventListener('click', () => {
      input.value = '';
      clear.classList.remove('visible');
      this._hideSearchResults();
      if (searchMarker) { map.removeLayer(searchMarker); searchMarker = null; }
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('.map-search-wrap')) {
        this._hideSearchResults();
      }
    });
  },

  /** @private */
  _showSearchLoading() {
    const r = document.getElementById('map-search-results');
    if (!r) return;
    r.innerHTML = `<div class="map-search-loading"><span class="spinner"></span> Searching…</div>`;
    r.classList.add('visible');
  },

  /** @private */
  _showSearchEmpty() {
    const r = document.getElementById('map-search-results');
    if (!r) return;
    r.innerHTML = `<div class="map-search-empty">No results found</div>`;
    r.classList.add('visible');
  },

  /** @private */
  _hideSearchResults() {
    const r = document.getElementById('map-search-results');
    const i = document.getElementById('map-search-input');
    if (r) r.classList.remove('visible');
    if (i) i.setAttribute('aria-expanded', 'false');
  },

  // ─────────────────────────────────────────
  // MARKERS & TRAILS
  // ─────────────────────────────────────────

  /** Re-render all device markers and trails. */
  renderMarkers() {
    Object.entries(state.devices).forEach(([id, d]) => {
      if (d.lat === 0 && d.lng === 0) return;

      if (!mapLayers.markers[id]) {
        mapLayers.markers[id] = L.marker([d.lat, d.lng], { icon: this._makeIcon(d) }).addTo(map);
        mapLayers.markers[id].bindPopup(() => this._buildPopup(id));
        mapLayers.markers[id].on('click', () => _onDeviceClick?.(id));
      } else {
        mapLayers.markers[id].setLatLng([d.lat, d.lng]);
        mapLayers.markers[id].setIcon(this._makeIcon(d));
      }

      // Trail
      if (state.settings.showTrail && (mapLayers.routePts[id]?.length ?? 0) > 1) {
        if (mapLayers.trails[id]) {
          try { map.removeLayer(mapLayers.trails[id]); } catch (_) {}
        }
        mapLayers.trails[id] = L.polyline(mapLayers.routePts[id], {
          color:     '#FF6B35',
          weight:    2,
          opacity:   0.45,
          dashArray: '4 4',
        }).addTo(map);
      }
    });
  },

  /** Fit map view to all device positions. */
  fitAllDevices() {
    const pts = Object.values(state.devices)
      .filter(d => d.lat !== 0 && d.lng !== 0)
      .map(d => [d.lat, d.lng]);

    if (!pts.length) { showToast('warning', '⚠️ No device positions available'); return; }
    if (pts.length === 1) { map.setView(pts[0], 15); return; }
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
  },

  /** Pan map to a specific device. */
  panToDevice(id) {
    const d = state.devices[id];
    if (d && d.lat !== 0 && d.lng !== 0) {
      map.setView([d.lat, d.lng], 15);
    }
  },

  /** Remove all trail lines from the map. */
  clearTrails() {
    Object.values(mapLayers.trails).forEach(l => {
      try { map.removeLayer(l); } catch (_) {}
    });
    Object.keys(mapLayers.trails).forEach(k => delete mapLayers.trails[k]);
  },

  // ─────────────────────────────────────────
  // GEOFENCE DRAW MODE
  // ─────────────────────────────────────────

  /**
   * Toggle geofence draw mode.
   * @param {string|null} [targetId]
   */
  toggleGeofenceDraw(targetId) {
    gfDrawMode     = !gfDrawMode;
    gfDrawTargetId = targetId ?? state.selectedId;

    const btn  = document.getElementById('btn-geofence');
    const hint = document.getElementById('draw-hint');

    if (gfDrawMode) {
      btn?.classList.add('active');
      if (hint) {
        hint.style.display = 'block';
        hint.textContent   = gfDrawTargetId
          ? `📌 Click map for geofence — ${state.devices[gfDrawTargetId]?.name ?? gfDrawTargetId}`
          : '📌 Click on map to place geofence center';
      }
      map.on('click', this._onMapClickGF.bind(this));
    } else {
      btn?.classList.remove('active');
      if (hint) hint.style.display = 'none';
      map.off('click', this._onMapClickGF.bind(this));
    }
  },

  /** @private */
  _onMapClickGF(e) {
    const id = gfDrawTargetId ?? state.selectedId;
    if (!id) {
      showToast('warning', '⚠️ Select a device first');
      this.toggleGeofenceDraw();
      return;
    }

    const gf = geofenceService.get(id);
    gf.lat   = e.latlng.lat;
    gf.lng   = e.latlng.lng;

    const radEl = document.getElementById(`gf-rad-${id}`);
    if (radEl) gf.radius = parseInt(radEl.value, 10) || 500;

    geofenceService.draw(id);
    this._updateGeofenceInfo(id);
    this.toggleGeofenceDraw();

    showToast('info', `📐 Geofence set for ${state.devices[id]?.name ?? id}!`);
    // Re-render the settings table if visible
    window._nextrackApp?.renderGeofenceTable();
  },

  /** @private */
  _updateGeofenceInfo(id) {
    const gf   = geofenceService.get(id);
    const info = document.getElementById('geofence-info');
    if (!info) return;
    info.style.display = 'block';
    info.innerHTML = `📐 <b>${state.devices[id]?.name ?? id}</b><br>
      Radius: ${gf.radius} m<br>
      ${gf.lat.toFixed(5)}, ${gf.lng.toFixed(5)}`;
  },

  // ─────────────────────────────────────────
  // ROUTE RENDERING
  // ─────────────────────────────────────────

  /**
   * Render route layers on the map.
   * @param {[number,number][]} coords  - full route coordinates
   * @param {number} oLat
   * @param {number} oLng
   * @param {number} dLat
   * @param {number} dLng
   * @param {string} distKm
   * @param {number} etaMin
   * @param {string} destName
   */
  renderRoute(coords, oLat, oLng, dLat, dLng, distKm, etaMin, destName) {
    const nr = state.navRoute;

    // Full route (dashed cyan)
    nr.lineFull = L.polyline(coords, {
      color: '#00E5FF', weight: 4, opacity: 0.45, dashArray: '8 6',
    }).addTo(map);

    // Traveled portion (solid green, starts at origin)
    nr.line = L.polyline([[oLat, oLng]], {
      color: '#00D97E', weight: 5, opacity: 0.9,
    }).addTo(map);

    // Destination marker
    nr.destMarker = L.marker([dLat, dLng], {
      icon: L.divIcon({
        className: '',
        iconSize:  [38, 38],
        iconAnchor:[19, 38],
        html: `<div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center">
          <div style="width:30px;height:30px;border-radius:50%;background:rgba(255,107,53,.2);
            border:2px solid #FF6B35;display:flex;align-items:center;justify-content:center;
            font-size:16px;box-shadow:0 0 12px rgba(255,107,53,.5)">🏁</div>
        </div>`,
      }),
    }).addTo(map)
      .bindPopup(`<b>Destination</b><br>${destName}<br>${distKm} km · ~${etaMin} min`);

    map.fitBounds(L.latLngBounds([[oLat, oLng], [dLat, dLng]]), { padding: [50, 50] });

    // Show/hide clear-route button on map
    const clearBtn = document.getElementById('btn-clear-route');
    if (clearBtn) clearBtn.style.display = 'flex';
  },

  /** Hide the clear-route button. */
  hideClearRouteBtn() {
    const btn = document.getElementById('btn-clear-route');
    if (btn) btn.style.display = 'none';
  },

  // ─────────────────────────────────────────
  // ICON FACTORY
  // ─────────────────────────────────────────

  /** @private */
  _makeIcon(d) {
    const c = STATUS_COLORS[d.status] ?? '#7A8FAD';
    const arrow = (d.heading && d.speed > 2)
      ? `<div style="position:absolute;top:-2px;left:50%;transform:translateX(-50%) rotate(${d.heading}deg);
           font-size:10px;line-height:1">▲</div>`
      : '';
    const label = (d.name || d.id).substring(0, 8);

    return L.divIcon({
      className: '',
      iconSize:  [44, 44],
      iconAnchor:[22, 44],
      html: `
        <div style="position:relative;width:44px;height:44px;
            display:flex;align-items:center;justify-content:center">
          ${arrow}
          <div style="width:36px;height:36px;border-radius:50%;
              background:${c}22;border:2px solid ${c};
              display:flex;align-items:center;justify-content:center;
              font-size:16px;box-shadow:0 0 12px ${c}66">🚛</div>
          <div style="position:absolute;bottom:-2px;left:50%;
              transform:translateX(-50%);background:${c};
              color:#000;font-size:9px;font-weight:700;
              padding:1px 5px;border-radius:4px;white-space:nowrap;
              font-family:'DM Mono',monospace">${label}</div>
        </div>`,
    });
  },

  /** @private */
  _buildPopup(id) {
    const d  = state.devices[id];
    if (!d) return 'No data';
    const gf = geofenceService.get(id);
    const gpsLine = d.gpsCached
      ? '<span style="color:#FFB800">📍 Cached position</span>'
      : (d.gpsValid ? '🛰️ GPS lock' : '📴 No GPS');

    return `
      <div style="font-family:'DM Sans',sans-serif;min-width:180px">
        <b style="font-size:14px">${d.name}</b>
        <div style="margin-top:6px;font-size:12px;line-height:2;color:#555">
          Speed: <b>${d.speed} km/h</b><br>
          Lat: ${d.lat.toFixed(6)}<br>
          Lng: ${d.lng.toFixed(6)}<br>
          Heading: ${d.heading.toFixed(1)}°<br>
          Sats: ${d.satellites}<br>
          Geofence: <b>${gf.radius} m</b><br>
          GPS: ${gpsLine}<br>
          Status: <b style="color:${d.status === 'online' ? '#00D97E' : '#FF3B5C'}">${d.status.toUpperCase()}</b>
        </div>
        <button
          onclick="window._nextrackApp?.selectDevice('${id}');window._nextrackApp?.startGeofenceDraw('${id}')"
          style="margin-top:6px;padding:4px 10px;background:#00E5FF22;
            border:1px solid #00E5FF;border-radius:4px;color:#00E5FF;
            font-size:11px;cursor:pointer;width:100%">📐 Set Geofence</button>
      </div>`;
  },
};
