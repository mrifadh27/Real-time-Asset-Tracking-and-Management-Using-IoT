/**
 * src/App.js
 * Application orchestrator — wires all services, components, and pages together.
 * No business logic lives here; it only delegates to the correct module.
 */

import { state, mapLayers }  from './utils/state.js';
import { showToast }         from './utils/toast.js';
import { debounce }          from './utils/helpers.js';

import { initFirebase, getDb, pushRecord, batchUpdate, subscribe } from './services/firebaseService.js';
import { deviceService }     from './services/deviceService.js';
import { alertService }      from './services/alertService.js';
import { geofenceService }   from './services/geofenceService.js';
import { routeService }      from './services/routeService.js';
import { searchPlaces }      from './services/geocodingService.js';

import { Sidebar }   from './components/Sidebar.js';
import { Topbar }    from './components/Topbar.js';
import { MapView }   from './components/MapView.js';
import { Charts }    from './components/Charts.js';
import { usePlayback } from './hooks/usePlayback.js';

import {
  renderDashboardPage,
  renderAnalyticsPage,
  renderAlertsPage,
  renderSettingsPage,
} from './pages/pages.js';

const PAGE_META = {
  dashboard: ['Live Map',     'Real-time asset tracking'],
  analytics: ['Analytics',    'Performance metrics & insights'],
  alerts:    ['Alert Center', 'Monitoring & incident log'],
  settings:  ['Settings',     'Platform configuration'],
};

const ALERT_ICONS = { offline: '⚫', geofence: '🔵', speed: '🟠', sync: '🟢' };

class App {
  constructor() {
    this._playback = null;
  }

  /** Entry point — called from main.js after DOM ready. */
  async mount() {
    // ── 1. Firebase ──
    initFirebase();
    window._nextrackDb  = getDb();
    window._nextrackApp = this;

    // ── 2. Build DOM skeleton ──
    this._buildLayout();

    // ── 3. Init Leaflet map ──
    MapView.init();

    // ── 4. Init charts (canvases are now in DOM) ──
    Charts.init();

    // ── 5. Init playback hook ──
    this._playback = usePlayback();

    // ── 6. Bind page-level events ──
    this._bindDashboardEvents();
    this._bindAnalyticsEvents();
    this._bindAlertsEvents();
    this._bindSettingsEvents();

    // ── 7. Start Firebase listeners ──
    this._startListening();

    // ── 8. Periodic activity chart refresh ──
    setInterval(() => Charts.updateActivity(), 30_000);

    // ── 9. Remove loading screen ──
    document.getElementById('loading-screen')?.remove();
  }

  // ─────────────────────────────────────────
  // LAYOUT BUILDER
  // ─────────────────────────────────────────

  _buildLayout() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    const layout = document.createElement('div');
    layout.className = 'layout';

    // Sidebar
    const sidebar = Sidebar.render({
      onNavigate:     (page, el) => this.showPage(page, el),
      onDeviceSelect: (id)       => this.selectDevice(id),
      onGeofenceSet:  (id)       => MapView.toggleGeofenceDraw(id),
    });

    // Main
    const main = document.createElement('div');
    main.className = 'main';

    // Topbar
    main.appendChild(Topbar.render({
      onToggleTheme: () => this.toggleTheme(),
    }));

    // Pages
    main.appendChild(this._buildPage('dashboard', renderDashboardPage(), true));
    main.appendChild(this._buildPage('analytics', renderAnalyticsPage()));
    main.appendChild(this._buildPage('alerts',    renderAlertsPage()));
    main.appendChild(this._buildPage('settings',  renderSettingsPage()));

    layout.appendChild(sidebar);
    layout.appendChild(main);
    app.appendChild(layout);

    // Toast container
    const toasts = document.createElement('div');
    toasts.id = 'toasts';
    document.body.appendChild(toasts);

