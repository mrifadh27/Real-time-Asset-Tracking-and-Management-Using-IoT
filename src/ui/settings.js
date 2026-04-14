/**
 * src/ui/settings.js
 *
 * FIXES:
 *  ✅ All numeric inputs clamped to valid ranges on save
 *  ✅ Clamped values written back to UI so user sees applied value
 *  ✅ Notification + sound toggles persisted
 *  ✅ applyTrailToggle() now saves to localStorage immediately
 *  ✅ All localStorage calls in try/catch (incognito mode safety)
 *  ✅ applySettingsToUI() syncs notification toggles to S.settings
 */

import { S }           from '../utils/state.js';
import { clearTrails } from '../modules/map.js';
import { emit, EV }    from '../utils/events.js';
import {
  setNotificationsEnabled, setSoundEnabled,
} from '../modules/notifications.js';

const LS_KEY       = 'vector_settings_v1';
const LS_THEME_KEY = 'vector_theme';

function lsGet(key, fallback = null) { try { return localStorage.getItem(key) ?? fallback; } catch(_) { return fallback; } }
function lsSet(key, val)             { try { localStorage.setItem(key, val); } catch(_) {} }

/* ────────────────────────────────────────
   LOAD
──────────────────────────────────────── */
export function loadSettings() {
  try {
    const saved = JSON.parse(lsGet(LS_KEY, '{}') || '{}');
    const clamp  = (v, lo, hi) => isFinite(v) ? Math.max(lo, Math.min(hi, v)) : undefined;

    const merges = {
      offlineTimeout:    clamp(saved.offlineTimeout,  5, 300),
      speedThreshold:    clamp(saved.speedThreshold,  10, 300),
      crashThreshold:    clamp(saved.crashThreshold,  0.5, 10),
      gfCooldown:        clamp(saved.gfCooldown,      10, 600),
      offlineBuffer:     clamp(saved.offlineBuffer,   50, 1000),
      showTrail:         typeof saved.showTrail    === 'boolean' ? saved.showTrail    : undefined,
      offlineEnabled:    typeof saved.offlineEnabled=== 'boolean'? saved.offlineEnabled:undefined,
      autoSync:          typeof saved.autoSync     === 'boolean' ? saved.autoSync     : undefined,
      notifications:     typeof saved.notifications=== 'boolean'? saved.notifications : undefined,
      notificationSound: typeof saved.notificationSound==='boolean'? saved.notificationSound:undefined,
    };
    Object.entries(merges).forEach(([k, v]) => { if (v !== undefined) S.settings[k] = v; });
  } catch(_) {}

  document.documentElement.setAttribute('data-theme', lsGet(LS_THEME_KEY, 'dark'));
  _syncNotificationModules();
}

/* ────────────────────────────────────────
   SAVE
──────────────────────────────────────── */
export function saveSettings() {
  const g   = id => document.getElementById(id);
  const tog = id => g(id)?.classList.contains('on') ?? false;

  const rawOffT  = parseInt(g('s-offline-t')?.value,   10);
  const rawSpdT  = parseInt(g('s-speed-t')?.value,     10);
  const rawCrash = parseFloat(g('s-crash-t')?.value);
  const rawGfCd  = parseInt(g('s-gf-cooldown')?.value, 10);
  const rawBuf   = parseInt(g('s-offline-buf')?.value,  10);

  S.settings.offlineTimeout = isFinite(rawOffT)  ? Math.max(5,   Math.min(300,  rawOffT))  : 90;
  S.settings.speedThreshold = isFinite(rawSpdT)  ? Math.max(10,  Math.min(300,  rawSpdT))  : 120;
  S.settings.crashThreshold = isFinite(rawCrash) ? Math.max(0.5, Math.min(10,   rawCrash)) : 2.0;
  S.settings.gfCooldown     = isFinite(rawGfCd)  ? Math.max(10,  Math.min(600,  rawGfCd))  : 60;
  S.settings.offlineBuffer  = isFinite(rawBuf)   ? Math.max(50,  Math.min(1000, rawBuf))   : 200;

  S.settings.offlineEnabled    = tog('s-offline-toggle');
  S.settings.autoSync          = tog('s-autosync-toggle');
  S.settings.showTrail         = tog('s-trail-toggle');
  S.settings.notifications     = tog('s-notif-toggle');
  S.settings.notificationSound = tog('s-notif-sound-toggle');

  lsSet(LS_KEY, JSON.stringify(S.settings));

  // Write clamped values back to UI
  const sv = (id, v) => { const e = g(id); if (e) e.value = v; };
  sv('s-offline-t',   S.settings.offlineTimeout);
  sv('s-speed-t',     S.settings.speedThreshold);
  sv('s-crash-t',     S.settings.crashThreshold);
  sv('s-gf-cooldown', S.settings.gfCooldown);
  sv('s-offline-buf', S.settings.offlineBuffer);

  _syncNotificationModules();
  emit(EV.SETTINGS_SAVED);
}

/* ────────────────────────────────────────
   APPLY TO UI
──────────────────────────────────────── */
export function applySettingsToUI() {
  const s  = S.settings;
  const sv = (id, v)  => { const e = document.getElementById(id); if (e) e.value = v; };
  const st = (id, on) => document.getElementById(id)?.classList.toggle('on', !!on);

  sv('s-offline-t',   s.offlineTimeout);
  sv('s-speed-t',     s.speedThreshold);
  sv('s-crash-t',     s.crashThreshold);
  sv('s-gf-cooldown', s.gfCooldown);
  sv('s-offline-buf', s.offlineBuffer);

  st('s-offline-toggle',    s.offlineEnabled);
  st('s-autosync-toggle',   s.autoSync);
  st('s-trail-toggle',      s.showTrail);
  st('s-notif-toggle',      s.notifications);
  st('s-notif-sound-toggle',s.notificationSound);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  st('s-theme-toggle', isDark);
}

/* ────────────────────────────────────────
   THEME TOGGLE
──────────────────────────────────────── */
export function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  lsSet(LS_THEME_KEY, next);
  document.getElementById('s-theme-toggle')?.classList.toggle('on', next === 'dark');
}

/* ────────────────────────────────────────
   TRAIL TOGGLE
──────────────────────────────────────── */
export function applyTrailToggle(on) {
  S.settings.showTrail = on;
  lsSet(LS_KEY, JSON.stringify(S.settings)); // ✅ persist immediately
  if (!on) clearTrails();
}

/* ── Sync notification preferences to the module ── */
function _syncNotificationModules() {
  setNotificationsEnabled(S.settings.notifications     ?? true);
  setSoundEnabled(         S.settings.notificationSound ?? true);
}
