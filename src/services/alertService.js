/**
 * src/services/alertService.js
 * Manages alert creation, cooldowns, and Firebase writes.
 */

import { state } from '../utils/state.js';
import { showToast } from '../utils/toast.js';

const BLOCKED_TYPES = new Set(['theft', 'accident']);

const ALERT_ICONS = {
  offline:  '⚫',
  geofence: '🔵',
  speed:    '🟠',
  sync:     '🟢',
};

const TOAST_LEVELS = {
  offline:  'info',
  geofence: 'warning',
  speed:    'warning',
  sync:     'success',
};

class AlertService {
  constructor() {
    /** @type {Object.<string, number>} key → timestamp of last fire */
    this._cooldowns = {};
  }

  /**
   * Fire an alert, respecting cooldown.
   * @param {string} deviceId
   * @param {string} type
   * @param {string} message
   * @param {string} [devName]
   */
  fire(deviceId, type, message, devName) {
    if (BLOCKED_TYPES.has(type)) return;

    const key      = `${deviceId}_${type}`;
    const now      = Date.now();
    const cooldown = type === 'geofence'
      ? state.settings.gfCooldown * 1000
      : 30_000;

    if (this._cooldowns[key] && now - this._cooldowns[key] < cooldown) return;
    this._cooldowns[key] = now;

    const name = devName || state.devices[deviceId]?.name || deviceId;
    const dev  = state.devices[deviceId];

    // Write to Firebase (best-effort — don't block UI on failure)
    try {
      window._nextrackDb?.ref('/alerts').push({
        deviceId,
        deviceName: name,
        type,
        message,
        lat:       dev?.lat  ?? null,
        lng:       dev?.lng  ?? null,
        timestamp: now,
        read:      false,
      });
    } catch (e) {
      console.warn('[AlertService] Firebase write failed:', e);
    }

    state.totalAlerts++;
    showToast(
      TOAST_LEVELS[type] || 'info',
      `${ALERT_ICONS[type] || '⚠️'} ${message}`
    );
  }

  /**
   * Process an alerts snapshot from Firebase.
   * @param {firebase.database.DataSnapshot} snap
   */
  processSnapshot(snap) {
    const list = [];
    snap.forEach(child => list.unshift({ id: child.key, ...child.val() }));
    state.alerts      = list.filter(a => !BLOCKED_TYPES.has(a.type));
    state.alertUnread = state.alerts.filter(a => !a.read).length;
  }
}

export const alertService = new AlertService();