    // Mount MapView into #map-mount (now in DOM)
    const mount = document.getElementById('map-mount');
    if (mount) mount.replaceWith(MapView.render({
      onDeviceClick: (id) => this.selectDevice(id),
    }));
  }

  /** @private */
  _buildPage(id, html, active = false) {
    const section       = document.createElement('section');
    section.className   = `page${active ? ' active' : ''}`;
    section.id          = `page-${id}`;
    section.innerHTML   = html;
    return section;
  }

  // ─────────────────────────────────────────
  // FIREBASE LISTENERS
  // ─────────────────────────────────────────

  _startListening() {
    // Assets
    subscribe('/assets', snap => {
      const data = snap.val() ?? {};
      const now  = Date.now();
      Object.entries(data).forEach(([id, d]) => deviceService.process(id, d, now));

      this._afterDeviceUpdate();
      Sidebar.updateSyncTime();
      Topbar.setConnectionStatus(true);
    }, err => {
      console.error('[Firebase] assets error:', err);
      Topbar.setConnectionStatus(false);
      showToast('danger', `❌ Firebase error: ${err.message}`);
    });

    // Alerts
    subscribe('/alerts', snap => {
      alertService.processSnapshot(snap);
      this._renderAlertList();
      Sidebar.updateAlertBadge();
    });

    // Connection state
    getDb().ref('.info/connected').on('value', snap => {
      const connected = snap.val() === true;
      Topbar.setConnectionStatus(connected);

      if (connected && state.isOffline) {
        state.isOffline = false;
        this._syncOfflineQueue();
      } else if (!connected) {
        state.isOffline = true;
      }
    });

    // Device offline event (fired by deviceService after timeout)
    window.addEventListener('device:offline', ({ detail: { id } }) => {
      Sidebar.updateDeviceList();
      MapView.renderMarkers();
      if (state.selectedId === id) {
        this._updatePanel();
        document.getElementById('offline-banner')?.classList.add('show');
      }
    });
  }

  /** Called after every batch of device updates. */
  _afterDeviceUpdate() {
    Sidebar.updateDeviceList();
    MapView.renderMarkers();
    geofenceService.drawAll();
    this._updateAnalyticsStats();

    if (state.selectedId) {
      this._updatePanel();
      const d = state.devices[state.selectedId];
      if (d && state.navRoute.destLat) {
        routeService.updateProgress(d.lat, d.lng);
      }
    }

    Topbar.updateOfflinePill(deviceService.offlineQueueCount());
    document.getElementById('offline-queue-count')
      && (document.getElementById('offline-queue-count').textContent =
          deviceService.offlineQueueCount() + ' records');
  }

  // ─────────────────────────────────────────
  // OFFLINE SYNC
  // ─────────────────────────────────────────

  async _syncOfflineQueue() {
    const total = deviceService.offlineQueueCount();
    if (total === 0 || !state.settings.autoSync) return;

    document.getElementById('offline-sync-bar')?.classList.add('show');
    showToast('info', `🔄 Syncing ${total} offline records…`);

    const promises = [];
    Object.entries(state.offlineQueue).forEach(([id, queue]) => {
      if (!queue.length) return;
      const batch = {};
      queue.forEach((rec, i) => {
        batch[`offline_${id}_${rec.ts}_${i}`] = { ...rec, deviceId: id };
      });
      promises.push(
        batchUpdate('/offline_data', batch).then(() => {
          state.offlineQueue[id] = [];
          Topbar.updateOfflinePill(deviceService.offlineQueueCount());
        })
      );
    });

    try {
      await Promise.all(promises);
      document.getElementById('offline-sync-bar')?.classList.remove('show');
      const firstId = Object.keys(state.offlineQueue)[0] ?? 'sys';
      alertService.fire(firstId, 'sync', `Synced ${total} offline records`);
      showToast('success', `✅ Offline sync complete! ${total} records uploaded.`);
    } catch {
      document.getElementById('offline-sync-bar')?.classList.remove('show');
      showToast('danger', '❌ Offline sync failed. Will retry on reconnect.');
    }
  }

  // ─────────────────────────────────────────
  // PAGE NAVIGATION
  // ─────────────────────────────────────────

  showPage(page, el) {
    document.querySelectorAll('.page').forEach(s => s.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');
    Sidebar.setActivePage(page);

    const [title, sub] = PAGE_META[page] ?? ['', ''];
    Topbar.setTitle(title, sub);

    if (page === 'analytics') {
      Charts.updateAnalytics();
      Charts.updateActivity();
      this._updateAnalyticsStats();
    }
    if (page === 'alerts') {
      state.alertUnread = 0;
      Sidebar.updateAlertBadge();
      this._renderAlertList();
    }
    if (page === 'settings') {
      this.renderGeofenceTable();
      this._populateSettingsForm();
    }
  }

  // ─────────────────────────────────────────
  // DEVICE SELECTION & PANEL
  // ─────────────────────────────────────────

  selectDevice(id) {
    state.selectedId = id;
    Sidebar.updateDeviceList();
    this._updatePanel();
    MapView.panToDevice(id);
    this._playback.loadRoute(id);

    const d = state.devices[id];
    document.getElementById('offline-banner')
      ?.classList.toggle('show', d?.status === 'offline');
    document.getElementById('cached-banner')
      ?.classList.toggle('show', d?.gpsCached === true && d?.status !== 'offline');

    geofenceService.drawAll();
    if (state.geofences[id]) {
      const gf   = geofenceService.get(id);
      const info = document.getElementById('geofence-info');
      if (info) {
        info.style.display = 'block';
        info.innerHTML = `📐 <b>${d?.name ?? id}</b><br>
          Radius: ${gf.radius} m<br>${gf.lat.toFixed(5)}, ${gf.lng.toFixed(5)}`;
      }
    }
  }

  _updatePanel() {
    const d = state.devices[state.selectedId];
    if (!d) return;

    this._setText('active-name',  d.name);
    this._setText('active-lat',   d.lat.toFixed(6));
    this._setText('active-lng',   d.lng.toFixed(6));
    this._setText('active-alt',   d.altitude.toFixed(1) + ' m');
    this._setText('active-hdg',   d.heading.toFixed(1)  + ' °');
    this._setText('active-hdop',  d.hdop.toFixed(2));
    this._setText('active-accel', d.accel.toFixed(3)    + ' g');
    this._setText('active-tilt',  `${d.pitch.toFixed(1)}° / ${d.roll.toFixed(1)}°`);

    const sb = document.getElementById('active-status');
    if (sb) { sb.className = `status-badge ${d.status}`; sb.textContent = d.status.toUpperCase(); }

    this._setHTML('m-speed', `${d.speed}<span class="unit">km/h</span>`);
    this._setHTML('m-dist',  `${d.totalDist.toFixed(2)}<span class="unit">km</span>`);

    const tripMin = Math.round((Date.now() - (state.tripStart[d.id] ?? Date.now())) / 60_000);
    this._setHTML('m-time', `${tripMin}<span class="unit">min</span>`);
    this._setText('m-sats', d.satellites);

    let gpsLabel = '📴 No GPS';
    if (d.gpsValid)       gpsLabel = '🛰️ GPS lock';
    else if (d.gpsCached) gpsLabel = '📍 Cached pos';
    this._setText('m-gps-mode', gpsLabel);

    const sc = document.getElementById('m-speed-ch');
    if (sc) {
      const over = d.speed > state.settings.speedThreshold;
      sc.textContent = over
        ? '⚠️ Overspeed'
        : (d.speed > 0 ? `✅ Normal · ${d.vehicleState}` : `Parked · ${d.vehicleState}`);
      sc.className = `m-change ${over ? 'down' : d.speed > 0 ? 'up' : 'neutral'}`;
    }

    Charts.updateMiniSpeed(d.id);

    document.getElementById('offline-banner')
      ?.classList.toggle('show', d.status === 'offline');
    document.getElementById('cached-banner')
      ?.classList.toggle('show', d.gpsCached && d.status !== 'offline');
  }

  // ─────────────────────────────────────────
  // ANALYTICS
  // ─────────────────────────────────────────

  _updateAnalyticsStats() {
    const devs      = Object.values(state.devices);
    const totalDist = devs.reduce((s, d) => s + (d.totalDist ?? 0), 0);
    const maxSpd    = Math.max(
      ...Object.values(state.maxSpeed).map(Number).filter(n => !isNaN(n)), 0
    );
    this._setText('stat-distance', totalDist.toFixed(2) + ' km');
    this._setText('stat-maxspeed', maxSpd.toFixed(1));
    this._setText('stat-alerts',   state.totalAlerts);

    const online = devs.filter(d => d.status === 'online').length;
    this._setText('stat-devices', online);
  }

  // ─────────────────────────────────────────
  // ALERTS PAGE
  // ─────────────────────────────────────────

  _renderAlertList() {
    const el = document.getElementById('alert-list');
    if (!el) return;

    const f    = state.alertFilter;
    const list = f === 'all' ? state.alerts : state.alerts.filter(a => a.type === f);

    if (!list.length) {
      el.innerHTML = `<div class="empty-state">
        <div class="icon">✅</div><p>No alerts for this filter.</p></div>`;
      return;
    }

    el.innerHTML = list.map(a => `
      <div class="alert-item">
        <div class="alert-icon ${a.type}">${ALERT_ICONS[a.type] ?? '⚠️'}</div>
        <div class="alert-body">
          <div class="alert-title">${a.message}</div>
          <div class="alert-meta">
            <span>📟 ${a.deviceName ?? a.deviceId}</span>
            <span>🕒 ${this._fmtTime(a.timestamp)}</span>
            ${a.lat ? `<span>📍 ${parseFloat(a.lat).toFixed(5)}, ${parseFloat(a.lng).toFixed(5)}</span>` : ''}
          </div>
        </div>
        <span class="alert-badge ${a.type}">${a.type}</span>
      </div>`).join('');
  }

  _bindAlertsEvents() {
    // Use event delegation since alerts page may re-render
    document.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      const section = btn.closest('.alerts-pg');
      if (!section) return;

      state.alertFilter = btn.dataset.filter ?? 'all';
      section.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this._renderAlertList();
    });
  }

  // ─────────────────────────────────────────
  // SETTINGS PAGE
  // ─────────────────────────────────────────

  renderGeofenceTable() {
    const tbody = document.getElementById('gf-table-body');
    if (!tbody) return;
    const ids = Object.keys(state.devices);
    if (!ids.length) return;

    tbody.innerHTML = ids.map(id => {
      const gf   = geofenceService.get(id);
      const name = state.devices[id]?.name ?? id;
      return `<tr>
        <td><span class="gf-badge">${name}</span></td>
        <td><input class="gf-input-sm" id="gf-lat-${id}" type="number"
              value="${gf.lat.toFixed(5)}" step="0.00001"/></td>
        <td><input class="gf-input-sm" id="gf-lng-${id}" type="number"
              value="${gf.lng.toFixed(5)}" step="0.00001"/></td>
        <td><input class="gf-input-sm" id="gf-rad-${id}" type="number"
              value="${gf.radius}" min="50" max="50000" style="width:80px"/></td>
        <td><div class="toggle ${gf.active ? 'on' : ''}" id="gf-act-${id}"></div></td>
      </tr>`;
    }).join('');

    // Toggle clicks on geofence active toggles
    tbody.querySelectorAll('.toggle').forEach(t => {
      t.addEventListener('click', () => t.classList.toggle('on'));
    });
  }

  _populateSettingsForm() {
    const s = state.settings;
    this._setVal('s-offline-t',  s.offlineTimeout);
    this._setVal('s-speed-t',    s.speedThreshold);
    this._setVal('s-gf-cooldown', s.gfCooldown);
    this._setVal('s-offline-buf', s.offlineBuffer);

    this._setToggle('s-offline-toggle', s.offlineEnabled);
    this._setToggle('s-autosync-toggle', s.autoSync);
    this._setToggle('s-trail-toggle', s.showTrail);
    this._setToggle('s-theme-toggle',
      document.documentElement.getAttribute('data-theme') === 'dark');
  }

  _bindSettingsEvents() {
    document.addEventListener('click', e => {
      // Save settings
      if (e.target.id === 'btn-save-settings') this._saveSettings();
      // Save geofences
      if (e.target.id === 'btn-save-geofences') {
        geofenceService.saveFromForm();
        showToast('success', '✅ Geofences saved!');
      }
      // Theme toggle in settings
      if (e.target.id === 's-theme-toggle') {
        this.toggleTheme();
        e.target.classList.toggle('on');
      }
      // Trail toggle
      if (e.target.id === 's-trail-toggle') {
        e.target.classList.toggle('on');
        state.settings.showTrail = e.target.classList.contains('on');
        if (!state.settings.showTrail) MapView.clearTrails();
      }
    });
  }

  _saveSettings() {
    const s = state.settings;
    s.offlineTimeout  = parseInt(this._getVal('s-offline-t'),   10) || 30;
    s.speedThreshold  = parseInt(this._getVal('s-speed-t'),     10) || 120;
    s.gfCooldown      = parseInt(this._getVal('s-gf-cooldown'), 10) || 60;
    s.offlineBuffer   = parseInt(this._getVal('s-offline-buf'), 10) || 200;
    s.offlineEnabled  = document.getElementById('s-offline-toggle')?.classList.contains('on') ?? true;
    s.autoSync        = document.getElementById('s-autosync-toggle')?.classList.contains('on') ?? true;
    showToast('success', '✅ Settings saved!');
  }

  // ─────────────────────────────────────────
  // DASHBOARD EVENTS
  // ─────────────────────────────────────────

  _bindDashboardEvents() {
    // Route destination search
    const destInput = () => document.getElementById('dest-input');
    const destSugg  = () => document.getElementById('dest-suggestions');

    const doSearch = debounce(async (q) => {
      const box = destSugg();
      if (!box) return;
      if (q.length < 3) { box.classList.remove('visible'); return; }

      box.innerHTML = `<div style="padding:10px 12px;font-size:12px;color:var(--t3);
        display:flex;align-items:center;gap:8px"><span class="spinner"></span> Searching…</div>`;
      box.classList.add('visible');

      const places = await searchPlaces(q, 5);
      if (!places.length) {
        box.innerHTML = `<div class="dest-sug-item" style="cursor:default;color:var(--t3)">No results found</div>`;
        return;
      }

      box.innerHTML = places.map(p => `
        <div class="dest-sug-item"
          data-lat="${p.lat}" data-lng="${p.lng}"
          data-name="${p.primaryName.replace(/"/g, '&quot;')}">
          <b>${p.primaryName}</b><br>
          <small>${p.secondaryName}</small>
        </div>`).join('');

      box.querySelectorAll('.dest-sug-item').forEach(item => {
        item.addEventListener('click', () => {
          state.navRoute.destLat  = parseFloat(item.dataset.lat);
          state.navRoute.destLng  = parseFloat(item.dataset.lng);
          state.navRoute.destName = item.dataset.name;
          destInput().value = item.dataset.name;
          box.classList.remove('visible');
        });
      });
    }, 350);

    document.addEventListener('input', e => {
      if (e.target.id === 'dest-input') doSearch(e.target.value.trim());
    });
    document.addEventListener('keydown', e => {
      if (e.target.id === 'dest-input' && e.key === 'Escape') {
        destSugg()?.classList.remove('visible');
      }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.dest-search-wrap')) {
        destSugg()?.classList.remove('visible');
      }
      if (e.target.id === 'btn-get-route') this.startRoute();
      if (e.target.id === 'btn-clear-route-panel') this.clearRoute();
    });

    // Playback
    document.addEventListener('click', e => {
      if (e.target.id === 'pb-play')   this._playback.toggle();
      if (e.target.id === 'pb-rewind') this._playback.rewind();
    });
    document.addEventListener('change', e => {
      if (e.target.id === 'pb-speed-sel') this._playback.onSpeedChange();
    });
    document.addEventListener('input', e => {
      if (e.target.id === 'pb-slider') this._playback.seek(e.target.value);
    });
  }

  // ─────────────────────────────────────────
  // ROUTE TO DESTINATION
  // ─────────────────────────────────────────

  async startRoute() {
    if (!state.selectedId)       { showToast('warning', '⚠️ Select a device first'); return; }
    if (!state.navRoute.destLat) { showToast('warning', '⚠️ Enter and select a destination first'); return; }

    const dev = state.devices[state.selectedId];
    if (!dev)                    { showToast('warning', '⚠️ Device not found'); return; }
    if (dev.lat === 0 || dev.lng === 0) {
      showToast('warning', '⚠️ Device has no GPS position yet');
      return;
    }

    showToast('info', '🗺️ Fetching route…');
    routeService.clearLayers();

    const nr     = state.navRoute;
    const result = await routeService.fetchRoute(dev.lat, dev.lng, nr.destLat, nr.destLng);

    if (!result) {
      showToast('danger', '❌ Could not fetch route. Check internet connection.');
      return;
    }

    nr.fullCoords = result.coords;
    nr.totalDist  = parseFloat(result.distKm);

    MapView.renderRoute(
      result.coords, dev.lat, dev.lng,
      nr.destLat, nr.destLng,
      result.distKm, result.etaMin, nr.destName
    );

    this._setText('route-dist-val', result.distKm);
    this._setText('route-eta-val',  result.etaMin);
    document.getElementById('route-meta')?.style.setProperty('display', 'flex');
    document.getElementById('route-progress-badge')?.style.setProperty('display', 'inline');
    document.getElementById('btn-clear-route-panel')?.style.setProperty('display', 'flex');

    showToast('success', `✅ Route: ${result.distKm} km · ~${result.etaMin} min`);
  }

  clearRoute() {
    routeService.clearLayers();
    const nr        = state.navRoute;
    nr.destLat      = null;
    nr.destLng      = null;
    nr.fullCoords   = [];
    nr.destName     = '';

    const destInput = document.getElementById('dest-input');
    if (destInput) destInput.value = '';

    document.getElementById('route-meta')?.style.setProperty('display', 'none');
    document.getElementById('btn-clear-route-panel')?.style.setProperty('display', 'none');
    MapView.hideClearRouteBtn();
  }

  // ─────────────────────────────────────────
  // ANALYTICS BINDINGS
  // ─────────────────────────────────────────

  _bindAnalyticsEvents() {
    // Nothing needed — charts auto-refresh via setInterval and page switch
  }

  // ─────────────────────────────────────────
  // THEME
  // ─────────────────────────────────────────

  toggleTheme() {
    const html = document.documentElement;
    html.setAttribute(
      'data-theme',
      html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    );
  }

  // ─────────────────────────────────────────
  // PUBLIC API (used by MapView popups)
  // ─────────────────────────────────────────

  startGeofenceDraw(id) {
    MapView.toggleGeofenceDraw(id);
  }

  // ─────────────────────────────────────────
  // SMALL DOM HELPERS
  // ─────────────────────────────────────────

  _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  _setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }
  _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
  _getVal(id) {
    return document.getElementById(id)?.value ?? '';
  }
  _setToggle(id, on) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('on', on);
  }
  _fmtTime(ts) {
    if (!ts) return '--';
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
  }
}

export const app = new App();
