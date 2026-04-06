/**
 * src/utils/state.js
 * Central application state — single source of truth.
 * All modules import from here; nothing lives in globals.
 */

export const state = {
  /** @type {Object.<string, import('../services/deviceService').Device>} */
  devices: {},

  /** Currently selected device ID */
  selectedId: null,

  /** Speed history per device: { [deviceId]: Array<{speed, accel, ts}> } */
  history: {},

  /** Alert list (from Firebase) */
  alerts: [],
  alertFilter: 'all',
  alertUnread: 0,
  totalAlerts: 0,

  /** Per-device geofence config */
  geofences: {},

  settings: {
    offlineTimeout:  30,
    speedThreshold:  120,
    gfCooldown:      60,
    showTrail:       true,
    offlineEnabled:  true,
    autoSync:        true,
    offlineBuffer:   200,
  },

  playback: {
    playing:  false,
    index:    0,
    route:    [],
    marker:   null,
    polyline: null,
    timer:    null,
  },

  offlineTimers: {},
  tripStart:     {},
  maxSpeed:      {},
  offlineQueue:  {},
  isOffline:     false,
  firstDeviceSeen: false,

  navRoute: {
    destLat:    null,
    destLng:    null,
    destName:   '',
    line:       null,
    lineFull:   null,
    destMarker: null,
    fullCoords: [],
    totalDist:  0,
  },
};

/** Map-layer dictionaries (Leaflet objects, not plain data) */
export const mapLayers = {
  markers:    {},  // { [deviceId]: L.Marker }
  trails:     {},  // { [deviceId]: L.Polyline }
  routePts:   {},  // { [deviceId]: Array<[lat,lng]> }
};
