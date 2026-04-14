/**
 * src/modules/alerts.js
 *
 * ROOT CAUSE FIX — Geofence repeat-trigger bug:
 *
 *   BEFORE: both 'geofence' (exit) and 'geofence_enter' used gfCooldown (60s).
 *   After an enter, _cooldowns['id_geofence_enter'] was set. When the device
 *   exited and re-entered within 60s, the cooldown blocked the second enter.
 *
 *   FIX: When a geofence EXIT fires  → delete the enter-cooldown key.
 *        When a geofence ENTER fires → delete the exit-cooldown key.
 *   This means direction-changes ALWAYS break through (correct behaviour).
 *   The gfCooldown still throttles rapid same-direction jitter (device
 *   bouncing right on the boundary edge) but never blocks real transitions.
 *
 * OTHER FIXES RETAINED:
 *  ✅ clearAllAlerts() / markAllRead() emit EV.ALERT_FIRED for immediate UI update
 *  ✅ processAlertsSnapshot() null/exists guards
 *  ✅ pushRecord() errors caught silently
 *  ✅ _cooldowns capped at 500 entries (memory safety)
 *  ✅ updateAlertBadge() updates tab title
 */

import { S }              from '../utils/state.js';
import { showToast }      from '../utils/toast.js';
import { relativeTime }   from '../utils/helpers.js';
import { pushRecord }     from '../config/firebase.js';
import { emit, EV }       from '../utils/events.js';
import { fireNotification, updateTabTitle } from './notifications.js';

/* ─── Alert type config ─── */
export const ALERT_CONFIG = {
  offline:       { icon:'⚫', level:'info',    label:'Went Offline',    group:'offline',  resolved:false },
  online:        { icon:'🟢', level:'success',  label:'Back Online',     group:'offline',  resolved:true  },
  geofence:      { icon:'🔵', level:'warning',  label:'Left Geofence',   group:'geofence', resolved:false },
  geofence_enter:{ icon:'🔵', level:'success',  label:'Entered Zone',    group:'geofence', resolved:true  },
  speed:         { icon:'🟠', level:'warning',  label:'Overspeed',       group:'speed',    resolved:false },
  speed_normal:  { icon:'🟠', level:'success',  label:'Speed Normal',    group:'speed',    resolved:true  },
  crash:         { icon:'🔴', level:'danger',   label:'Crash Detected',  group:'crash',    resolved:false },
  crash_clear:   { icon:'🔴', level:'info',     label:'Impact Cleared',  group:'crash',    resolved:true  },
  sync:          { icon:'🟢', level:'success',  label:'Data Synced',     group:'sync',     resolved:true  },
};

export const FILTER_GROUPS = {
  all:      null,
  offline:  ['offline', 'online'],
  geofence: ['geofence', 'geofence_enter'],
  speed:    ['speed', 'speed_normal'],
  crash:    ['crash', 'crash_clear'],
  sync:     ['sync'],
};

const BLOCKED = new Set(['theft', 'accident']);

/**
 * Base cooldown per type (ms).
 * geofence / geofence_enter use null → resolved dynamically via S.settings.gfCooldown.
 * But crucially, the opposite-direction key is always cleared on transition (see below).
 */
const BASE_COOLDOWNS = {
  offline:        60_000,
  online:         60_000,
  geofence:       null,    // uses S.settings.gfCooldown
  geofence_enter: null,    // uses S.settings.gfCooldown (same-direction throttle only)
  speed:          30_000,
  speed_normal:   30_000,
  crash:          10_000,
  crash_clear:    10_000,
  sync:            5_000,
};

const MAX_COOLDOWN_ENTRIES = 500;
const _cooldowns = {};

function _pruneCooldowns() {
  const keys = Object.keys(_cooldowns);
  if (keys.length <= MAX_COOLDOWN_ENTRIES) return;
  keys.sort((a, b) => _cooldowns[a] - _cooldowns[b])
      .slice(0, keys.length - MAX_COOLDOWN_ENTRIES)
      .forEach(k => delete _cooldowns[k]);
}

