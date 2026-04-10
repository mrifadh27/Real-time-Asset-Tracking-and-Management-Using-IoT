/**
 * src/utils/state.js
 * Central application state — imported by all modules.
 * No imports here to avoid circular dependencies.
 */

export const S = {
  /* ── Devices ── */
  devices:   {},   // { [id]: Device }
  selectedId: null,
  history:   {},   // { [id]: Array<{speed, accel, ts}> }

  /* ── Per-device previous states (change detection) ── */
  prevStatus:           {},  // { [id]: 'online'|'offline'|'idle' }
  offlineAlertSent:     {},  // { [id]: boolean } — true = alert already fired for this offline state
  onlineAlertSent:      {},  // { [id]: boolean } — true = alert already fired for this online state
  lastStatusTransition: {},  // { [id]: timestamp } — track when state last transitioned
  geofenceExitTracker:  {},  // { [id]: boolean } — true = device is currently outside
  overspeedTracker:     {},  // { [id]: boolean } — true = currently over threshold
  crashTracker:         {},  // { [id]: boolean } — true = currently in crash state

  /* ── Alerts ── */
  localAlerts:    [],   // written instantly on every fireAlert()
  firebaseAlerts: [],   // from Firebase listener
  alerts:         [],   // merged + deduplicated display list
  alertFilter:    'all',
  alertUnread:    0,
  totalAlerts:    0,

  /* ── Geofences ── */
  geofences: {},  // { [id]: { lat, lng, radius, active, isSet, circle } }

  /* ── Settings ── */
  settings: {
    offlineTimeout:  90,  // ✅ INCREASED: 30s → 90s minimum before marking offline
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
    playing:  false,
    index:    0,
    route:    [],
    marker:   null,
    polyline: null,
    timer:    null,
  },

  /* ── Navigation / OSRM route ── */
  navRoute: {
    destLat: null, destLng: null, destName: '',
    line: null, lineFull: null, destMarker: null,
    fullCoords: [], totalDist: 0,
  },

  /* ── Offline ── */
  offlineQueue:  {},   // { [id]: Array<record> }
  offlineTimers: {},   // { [id]: timeoutId }
  isOffline:     false,

  /* ── Session analytics ── */
  tripStart:       {},  // { [id]: timestamp }
  maxSpeed:        {},  // { [id]: number }
  firstDeviceSeen: false,
};

/** Map-layer references (Leaflet objects, not plain data). */
export const mapLayers = {
  markers:  {},  // { [id]: L.Marker }
  trails:   {},  // { [id]: L.Polyline }
  routePts: {},  // { [id]: Array<[lat,lng]> }
};
