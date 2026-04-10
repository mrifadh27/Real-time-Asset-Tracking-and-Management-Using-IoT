/**
 * src/ui/settings.js
 * Settings: load from localStorage, save, apply to form, and sync toggles.
 */

import { S }             from '../utils/state.js';
import { showToast }     from '../utils/toast.js';
import { clearTrails }   from '../modules/map.js';
import { emit, EV }      from '../utils/events.js';

const LS_KEY = 'vector_settings_v1';

/* ────────────────────────────────────────
   LOAD
──────────────────────────────────────── */
export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    Object.assign(S.settings, saved);
  } catch (_) {}
}

/* ────────────────────────────────────────
   SAVE
──────────────────────────────────────── */
export function saveSettings() {
  const g = id => document.getElementById(id);
  const tog = id => g(id)?.classList.contains('on') ?? false;

  // ✅ IMPROVED: Higher defaults to prevent flapping
  S.settings.offlineTimeout  = parseInt(g('s-offline-t')?.value,   10) || 90;  // 30s → 90s
  S.settings.speedThreshold  = parseInt(g('s-speed-t')?.value,     10) || 120;
  S.settings.crashThreshold  = parseFloat(g('s-crash-t')?.value)       || 2.0;
  S.settings.gfCooldown      = parseInt(g('s-gf-cooldown')?.value, 10) || 60;
  S.settings.offlineBuffer   = parseInt(g('s-offline-buf')?.value,  10) || 200;
  S.settings.offlineEnabled  = tog('s-offline-toggle');
  S.settings.autoSync        = tog('s-autosync-toggle');
  S.settings.showTrail       = tog('s-trail-toggle');

  try { localStorage.setItem(LS_KEY, JSON.stringify(S.settings)); } catch (_) {}

  emit(EV.SETTINGS_SAVED);
  showToast('success', '✅ Settings saved and applied!');
}

/* ────────────────────────────────────────
   APPLY TO UI
──────────────────────────────────────── */
export function applySettingsToUI() {
  const s  = S.settings;
  const sv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  const st = (id, on) => document.getElementById(id)?.classList.toggle('on', !!on);

  sv('s-offline-t',  s.offlineTimeout);
  sv('s-speed-t',    s.speedThreshold);
  sv('s-crash-t',    s.crashThreshold);
  sv('s-gf-cooldown',s.gfCooldown);
  sv('s-offline-buf',s.offlineBuffer);

  st('s-offline-toggle', s.offlineEnabled);
  st('s-autosync-toggle',s.autoSync);
  st('s-trail-toggle',   s.showTrail);
  st('s-theme-toggle',
    document.documentElement.getAttribute('data-theme') === 'dark');
}

/* ────────────────────────────────────────
   THEME TOGGLE
──────────────────────────────────────── */
export function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  /* Sync the settings-page toggle without firing another toggleTheme */
  document.getElementById('s-theme-toggle')?.classList.toggle('on', next === 'dark');
}

/* Trail toggle (sidebar or settings) */
export function applyTrailToggle(on) {
  S.settings.showTrail = on;
  if (!on) clearTrails();
}
