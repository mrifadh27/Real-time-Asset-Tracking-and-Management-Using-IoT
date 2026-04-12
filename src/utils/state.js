/**
 * src/utils/state.js
 * Central application state — imported by all modules.
 * No imports here to avoid circular dependencies.
 */

export const S = {
  /* ── Devices ── */
  devices:    {},    // { [id]: Device }
  selectedId: null,
  history:    {},    // { [id]: Array<{speed, accel, ts}> }

  /* ── Per-device previous states (change detection) ── */
  prevStatus:           {},  // { [id]: 'online'|'offline' } — undefined = never seen
  offlineAlertSent:     {},  // { [id]: boolean }
  onlineAlertSent:      {},  // { [id]: boolean }
  lastStatusTransition: {},  // { [id]: timestamp }
  geofenceExitTracker:  {},  // { [id]: boolean|undefined }
  overspeedTracker:     {},  // { [id]: boolean }
  crashTracker:         {},  // { [id]: boolean }

  // Issue 1 FIX: track devices seen for first-connect online alert
  knownDevices: new Set(),   // Set<id> — first time a device is ever seen

  /* ── Alerts ── */
  localAlerts:    [],
  firebaseAlerts: [],
  alerts:         [],
  alertFilter:    'all',
  alertUnread:    0,
  totalAlerts:    0,

  /* ── Geofences ── */
  geofences: {},

  /* ── Settings ── */
  settings: {
    offlineTimeout:  90,
    speedThreshold:  120,
    crashThreshold:  2.0,
    gfCooldown:      60,
    showTrail:       true,
    offlineEnabled:  true,
    autoSync:        true,
    offlineBuffer:   200,
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