/* ═════════════════════════════════════════════════════
   FIRE ALERT
   ————————————————————————————————————————————————————
   Key logic for geofence repeats:
   • Same-direction cooldown:  prevents jitter on boundary edge
   • Cross-direction reset:    exit clears enter-cooldown, enter clears exit-cooldown
     → every real transition always fires, no matter the timing
═════════════════════════════════════════════════════ */
export function fireAlert(deviceId, type, message, devName) {
  if (BLOCKED.has(type) || !ALERT_CONFIG[type]) return;

  const now    = Date.now();
  const key    = `${deviceId}_${type}`;

  // Resolve cooldown for this type
  const isGfType = (type === 'geofence' || type === 'geofence_enter');
  const coolMs   = isGfType
    ? (S.settings.gfCooldown * 1000)
    : (BASE_COOLDOWNS[type] ?? 30_000);

  // ── Cooldown check (same direction only) ──────────────────────────────────
  if (_cooldowns[key] && now - _cooldowns[key] < coolMs) return;
  _cooldowns[key] = now;

  // ✅ GEOFENCE REPEAT FIX — cross-direction cooldown reset
  // When exit fires → clear enter cooldown so next re-entry always triggers
  // When enter fires → clear exit cooldown so next re-exit always triggers
  if (type === 'geofence')       delete _cooldowns[`${deviceId}_geofence_enter`];
  if (type === 'geofence_enter') delete _cooldowns[`${deviceId}_geofence`];

  _pruneCooldowns();

  const name = devName || S.devices[deviceId]?.name || deviceId;
  const cfg  = ALERT_CONFIG[type];

  const alertObj = {
    id:        `local_${now}_${Math.random().toString(36).slice(2, 8)}`,
    deviceId,  deviceName: name, type,
    group:     cfg.group,
    resolved:  cfg.resolved,
    message,
    lat:       S.devices[deviceId]?.lat ?? null,
    lng:       S.devices[deviceId]?.lng ?? null,
    timestamp: now,
    read:      false,
  };

  S.localAlerts.unshift(alertObj);
  if (S.localAlerts.length > 300) S.localAlerts.pop();

  // Push to Firebase async — don't block alert rendering
  pushRecord('/alerts', {
    deviceId, deviceName: name, type, group: cfg.group,
    resolved: cfg.resolved, message,
    lat: alertObj.lat, lng: alertObj.lng,
    timestamp: now, read: false,
  }).catch(err => console.warn('[alerts] Firebase push failed:', err.message));

  S.totalAlerts++;
  S.alertUnread++;

  mergeAndRender();

  // Browser push notification + audio beep
  fireNotification(type, cfg.label, message);

  // Emit immediately — main.js refreshes alert list without waiting for Firebase
  emit(EV.ALERT_FIRED, { alert: alertObj, immediate: true });

  showToast(cfg.level, `${cfg.icon} ${message}`);
}

/* ─── PROCESS FIREBASE SNAPSHOT ─── */
export function processAlertsSnapshot(snap) {
  if (!snap || !snap.exists()) { S.firebaseAlerts = []; return; }

  const list = [];
  let fbUnread = 0;
  try {
    snap.forEach(c => {
      const v = c.val();
      if (!v || typeof v !== 'object') return;
      if (BLOCKED.has(v.type) || !ALERT_CONFIG[v.type]) return;
      list.unshift({ id: c.key, ...v });
      if (!v.read) fbUnread++;
    });
  } catch (err) {
    console.warn('[alerts] Snapshot processing error:', err);
  }

  S.firebaseAlerts = list;
  // Use higher of local or Firebase unread count
  if (fbUnread > S.alertUnread) S.alertUnread = fbUnread;
  mergeAndRender();
}

