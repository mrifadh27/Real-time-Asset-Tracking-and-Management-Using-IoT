/**
 * src/main.js
 * VECTOR — Application entry point.
 *
 * Responsibilities:
 *  1. Import all CSS (Vite bundles it)
 *  2. Build DOM shell from page templates
 *  3. Initialise every module in dependency order
 *  4. Wire Firebase listeners
 *  5. Bind all UI events (navigation, buttons, form inputs)
 *  6. Coordinate cross-module communication via the event bus
 */

import './styles/styles.css';

/* ── Page templates ── */
import {
  appShellHTML,
  dashboardHTML,
  analyticsHTML,
  alertsHTML,
  settingsHTML,
} from './ui/pages.js';

/* ── Config / DB ── */
import { db, subscribe } from './config/firebase.js';

/* ── State ── */
import { S } from './utils/state.js';
import { on, emit, EV } from './utils/events.js';

/* ── Modules ── */
import { initMap, renderMarkers, panToDevice, clearTrails, fitAllDevices } from './modules/map.js';
import { setMap as geofenceSetMap, drawAllGeofences, toggleDrawMode,
         saveGeofencesFromForm, renderGeofenceTable, updateGeofenceInfoBox } from './modules/geofence.js';
import { processDevice, syncOfflineQueue, updateOfflineUI, offlineQueueTotal } from './modules/devices.js';
import { initCharts, updateAnalytics, updateActivityChart } from './modules/analytics.js';
import { loadRoute, toggle as pbToggle, rewind as pbRewind,
         seek as pbSeek, onSpeedChange as pbSpeedChange, clearPlayback as pbClear } from './modules/playback.js';
import { startRoute, clearRoute, onDestInput, onDestKey, updateProgress } from './modules/route.js';
import {
  fireAlert,
  processAlertsSnapshot,
  mergeAndRender as mergeAlerts,
  renderAlertList,
  updateFilterBadges,
  updateAlertBadge,
  clearAllAlerts,
  markAllRead,
  refreshTimestamps,
} from './modules/alerts.js';

/* ── UI ── */
import { updateDeviceList, setSyncTime, setActivePage } from './ui/sidebar.js';
import { setConnectionStatus, setPageTitle, updateOfflinePill } from './ui/topbar.js';
import { updatePanel } from './ui/panel.js';
import { loadSettings, saveSettings, applySettingsToUI, toggleTheme, applyTrailToggle } from './ui/settings.js';

/* ══════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  _buildLayout();
  _initModules();
  _bindEvents();
  _startFirebase();
  _startTimers();

  /* Remove loading screen */
  document.getElementById('loading-screen')?.remove();
});

/* ══════════════════════════════════════════════════════════
   1. BUILD DOM
══════════════════════════════════════════════════════════ */
function _buildLayout() {
  const app = document.getElementById('app');
  app.innerHTML = appShellHTML();

  document.getElementById('page-dashboard').innerHTML = dashboardHTML();
  document.getElementById('page-analytics').innerHTML = analyticsHTML();
  document.getElementById('page-alerts').innerHTML    = alertsHTML();
  document.getElementById('page-settings').innerHTML  = settingsHTML();
}

/* ══════════════════════════════════════════════════════════
   2. INIT MODULES (dependency order)
══════════════════════════════════════════════════════════ */
function _initModules() {
  const leafletMap = initMap();
  geofenceSetMap(leafletMap);
  initCharts();
  applySettingsToUI();
}

/* ══════════════════════════════════════════════════════════
   3. BIND UI EVENTS
══════════════════════════════════════════════════════════ */
function _bindEvents() {
  /* ── Navigation ── */
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => _showPage(item.dataset.page));
  });

  /* ── Theme button (topbar) ── */
  document.getElementById('btn-theme')
    ?.addEventListener('click', () => toggleTheme());

  /* ── Settings toggles (delegated) ── */
  document.addEventListener('click', e => {
    const t = e.target;

    if (t.id === 's-theme-toggle') {
      t.classList.toggle('on');
      document.documentElement.setAttribute(
        'data-theme',
        t.classList.contains('on') ? 'dark' : 'light'
      );
    }
    if (t.id === 's-trail-toggle') {
      t.classList.toggle('on');
      applyTrailToggle(t.classList.contains('on'));
    }
    if (t.id === 's-offline-toggle' || t.id === 's-autosync-toggle') {
      t.classList.toggle('on');
    }

    if (t.id === 'btn-save-settings')   saveSettings();
    if (t.id === 'btn-save-geofences')  saveGeofencesFromForm();
  });

  /* ── Route panel ── */
  document.getElementById('btn-get-route')
    ?.addEventListener('click', startRoute);
  document.getElementById('clear-route-btn')
    ?.addEventListener('click', clearRoute);
  document.addEventListener('vector:clearRoute', clearRoute);

  document.getElementById('dest-input')
    ?.addEventListener('input',  e => onDestInput(e.target.value));
  document.getElementById('dest-input')
    ?.addEventListener('keydown', onDestKey);

  document.addEventListener('click', e => {
    if (!e.target.closest('.dest-search-wrap'))
      document.getElementById('dest-suggestions')?.classList.remove('visible');
  });

  /* ── Playback controls ── */
  document.getElementById('pb-play-btn')
    ?.addEventListener('click', pbToggle);
  document.getElementById('pb-rewind')
    ?.addEventListener('click', pbRewind);
  document.getElementById('pb-slider')
    ?.addEventListener('input',  e => pbSeek(e.target.value));
  document.getElementById('pb-speed-sel')
    ?.addEventListener('change', pbSpeedChange);
  document.getElementById('pb-clear-btn')
    ?.addEventListener('click', pbClear);

  /* ── Alert filters ── */
  document.getElementById('alert-filters')
    ?.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.alertFilter = btn.dataset.filter;
      renderAlertList();
    });

  /* ── Alert action buttons ── */
  // ✅ NEW: Mark all read — zeroes the unread badge without removing alerts
  document.getElementById('btn-mark-read')
    ?.addEventListener('click', () => {
      markAllRead();
      updateAlertBadge();
    });

  // ✅ NEW: Clear all alerts — wipes local + firebase stores + display list
  document.getElementById('btn-clear-alerts')
    ?.addEventListener('click', () => {
      clearAllAlerts();
      updateAlertBadge();
      updateFilterBadges();
      renderAlertList();
    });

  /* ── Cross-module custom events ── */
  document.addEventListener('vector:selectDevice', e => {
    _selectDevice(e.detail.id);
  });

  document.addEventListener('vector:startGeofenceDraw', e => {
    toggleDrawMode(e.detail.id);
  });

  /* ── Event bus subscriptions ── */
  on(EV.ALERT_FIRED, () => {
    updateAlertBadge();
    updateFilterBadges();
    if (document.getElementById('page-alerts')?.classList.contains('active')) {
      renderAlertList();
    }
  });

  on(EV.DEVICES_UPDATED, () => {
    updateDeviceList();
    renderMarkers();
    drawAllGeofences();
    _updateAnalyticsIfVisible();
    _updateOfflineCounters();
    if (S.selectedId) {
      updatePanel();
      const dev = S.devices[S.selectedId];
      if (dev && S.navRoute.destLat) updateProgress(dev.lat, dev.lng);
    }
  });

  on(EV.CONNECTION_CHANGE, ({ online }) => {
    setConnectionStatus(online);
  });

  on(EV.SETTINGS_SAVED, () => {
    if (document.getElementById('page-settings')?.classList.contains('active')) {
      renderGeofenceTable();
    }
  });
}

