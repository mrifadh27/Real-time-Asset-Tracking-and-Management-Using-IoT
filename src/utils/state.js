/**
 * src/utils/state.js
 * Central application state.
 *
 * FIXES:
 *  ✅ resetState() — full session reset on logout (keeps settings)
 *  ✅ resetMapLayers() — clears stale Leaflet refs
 *  ✅ Added notifications + notificationSound to settings
 */

export const S = {
  /* ── Devices ── */
  devices:    {},
  selectedId: null,
  history:    {},

  /* ── Per-device transition state ── */
  prevStatus:           {},
  offlineAlertSent:     {},
  onlineAlertSent:      {},
  lastStatusTransition: {},
  geofenceExitTracker:  {},
  overspeedTracker:     {},
  crashTracker:         {},
  knownDevices:         new Set(),

  /* ── Alerts ── */
  localAlerts:    [],
  firebaseAlerts: [],
  alerts:         [],
  alertFilter:    'all',
  alertUnread:    0,
  totalAlerts:    0,

  /* ── Geofences ── */
  geofences: {},

  /* ── Settings (persisted to localStorage) ── */
  settings: {
    offlineTimeout:    90,
    speedThreshold:    120,
    crashThreshold:    2.0,
    gfCooldown:        60,
    showTrail:         true,
    offlineEnabled:    true,
    autoSync:          true,
    offlineBuffer:     200,
    notifications:     true,   // browser push notifications
    notificationSound: true,   // audio beeps
  },

  /* ── Playback ── */
  playback: {
    playing: false, index: 0, route: [],
    marker: null, polyline: null, timer: null,
  },

  /* ── Navigation / OSRM ── */
  navRoute: {
    destLat: null, destLng: null, destName: '',
    line: null, lineFull: null, destMarker: null,
    fullCoords: [], totalDist: 0,
  },

  /* ── Offline ── */
  offlineQueue:  {},
  offlineTimers: {},
  isOffline:     false,

  /* ── Session analytics ── */
  tripStart:       {},
  maxSpeed:        {},
  firstDeviceSeen: false,
};

export const mapLayers = {
  markers:  {},
  trails:   {},
  routePts: {},
};

/* ─────────────────────────────────────────────────────────
   RESET STATE — call on logout AFTER stopping all timers.
───────────────────────────────────────────────────────── */
export function resetState() {
  S.devices    = {};
  S.selectedId = null;
  S.history    = {};

  S.prevStatus           = {};
  S.offlineAlertSent     = {};
  S.onlineAlertSent      = {};
  S.lastStatusTransition = {};
  S.geofenceExitTracker  = {};
  S.overspeedTracker     = {};
  S.crashTracker         = {};
  S.knownDevices         = new Set();

  S.localAlerts    = [];
  S.firebaseAlerts = [];
  S.alerts         = [];
  S.alertFilter    = 'all';
  S.alertUnread    = 0;
  S.totalAlerts    = 0;

  S.geofences = {};

  S.playback.playing  = false;
  S.playback.index    = 0;
  S.playback.route    = [];
  S.playback.marker   = null;
  S.playback.polyline = null;
  S.playback.timer    = null;

  S.navRoute.destLat    = null;
  S.navRoute.destLng    = null;
  S.navRoute.destName   = '';
  S.navRoute.line       = null;
  S.navRoute.lineFull   = null;
  S.navRoute.destMarker = null;
  S.navRoute.fullCoords = [];
  S.navRoute.totalDist  = 0;

  S.offlineQueue  = {};
  S.offlineTimers = {};
  S.isOffline     = false;

  S.tripStart       = {};
  S.maxSpeed        = {};
  S.firstDeviceSeen = false;
}

/* ─────────────────────────────────────────────────────────
   RESET MAP LAYERS
───────────────────────────────────────────────────────── */
export function resetMapLayers() {
  mapLayers.markers  = {};
  mapLayers.trails   = {};
  mapLayers.routePts = {};
}