/* ─── MERGE & DEDUPLICATE ─── */
export function mergeAndRender() {
  const seen = new Set();
  S.alerts = [...S.firebaseAlerts, ...S.localAlerts]
    .filter(a => {
      if (!a?.type || BLOCKED.has(a.type) || !ALERT_CONFIG[a.type]) return false;
      // 2-second window dedup: prevents showing both local + Firebase copy
      const key = `${a.deviceId}_${a.type}_${Math.floor((a.timestamp || 0) / 2000)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/* ─── FILTER HELPERS ─── */
export function getFilteredAlerts(filter) {
  const types = FILTER_GROUPS[filter];
  return types ? S.alerts.filter(a => types.includes(a.type)) : S.alerts;
}

export function getFilterCounts() {
  const counts = {};
  Object.entries(FILTER_GROUPS).forEach(([key, types]) => {
    counts[key] = types
      ? S.alerts.filter(a => types.includes(a.type)).length
      : S.alerts.length;
  });
  return counts;
}

/* ─── CLEAR ALL ─── */
export function clearAllAlerts() {
  S.localAlerts    = [];
  S.firebaseAlerts = [];
  S.alerts         = [];
  S.alertUnread    = 0;
  S.totalAlerts    = 0;
  updateTabTitle(0);
  emit(EV.ALERT_FIRED, { immediate: true, clear: true });
  showToast('info', '🗑️ Alert history cleared.');
}

/* ─── MARK ALL READ ─── */
export function markAllRead() {
  S.alertUnread = 0;
  S.alerts.forEach(a      => { a.read = true; });
  S.localAlerts.forEach(a => { a.read = true; });
  updateTabTitle(0);
  emit(EV.ALERT_FIRED, { immediate: true, markRead: true });
}

/* ─── TIMESTAMP REFRESH (every 60s) ─── */
export function refreshTimestamps() {
  const el = document.getElementById('alert-list');
  if (!el) return;
  el.querySelectorAll('[data-ts]').forEach(span => {
    const ts = parseInt(span.dataset.ts, 10);
    if (ts) span.textContent = relativeTime(ts);
  });
}

/* ─── RENDER ALERT LIST ─── */
export function renderAlertList() {
  const el = document.getElementById('alert-list');
  if (!el) return;

  const list = getFilteredAlerts(S.alertFilter);
  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="icon">✅</div>
      <p>No ${S.alertFilter === 'all' ? '' : S.alertFilter + ' '}alerts yet.</p>
    </div>`;
    return;
  }

  el.innerHTML = list.map(a => {
    const cfg       = ALERT_CONFIG[a.type] || { icon:'⚠️', group:'offline', resolved:false, label:'Alert' };
    const lat       = parseFloat(a.lat), lng = parseFloat(a.lng);
    const locStr    = (isFinite(lat) && lat !== 0)
      ? `<span>📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>` : '';
    const resTag    = cfg.resolved ? `<span class="alert-resolved-tag">✓ resolved</span>` : '';
    return `
    <div class="alert-item type-${a.type}${cfg.resolved ? ' resolved' : ''}">
      <div class="alert-icon grp-${cfg.group}">${cfg.icon}</div>
      <div class="alert-body">
        <div class="alert-title">${a.message || 'Alert'}</div>
        <div class="alert-meta">
          <span>📟 ${a.deviceName || a.deviceId || 'Unknown'}</span>
          <span data-ts="${a.timestamp || ''}">🕒 ${relativeTime(a.timestamp)}</span>
          ${locStr}${resTag}
        </div>
      </div>
      <span class="alert-badge badge-${a.type}">${cfg.label}</span>
    </div>`;
  }).join('');
}

/* ─── UPDATE FILTER BADGES ─── */
export function updateFilterBadges() {
  const counts = getFilterCounts();
  Object.entries(FILTER_GROUPS).forEach(([key]) => {
    const btn   = document.querySelector(`.filter-btn[data-filter="${key}"]`);
    const badge = btn?.querySelector('.filter-count');
    if (!badge) return;
    const n = counts[key] || 0;
    badge.textContent = n;
    badge.classList.toggle('visible', n > 0 && key !== 'all');
  });
}

/* ─── UPDATE ALERT NAV BADGE ─── */
export function updateAlertBadge() {
  const badge = document.getElementById('alert-badge');
  if (!badge) return;
  const count = Math.max(0, S.alertUnread);
  badge.style.display = count > 0 ? 'inline' : 'none';
  badge.textContent   = count > 9 ? '9+' : count;
  updateTabTitle(count);
}
