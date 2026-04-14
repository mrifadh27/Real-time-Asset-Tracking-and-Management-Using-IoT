/**
 * VECTOR — Application Entry Point  (src/main.js)
 *
 * FIXES IN THIS VERSION:
 *  ✅ EV.ALERT_FIRED handler wired — alert list updates INSTANTLY on local alert,
 *     not waiting for Firebase round-trip (was completely missing before)
 *  ✅ clearAllAlerts() and markAllRead() update badge immediately via EV.ALERT_FIRED
 *  ✅ SECURITY: #app stays hidden until Firebase confirms authentication
 *  ✅ SECURITY: Full cleanup on signOut before showing login page
 *  ✅ AbortController per session — no document listener accumulation
 *  ✅ resetEventBus() on logout — no EV.* handler accumulation
 *  ✅ destroyCharts() on logout — no "Canvas is already in use" error
 *  ✅ clearPlayback() on logout — no dangling map markers
 *  ✅ resetGeofenceState() on logout — exits draw mode cleanly
 *  ✅ Lazy chart init on first analytics page visit
 *  ✅ Route progress updateProgress() called on DEVICES_UPDATED
 *  ✅ btn-get-route calls startRoute() correctly
 *  ✅ Panel selectedId cleared if device disappears
 *  ✅ vector:startGeofenceDraw custom event wired to startDrawMode()
 *  ✅ Theme toggle deduped per session
 */

import './config/firebase.js';

import {
  initAuthPersistence, watchAuthState,
  initLoginUI, showLoginPage, showDashboard, signOut,
} from './auth/auth.js';

import {
  initTopbar, setConnectionStatus, setPageTitle, updateOfflinePill,
} from './ui/topbar.js';

import {
  updateDeviceList, setSyncTime, setActivePage,
  initAdminProfile, updateConnectionStatus,
} from './ui/sidebar.js';

import { updatePanel }     from './ui/panel.js';
import {
  appShellHTML, dashboardHTML, analyticsHTML, alertsHTML, settingsHTML,
} from './ui/pages.js';
import {
  loadSettings, saveSettings, applySettingsToUI, toggleTheme, applyTrailToggle,
} from './ui/settings.js';

import { initMap, renderMarkers, fitAllDevices, panToDevice, getMap } from './modules/map.js';
import {
  processDevice, updateOfflineUI, offlineQueueTotal, syncOfflineQueue,
} from './modules/devices.js';
import {
  initCharts, updateAnalytics, updateActivityChart, destroyCharts,
} from './modules/analytics.js';
import {
  processAlertsSnapshot, mergeAndRender, clearAllAlerts, markAllRead,
  renderAlertList, updateFilterBadges, updateAlertBadge, refreshTimestamps,
} from './modules/alerts.js';
import {
  setMap as setGeofenceMap, drawAllGeofences, toggleDrawMode,
  startDrawMode, saveGeofencesFromForm, renderGeofenceTable, resetGeofenceState,
} from './modules/geofence.js';
import {
  loadRoute, toggle as pbToggle, rewind as pbRewind,
  seek as pbSeek, onSpeedChange, clearPlayback,
} from './modules/playback.js';
import {
  onDestInput, onDestKey, clearRoute, startRoute, updateProgress,
} from './modules/route.js';
import {
  initNotifications, unlockAudio, resetNotifications,
} from './modules/notifications.js';

import { on, emit, EV, resetEventBus }  from './utils/events.js';
import { showToast }                     from './utils/toast.js';
import { S }                             from './utils/state.js';
import { resetState, resetMapLayers }    from './utils/state.js';
import { db }                            from './config/firebase.js';

// ─────────────────────────────────────────────────────────────────────────────
// SESSION STATE
// ─────────────────────────────────────────────────────────────────────────────
let _dashboardInitialised = false;
let _sessionController    = null;
let _themeHandler         = null;
let _tsRefreshInterval    = null;
let _chartsInitialised    = false;