/* ══════════════════════════════════════════════════════════
   4. FIREBASE LISTENERS
══════════════════════════════════════════════════════════ */
function _startFirebase() {
  /* Assets */
  subscribe('/assets', snap => {
    const data = snap.val() || {};
    const now  = Date.now();
    Object.entries(data).forEach(([id, raw]) => processDevice(id, raw, now));
    setSyncTime();
    emit(EV.DEVICES_UPDATED);
    emit(EV.CONNECTION_CHANGE, { online: true });
  }, err => {
    console.error('[FB] assets error:', err);
    emit(EV.CONNECTION_CHANGE, { online: false });
  });

  /* Alerts */
  subscribe('/alerts', snap => {
    processAlertsSnapshot(snap);
    updateFilterBadges();
    if (document.getElementById('page-alerts')?.classList.contains('active')) {
      renderAlertList();
    }
  }, err => {
    console.warn('[FB] alerts read failed — using local only:', err.code);
    mergeAlerts();
  });

  /* Connection state */
  db.ref('.info/connected').on('value', snap => {
    const online = snap.val() === true;
    emit(EV.CONNECTION_CHANGE, { online });

    if (online && S.isOffline) {
      S.isOffline = false;
      syncOfflineQueue();
    } else if (!online) {
      S.isOffline = true;
    }
  });
}

/* ══════════════════════════════════════════════════════════
   5. PERIODIC TIMERS
══════════════════════════════════════════════════════════ */
function _startTimers() {
  /* Activity chart refresh every 30 s */
  setInterval(updateActivityChart, 30_000);

  /* Analytics stats refresh every 5 s when analytics page is visible */
  setInterval(() => {
    if (document.getElementById('page-analytics')?.classList.contains('active')) {
      updateAnalytics();
      updateActivityChart();
    }
  }, 5_000);

  /* Live playback route update (for selected device) */
  setInterval(() => {
    if (S.selectedId && !S.playback.playing) {
      const pts = window._nextrackRouteRef?.[S.selectedId];
      /* Route ref is managed in devices module via mapLayers.routePts */
    }
  }, 2_000);

  // ✅ NEW: Refresh relative timestamps ("X min ago") every 60 s
  // without triggering a full alert list re-render
  setInterval(refreshTimestamps, 60_000);
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */

/** Select a device: update state, panel, map, playback. */
function _selectDevice(id) {
  S.selectedId = id;
  updateDeviceList();
  updatePanel();
  panToDevice(id);
  loadRoute(id);

  const d = S.devices[id];
  document.getElementById('offline-banner')
    ?.classList.toggle('show', d?.status === 'offline');
  document.getElementById('cached-banner')
    ?.classList.toggle('show', d?.gpsCached === true && d?.status !== 'offline');

  drawAllGeofences();
  if (S.geofences[id]?.isSet) updateGeofenceInfoBox(id);
  emit(EV.DEVICE_SELECTED, { id });
}

/** Show a page and update all related UI. */
function _showPage(page) {
  document.querySelectorAll('.page').forEach(s => s.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  setActivePage(page);
  setPageTitle(page);

  if (page === 'analytics') {
    updateAnalytics();
    updateActivityChart();
  }
  if (page === 'alerts') {
    S.alertUnread = 0;
    updateAlertBadge();
    updateFilterBadges();
    renderAlertList();
  }
  if (page === 'settings') {
    renderGeofenceTable();
    applySettingsToUI();
    _updateOfflineCounters();
  }
}

function _updateAnalyticsIfVisible() {
  if (document.getElementById('page-analytics')?.classList.contains('active')) {
    updateAnalytics();
  }
}

function _updateOfflineCounters() {
  const total = offlineQueueTotal();
  updateOfflinePill(total);
  const qc = document.getElementById('offline-queue-count');
  if (qc) qc.textContent = `${total} records`;
}
