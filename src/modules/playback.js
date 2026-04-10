/**
 * src/modules/playback.js
 * Route playback controller — plays back recorded GPS tracks.
 */

import { S, mapLayers }  from '../utils/state.js';
import { showToast }     from '../utils/toast.js';

const pb = S.playback;

/* ────────────────────────────────────────
   LOAD
──────────────────────────────────────── */
export function loadRoute(deviceId) {
  const pts  = mapLayers.routePts[deviceId];
  const has  = pts && pts.length > 1;
  pb.route   = has ? [...pts] : [];
  pb.index   = 0;
  _updateUI();
}

/* ────────────────────────────────────────
   PLAY / PAUSE
──────────────────────────────────────── */
export function toggle() {
  if (!pb.route || pb.route.length < 2) {
    showToast('warning', '⚠️ Not enough route data. Device needs to move first.');
    return;
  }
  pb.playing = !pb.playing;
  _setPlayBtn(pb.playing ? '⏸' : '▶');
  if (pb.playing) _run(); else _stopTimer();
}

export function onSpeedChange() {
  if (pb.playing) { _stopTimer(); _run(); }
}

/* ────────────────────────────────────────
   REWIND
──────────────────────────────────────── */
export function rewind() {
  pb.playing = false;
  pb.index   = 0;
  _stopTimer();
  _setPlayBtn('▶');
  _updateUI();

  if (pb.polyline) {
    try { window._vectorMap?.removeLayer(pb.polyline); } catch (_) {}
    pb.polyline = null;
  }
  if (pb.marker && pb.route[0]) pb.marker.setLatLng(pb.route[0]);
}

/* ────────────────────────────────────────
   CLEAR PLAYBACK (hide marker & polyline)
──────────────────────────────────────── */
export function clearPlayback() {
  pb.playing = false;
  pb.index   = 0;
  _stopTimer();
  _setPlayBtn('▶');
  
  const map = window._vectorMap;
  if (pb.marker) {
    try { map?.removeLayer(pb.marker); } catch (_) {}
    pb.marker = null;
  }
  if (pb.polyline) {
    try { map?.removeLayer(pb.polyline); } catch (_) {}
    pb.polyline = null;
  }
  _updateUI();
}

/* ────────────────────────────────────────
   SEEK (slider)
──────────────────────────────────────── */
export function seek(val) {
  if (!pb.route.length) return;
  pb.index = Math.min(parseInt(val, 10), pb.route.length - 1);
  const pt = pb.route[pb.index];
  if (pt) {
    pb.marker?.setLatLng(pt);
    pb.polyline?.setLatLngs(pb.route.slice(0, pb.index + 1));
  }
  _updateUI();
}

/* ────────────────────────────────────────
   INTERNAL
──────────────────────────────────────── */
function _run() {
  const map   = window._vectorMap;
  const route = pb.route;
  const spd   = parseInt(document.getElementById('pb-speed-sel')?.value || '1', 10);

  if (!route?.length || !map) return;

  if (pb.index >= route.length) pb.index = 0;
  const startPt = route[pb.index] || route[0];

  /* Create or reposition playback marker */
  const icon = window.L.divIcon({
    className:'', iconSize:[36,36], iconAnchor:[18,18],
    html:`<div style="width:36px;height:36px;border-radius:50%;
      background:rgba(0,229,255,.15);border:2px solid #00E5FF;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;box-shadow:0 0 16px rgba(0,229,255,.4)">▶</div>`,
  });

  if (!pb.marker) {
    pb.marker = window.L.marker(startPt, { icon, zIndexOffset:1000 }).addTo(map);
  } else {
    pb.marker.setLatLng(startPt);
    pb.marker.setIcon(icon);
  }

  /* Rebuild polyline from current index */
  if (pb.polyline) { try { map.removeLayer(pb.polyline); } catch (_) {} }
  const polylineCoords = route.slice(0, Math.max(1, pb.index + 1));
  if (polylineCoords && polylineCoords.length > 0) {
    pb.polyline = window.L.polyline(
      polylineCoords,
      { color:'#FF6B35', weight:3, opacity:0.8 }
    ).addTo(map);
  }

  _stopTimer();
  pb.timer = setInterval(() => {
    if (!pb.playing) { _stopTimer(); return; }
    const idx = pb.index;
    if (idx >= route.length - 1) {
      pb.playing = false;
      _stopTimer();
      _setPlayBtn('▶');
      showToast('info', '🎬 Playback complete!');
      /* Auto-hide playback marker after completion */
      setTimeout(() => clearPlayback(), 2000);
      return;
    }
    const pt = route[idx];
    if (pt && pb.marker && pb.polyline) {
      try {
        pb.marker.setLatLng(pt);
        pb.polyline.addLatLng(pt);
        map.panTo(pt, { animate:true, duration:0.3 });
      } catch (e) {
        console.warn('[playback] movement error:', e);
      }
    }
    pb.index = idx + 1;
    _updateUI();
  }, Math.max(80, 500 / spd));
}

function _stopTimer() {
  clearInterval(pb.timer);
  pb.timer = null;
}

function _setPlayBtn(text) {
  const btn = document.getElementById('pb-play-btn');
  if (btn) btn.textContent = text;
}

function _updateUI() {
  const route   = pb.route;
  const hasData = route.length > 1;
  const slider  = document.getElementById('pb-slider');
  const total   = document.getElementById('pb-total');
  const cur     = document.getElementById('pb-cur');
  const noData  = document.getElementById('pb-no-data');

  if (slider) {
    slider.max   = hasData ? route.length - 1 : 100;
    slider.value = pb.index;
  }
  if (total)  total.textContent = hasData ? `${route.length} pts` : '-- pts';
  if (noData) noData.style.display = hasData ? 'none' : 'block';

  const pct = hasData
    ? ((pb.index / Math.max(route.length - 1, 1)) * 100).toFixed(0) + '%'
    : '0%';
  if (cur) cur.textContent = pct;
}