// ─────────────────────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────────────────────
async function boot() {
  try { await initAuthPersistence(); } catch (e) {
    console.warn('[VECTOR] Persistence failed:', e.message);
  }

  initLoginUI((user) => _onAuthenticated(user));

  const currentUser = await watchAuthState(_onAuthenticated, _onSignedOut);
  if (currentUser) _onAuthenticated(currentUser);
  else showLoginPage();
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED
// ─────────────────────────────────────────────────────────────────────────────
function _onAuthenticated(user) {
  if (_dashboardInitialised) return;
  _dashboardInitialised = true;
  console.info(`[VECTOR] ✅ Authenticated: ${user.email}`);

  showDashboard();
  _initDashboard();
  initAdminProfile(user);

  // Unlock Web Audio on first click (browser requirement)
  document.addEventListener('click', unlockAudio, { once: true });

  // Request browser notification permission
  initNotifications().catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNED OUT — full cleanup in correct order
// ─────────────────────────────────────────────────────────────────────────────
function _onSignedOut() {
  _dashboardInitialised = false;

  // 1. Detach Firebase listeners
  try { db.ref('/assets').off(); db.ref('/alerts').off(); db.ref('.info/connected').off(); } catch (_) {}

  // 2. Abort all session document listeners (AbortController signal)
  if (_sessionController) { _sessionController.abort(); _sessionController = null; }

  // 3. Remove theme handler
  if (_themeHandler) { document.removeEventListener('vector:toggleTheme', _themeHandler); _themeHandler = null; }

  // 4. Clear timestamp refresh interval
  if (_tsRefreshInterval) { clearInterval(_tsRefreshInterval); _tsRefreshInterval = null; }

  // 5. Stop all device offline timers
  Object.values(S.offlineTimers).forEach(t => { try { clearTimeout(t); } catch (_) {} });

  // 6. Clear playback (removes marker from map)
  try { clearPlayback(); } catch (_) {}

  // 7. Destroy Chart.js instances
  try { destroyCharts(); } catch (_) {}
  _chartsInitialised = false;

  // 8. Exit geofence draw mode (removes map click handler)
  try { resetGeofenceState(); } catch (_) {}

  // 9. Reset all state
  resetState();
  resetMapLayers();
  resetNotifications();

  // 10. Reset event bus (all on() handlers from this session removed)
  resetEventBus();

  // 11. Show login
  showLoginPage();
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD INIT
// ─────────────────────────────────────────────────────────────────────────────
function _initDashboard() {

  // Load settings + theme BEFORE HTML render
  loadSettings();

  // Inject all page HTML
  document.getElementById('app').innerHTML = appShellHTML();
  const _inj = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  _inj('page-dashboard', dashboardHTML());
  _inj('page-analytics',  analyticsHTML());
  _inj('page-alerts',     alertsHTML());
  _inj('page-settings',   settingsHTML());

  // AbortController for this session's document listeners
  _sessionController = new AbortController();
  const { signal } = _sessionController;

  // Topbar
  initTopbar({ onLogout: _handleLogout });

  // Theme toggle
  if (_themeHandler) document.removeEventListener('vector:toggleTheme', _themeHandler);
  _themeHandler = () => toggleTheme();
  document.addEventListener('vector:toggleTheme', _themeHandler);

  // Settings
  applySettingsToUI();
  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    saveSettings();
    applySettingsToUI();
    renderGeofenceTable();
    showToast('success', '✅ Settings saved!');
    emit(EV.SETTINGS_SAVED);
  });
  document.getElementById('s-trail-toggle')?.addEventListener('click', function () {
    applyTrailToggle(this.classList.toggle('on'));
  });
  document.getElementById('s-theme-toggle')?.addEventListener('click', () => toggleTheme());

  // Navigation
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      _showPage(page);
      setActivePage(page);
      setPageTitle(page);
      emit(EV.PAGE_CHANGED, { page });

      // Reset unread badge when alerts page opens
      if (page === 'alerts') {
        S.alertUnread = 0;
        updateAlertBadge();
        renderAlertList();
        updateFilterBadges();
      }
    });
  });

  // Map + geofence
  initMap();
  const leafletMap = getMap();
  if (leafletMap) { setGeofenceMap(leafletMap); drawAllGeofences(); }

  document.getElementById('btn-fit-all')?.addEventListener('click', fitAllDevices);
  document.getElementById('geofence-btn')?.addEventListener('click', () => {
    if (S.selectedId) toggleDrawMode(S.selectedId);
    else showToast('warning', '⚠️ Select a device first');
  });
  document.getElementById('panel-geofence-btn')?.addEventListener('click', () => {
    if (S.selectedId) startDrawMode(S.selectedId);
    else showToast('warning', '⚠️ Select a device on the map or sidebar first');
  });

  // Geofences table
  renderGeofenceTable();
  document.getElementById('btn-save-geofences')?.addEventListener('click', () => saveGeofencesFromForm());

  // Alert controls
  document.getElementById('btn-clear-alerts')?.addEventListener('click', () => {
    clearAllAlerts();
    renderAlertList();
    updateAlertBadge();
    updateFilterBadges();
  });
  document.getElementById('btn-mark-read')?.addEventListener('click', () => {
    markAllRead();
    renderAlertList();
    updateAlertBadge();
  });
  document.getElementById('alert-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    S.alertFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAlertList();
  });

  // Route controls
  const destInput = document.getElementById('dest-input');
  if (destInput) {
    destInput.addEventListener('input',   e => onDestInput(e.target.value));
    destInput.addEventListener('keydown', onDestKey);
  }
  document.getElementById('btn-get-route')?.addEventListener('click', () => {
    if (S.navRoute.destLat != null) startRoute();
    else {
      const val = document.getElementById('dest-input')?.value ?? '';
      if (val.trim().length >= 2) onDestInput(val);
      else showToast('warning', '⚠️ Type a destination first');
    }
  });
  document.getElementById('clear-route-btn')?.addEventListener('click', clearRoute);
  document.getElementById('btn-clear-route')?.addEventListener('click', clearRoute);

  // Playback
  document.getElementById('pb-play-btn')?.addEventListener('click',   pbToggle);
  document.getElementById('pb-rewind')?.addEventListener('click',     pbRewind);
  document.getElementById('pb-slider')?.addEventListener('input',     e => pbSeek(+e.target.value));
  document.getElementById('pb-speed-sel')?.addEventListener('change', onSpeedChange);
  document.getElementById('pb-clear-btn')?.addEventListener('click',  clearPlayback);

  // ── Document-level custom events (AbortController — auto-removed on logout) ──

  document.addEventListener('vector:selectDevice', (e) => {
    if (e.detail?.id) emit(EV.DEVICE_SELECTED, { id: e.detail.id });
  }, { signal });

  document.addEventListener('vector:startGeofenceDraw', (e) => {
    const id = e.detail?.id || S.selectedId;
    if (!id) { showToast('warning', '⚠️ Select a device first'); return; }
    emit(EV.DEVICE_SELECTED, { id });
    setTimeout(() => startDrawMode(id), 100);
  }, { signal });

  document.addEventListener('vector:clearRoute', clearRoute, { signal });

  // ── Event Bus ──────────────────────────────────────────────────────────────

  on(EV.DEVICES_UPDATED, () => {
    // Clear selectedId if device disappeared
    if (S.selectedId && !S.devices[S.selectedId]) S.selectedId = null;

    updateDeviceList();
    setSyncTime();
    if (S.selectedId && S.devices[S.selectedId]) updatePanel();
    renderMarkers();
    updateAlertBadge();
    updateOfflinePill(offlineQueueTotal());
    updateOfflineUI();

    // Route progress
    if (S.selectedId && S.devices[S.selectedId] && S.navRoute.fullCoords.length > 0) {
      const d = S.devices[S.selectedId];
      try { updateProgress(d.lat, d.lng); } catch(_) {}
    }

    if (_chartsInitialised) { updateAnalytics(); updateActivityChart(); }
  });

  on(EV.DEVICE_SELECTED, ({ id }) => {
    if (!id) return;
    S.selectedId = id;
    _showPage('dashboard');
    setActivePage('dashboard');
    setPageTitle('dashboard');
    if (S.devices[id]) { updatePanel(); panToDevice(id); loadRoute(id); }
  });

  on(EV.CONNECTION_CHANGE, ({ online }) => {
    setConnectionStatus(online);
    updateConnectionStatus(online);
    if (online && offlineQueueTotal() > 0 && S.settings.autoSync) {
      syncOfflineQueue().catch(err => console.warn('[VECTOR] Sync failed:', err));
    }
  });

  on(EV.PAGE_CHANGED, ({ page }) => {
    if (page === 'analytics' && !_chartsInitialised) {
      initCharts();
      _chartsInitialised = true;
      updateAnalytics();
      updateActivityChart();
    } else if (page === 'analytics') {
      updateAnalytics();
      updateActivityChart();
    }
  });

  // ✅ KEY FIX — handle EV.ALERT_FIRED to update alert list immediately
  // This fires from fireAlert() in alerts.js BEFORE Firebase round-trip
  on(EV.ALERT_FIRED, () => {
    // Always refresh these — they are cheap DOM updates
    updateAlertBadge();
    updateFilterBadges();

    // Only re-render list if alerts page is currently open
    const alertsOpen = document.getElementById('page-alerts')?.classList.contains('active');
    if (alertsOpen) renderAlertList();
  });

  // Timestamp refresh
  if (_tsRefreshInterval) clearInterval(_tsRefreshInterval);
  _tsRefreshInterval = setInterval(refreshTimestamps, 60_000);

  // Start Firebase listeners
  _startFirebaseListeners();
}

