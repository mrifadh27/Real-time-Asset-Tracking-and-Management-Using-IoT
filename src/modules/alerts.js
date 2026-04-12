/**
 * src/modules/alerts.js
 * Alert management — dual-track storage (local + Firebase), dedup, filters.
 *
 * FIXES:
 *  ✅ Issue 3: timestamps use updated relativeTime() (hours + minutes support).
 *  ✅ data-ts attribute on timestamp spans for live refresh without full re-render.
 *  ✅ clearAllAlerts() and markAllRead() exports.
 *  ✅ refreshTimestamps() for periodic in-place timestamp updates.
 */

import { S }              from '../utils/state.js';
import { showToast }      from '../utils/toast.js';
import { relativeTime }   from '../utils/helpers.js';
import { pushRecord }     from '../config/firebase.js';
import { emit, EV }       from '../utils/events.js';

/* ── Alert type config ── */
export const ALERT_CONFIG = {
  offline:       { icon:'⚫', level:'info',    label:'Went Offline',    group:'offline',  resolved:false },
  online:        { icon:'🟢', level:'success',  label:'Back Online',     group:'offline',  resolved:true  },
  geofence:      { icon:'🔵', level:'warning',  label:'Left Geofence',   group:'geofence', resolved:false },
  geofence_enter:{ icon:'🔵', level:'success',  label:'Entered Zone',    group:'geofence', resolved:true  },
  speed:         { icon:'🟠', level:'warning',  label:'Overspeed',       group:'speed',    resolved:false },
  speed_normal:  { icon:'🟠', level:'success',  label:'Speed Normalised',group:'speed',    resolved:true  },
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

const BLOCKED   = new Set(['theft', 'accident']);
const COOLDOWNS = {
  offline: 60_000, online: 60_000,
  geofence: null,  geofence_enter: 10_000,
  speed: 30_000,   speed_normal:   30_000,
  crash: 10_000,   crash_clear:    10_000,
  sync:  5_000,
};
const _cooldowns = {};

/* ── FIRE ALERT ── */
export function fireAlert(deviceId, type, message, devName) {
  if (BLOCKED.has(type)) return;
  if (!ALERT_CONFIG[type]) { console.warn('[alerts] unknown type:', type); return; }

  const key    = `${deviceId}_${type}`;
  const now    = Date.now();
  const coolMs = type === 'geofence' ? (S.settings.gfCooldown * 1000) : COOLDOWNS[type] ?? 30_000;
  if (_cooldowns[key] && now - _cooldowns[key] < coolMs) return;
  _cooldowns[key] = now;

  const name = devName || S.devices[deviceId]?.name || deviceId;
  const cfg  = ALERT_CONFIG[type];

  const alertObj = {
    id:         `local_${now}_${Math.random().toString(36).slice(2, 8)}`,
    deviceId, deviceName: name, type,
    group:      cfg.group,
    resolved:   cfg.resolved,
    message,
    lat:        S.devices[deviceId]?.lat ?? null,
    lng:        S.devices[deviceId]?.lng ?? null,
    timestamp:  now, read: false,
  };

  S.localAlerts.unshift(alertObj);
  if (S.localAlerts.length > 300) S.localAlerts.pop();

  pushRecord('/alerts', {
    deviceId, deviceName: name, type, group: cfg.group,
    resolved: cfg.resolved, message,
    lat: alertObj.lat, lng: alertObj.lng,
    timestamp: now, read: false,
  });

  S.totalAlerts++;
  S.alertUnread++;

  mergeAndRender();
  emit(EV.ALERT_FIRED, { alert: alertObj });
  showToast(cfg.level, `${cfg.icon} ${message}`);
}

/* ── PROCESS FIREBASE SNAPSHOT ── */
export function processAlertsSnapshot(snap) {
  const list = [];
  snap.forEach(c => { const v = c.val(); if (v && !BLOCKED.has(v.type)) list.unshift({ id: c.key, ...v }); });
  S.firebaseAlerts = list;
  mergeAndRender();
}

/* ── MERGE & RENDER (deduplicate) ── */
export function mergeAndRender() {
  const combined = [...S.firebaseAlerts, ...S.localAlerts];
  const seen = new Set();
  S.alerts = combined.filter(a => {
    if (!a?.type || BLOCKED.has(a.type)) return false;
    const key = `${a.deviceId}_${a.type}_${Math.floor((a.timestamp || 0) / 2000)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  emit(EV.ALERT_FIRED, {});
}

/* ── GET FILTERED ── */
export function getFilteredAlerts(filter) {
  const types = FILTER_GROUPS[filter];
  if (!types) return S.alerts;
  return S.alerts.filter(a => types.includes(a.type));
}

/* ── GET COUNTS ── */
export function getFilterCounts() {
  const counts = {};
  Object.entries(FILTER_GROUPS).forEach(([key, types]) => {
    counts[key] = types ? S.alerts.filter(a => types.includes(a.type)).length : S.alerts.length;
  });
  return counts;
}

/* ── CLEAR ALL ── */
export function clearAllAlerts() {
  S.localAlerts    = [];
  S.firebaseAlerts = [];
  S.alerts         = [];
  S.alertUnread    = 0;
  emit(EV.ALERT_FIRED, {});
  showToast('info', '🗑️ Alert history cleared.');
}

/* ── MARK ALL READ ── */
export function markAllRead() {
  S.alertUnread = 0;
  emit(EV.ALERT_FIRED, {});
}

/**
 * In-place timestamp refresh — updates "X min ago" / "X hr Y min ago"
 * every 60 s without full re-render. Works via data-ts attributes.
 */
export function refreshTimestamps() {
  const el = document.getElementById('alert-list');
  if (!el) return;
  el.querySelectorAll('[data-ts]').forEach(span => {
    const ts = parseInt(span.dataset.ts, 10);
    if (ts) span.textContent = relativeTime(ts);
  });
}

/* ── RENDER ALERT LIST ── */
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
    const cfg        = ALERT_CONFIG[a.type] || { icon:'⚠️', group:'offline', resolved:false };
    const resolvedTag = cfg.resolved ? `<span class="alert-resolved-tag">✓ resolved</span>` : '';
    const locStr     = (a.lat && parseFloat(a.lat) !== 0)
      ? `<span>📍 ${parseFloat(a.lat).toFixed(4)}, ${parseFloat(a.lng).toFixed(4)}</span>`
      : '';
    // ✅ Issue 3: data-ts for live refresh; relativeTime now shows hours if > 60 min
    return `
    <div class="alert-item type-${a.type}${cfg.resolved ? ' resolved' : ''}">
      <div class="alert-icon grp-${cfg.group}">${cfg.icon}</div>
      <div class="alert-body">
        <div class="alert-title">${a.message || 'Alert'}</div>
        <div class="alert-meta">
          <span>📟 ${a.deviceName || a.deviceId || 'Unknown'}</span>
          <span data-ts="${a.timestamp || ''}">🕒 ${relativeTime(a.timestamp)}</span>
          ${locStr}
          ${resolvedTag}
        </div>
      </div>
      <span class="alert-badge badge-${a.type}">${cfg.label}</span>
    </div>`;
  }).join('');
}

/* ── UPDATE FILTER BADGES ── */
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

/* ── UPDATE ALERT NAV BADGE ── */
export function updateAlertBadge() {
  const badge = document.getElementById('alert-badge');
  if (!badge) return;
  badge.style.display = S.alertUnread > 0 ? 'inline' : 'none';
  badge.textContent   = S.alertUnread > 9 ? '9+' : S.alertUnread;
}
