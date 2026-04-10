/**
 * src/utils/events.js
 * Tiny pub/sub event bus — decouples modules without circular imports.
 *
 * Usage:
 *   import { on, emit } from '../utils/events.js';
 *   on('devices:updated', () => sidebar.refresh());
 *   emit('devices:updated');
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
  (_listeners[event] || []).forEach(cb => cb(data));
}

/* ── Named events used across the app ── */
export const EV = {
  DEVICES_UPDATED:   'devices:updated',    // any device data changed
  DEVICE_SELECTED:   'device:selected',    // user selected a device — { id }
  ALERT_FIRED:       'alert:fired',        // new alert created — { alert }
  CONNECTION_CHANGE: 'connection:changed', // Firebase online/offline — { online }
  SETTINGS_SAVED:    'settings:saved',     // settings were saved
  PAGE_CHANGED:      'page:changed',       // navigation — { page }
};