// ─────────────────────────────────────────────────────────────────────────────
function _showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
}

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE LISTENERS
// ─────────────────────────────────────────────────────────────────────────────
function _startFirebaseListeners() {

  db.ref('.info/connected').on('value', snap => {
    const online = snap.val() === true;
    S.isOffline  = !online;
    emit(EV.CONNECTION_CHANGE, { online });
  });

  db.ref('/assets').on('value', snapshot => {
    if (!snapshot?.exists()) return;
    const now = Date.now();
    snapshot.forEach(child => {
      const raw = child.val();
      if (raw && typeof raw === 'object') {
        try { processDevice(child.key, raw, now); } catch (err) {
          console.warn(`[VECTOR] processDevice(${child.key}):`, err);
        }
      }
    });
    emit(EV.DEVICES_UPDATED);
    setSyncTime();
  }, err => {
    console.error('[VECTOR] /assets error:', err.code, err.message);
    showToast('error', 'Database error — check Firebase rules');
  });

  db.ref('/alerts').on('value', snap => {
    try {
      processAlertsSnapshot(snap);
      // Firebase snapshot fires after local fireAlert() already updated the list —
      // mergeAndRender() deduplicates so no double entries appear.
      const alertsOpen = document.getElementById('page-alerts')?.classList.contains('active');
      if (alertsOpen) {
        renderAlertList();
        // Don't increment badge — user is reading the page
      } else {
        updateAlertBadge();
      }
      updateFilterBadges();
    } catch (err) {
      console.warn('[VECTOR] Alert processing error:', err);
    }
  }, err => {
    console.warn('[VECTOR] /alerts error:', err.message);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
async function _handleLogout() {
  try { await signOut(); } catch (err) {
    console.error('[VECTOR] Logout failed:', err);
    showToast('error', 'Logout failed — try again');
  }
}

boot().catch(err => console.error('[VECTOR] Boot error:', err));
