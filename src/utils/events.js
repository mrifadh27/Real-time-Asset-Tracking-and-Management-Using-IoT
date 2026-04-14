/**
 * src/utils/events.js
 * Tiny pub/sub event bus.
 *
 * FIXES:
 *  ✅ resetEventBus() — clears all listeners on logout (prevents accumulation)
 *  ✅ emit() wrapped in try/catch per handler — one bad handler can't crash others
 */

const _listeners = {};

export function on(event, cb) {
  (_listeners[event] = _listeners[event] || []).push(cb);
}

export function off(event, cb) {
  if (!_listeners[event]) return;
  _listeners[event] = _listeners[event].filter(fn => fn !== cb);
}

export function emit(event, data) {
  (_listeners[event] || []).slice().forEach(cb => {
    try { cb(data); } catch (err) {
      console.warn(`[events] Handler error on "${event}":`, err);
    }
  });
}

export function resetEventBus() {
  Object.keys(_listeners).forEach(k => delete _listeners[k]);
}

export const EV = {
  DEVICES_UPDATED:   'devices:updated',
  DEVICE_SELECTED:   'device:selected',
  ALERT_FIRED:       'alert:fired',
  CONNECTION_CHANGE: 'connection:changed',
  SETTINGS_SAVED:    'settings:saved',
  PAGE_CHANGED:      'page:changed',
  DRAW_MODE_CHANGED: 'geofence:drawMode',  // { active, deviceId }
};
