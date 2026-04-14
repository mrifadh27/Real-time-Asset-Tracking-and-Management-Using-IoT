/**
 * src/modules/notifications.js
 * Browser Notification API + Web Audio beeps + tab-title badge.
 *
 * FIXES:
 *  ✅ geofence_enter added to CRITICAL_TYPES — notification + audio fires on vehicle re-entry
 *  ✅ Distinct ascending audio for geofence_enter (vs descending for geofence exit)
 *  ✅ online alert fires a soft notification (device reconnected)
 *  ✅ SILENT_TYPES trimmed to only truly resolved/informational events
 */

const CRITICAL_TYPES = new Set([
  'crash',
  'speed',
  'offline',
  'geofence',       // vehicle LEFT zone
  'geofence_enter', // vehicle ENTERED zone ← FIX: was in SILENT_TYPES before
  'online',         // device reconnected (soft audio)
]);

// Truly silent / resolved events — no notification, no audio
const SILENT_TYPES = new Set(['sync', 'speed_normal', 'crash_clear']);

const APP_TITLE = 'VECTOR — Fleet Intelligence';

let _permission   = 'default';
let _audioCtx     = null;
let _enabled      = true;
let _soundEnabled = true;

/* ── INIT (call once on login) ── */
export async function initNotifications() {
  if (!('Notification' in window)) return;
  _permission = Notification.permission;
  if (_permission === 'default') {
    try {
      _permission = await Notification.requestPermission();
    } catch (_) {
      Notification.requestPermission(p => { _permission = p; });
    }
  }
}

/* ── ENABLE / DISABLE ── */
export function setNotificationsEnabled(enabled) { _enabled = enabled; }
export function setSoundEnabled(enabled)         { _soundEnabled = enabled; }

/* ── FIRE A NOTIFICATION ── */
export function fireNotification(type, title, body) {
  if (!_enabled) return;
  if (SILENT_TYPES.has(type)) return;

  const isCritical = CRITICAL_TYPES.has(type);

  // OS-level browser notification
  if (_permission === 'granted' && 'Notification' in window) {
    try {
      const n = new Notification(`VECTOR: ${title}`, {
        body,
        icon:               '/assets/vector-logo-icon.png',
        tag:                `vector-${type}-${Date.now()}`,
        requireInteraction: type === 'crash',
      });
      n.onclick = () => { window.focus(); n.close(); };
      if (!isCritical) setTimeout(() => { try { n.close(); } catch(_) {} }, 6000);
    } catch (_) {}
  }

  // Audio beep
  if (isCritical && _soundEnabled) _playBeep(type);
}

/* ── TAB TITLE BADGE ── */
export function updateTabTitle(unreadCount) {
  document.title = unreadCount > 0
    ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${APP_TITLE}`
    : APP_TITLE;
}

/* ── RESET (on logout) ── */
export function resetNotifications() {
  _enabled      = true;
  _soundEnabled = true;
  updateTabTitle(0);
}

/* ── UNLOCK AUDIO on first user click ── */
export function unlockAudio() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(() => {});
  } catch (_) {}
}

/* ── AUDIO BEEP (Web Audio API — zero external files) ── */
function _playBeep(type) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === 'suspended') { _audioCtx.resume().catch(() => {}); return; }

    const patterns = {
      crash:          [{ f:880,d:.12 },{ f:660,d:.12 },{ f:440,d:.30 }], // descending danger
      speed:          [{ f:550,d:.09 },{ f:660,d:.09 },{ f:880,d:.18 }], // ascending warning
      offline:        [{ f:440,d:.20 },{ f:330,d:.32 }],                  // drop tone
      geofence:       [{ f:600,d:.12 },{ f:500,d:.12 },{ f:400,d:.18 }], // descending EXIT
      geofence_enter: [{ f:400,d:.10 },{ f:550,d:.10 },{ f:700,d:.18 }], // ascending ENTER ← NEW
      online:         [{ f:550,d:.08 },{ f:700,d:.14 }],                  // short positive
    };
    const notes = patterns[type] ?? [{ f:550, d:.2 }];

    let t = _audioCtx.currentTime + 0.01;
    notes.forEach(note => {
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = note.f;
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);
      osc.start(t);
      osc.stop(t + note.d + 0.01);
      t += note.d + 0.05;
    });
  } catch (_) {}
}
