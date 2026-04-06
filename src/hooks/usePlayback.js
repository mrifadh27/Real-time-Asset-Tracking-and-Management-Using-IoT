/**
 * src/hooks/usePlayback.js
 * Route playback controller — encapsulates all playback state and logic.
 */

import { state, mapLayers } from '../utils/state.js';
import { showToast } from '../utils/toast.js';

export function usePlayback() {
  const pb = state.playback;

  function _getSpeed() {
    return parseInt(document.getElementById('pb-speed-sel')?.value ?? '1', 10) || 1;
  }

  function _updateUI() {
    const route = pb.route;
    const pct   = ((pb.index / Math.max(route.length - 1, 1)) * 100).toFixed(0);

    const slider = document.getElementById('pb-slider');
    const cur    = document.getElementById('pb-cur');
    if (slider) slider.value  = pb.index;
    if (cur)    cur.textContent = pct + '%';
  }

  function _stopTimer() {
    if (pb.timer) { clearInterval(pb.timer); pb.timer = null; }
  }

  function _startTimer() {
    _stopTimer();
    const route = pb.route;
    if (!route.length) { showToast('warning', '⚠️ Select a device with route history first'); return; }

    const map = window._nextrackMap;

    // Create or reposition playback marker
    const markerHtml = `
      <div style="width:36px;height:36px;border-radius:50%;
        background:rgba(0,229,255,.15);border:2px solid #00E5FF;
        display:flex;align-items:center;justify-content:center;
        font-size:18px;box-shadow:0 0 16px rgba(0,229,255,.4)">▶</div>`;

    const icon = L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 18], html: markerHtml });

    if (!pb.marker) {
      pb.marker = L.marker(route[0], { icon }).addTo(map);
    } else {
      pb.marker.setLatLng(route[pb.index] ?? route[0]);
      pb.marker.setIcon(icon);
    }

    // Playback polyline
    if (pb.polyline) { try { map.removeLayer(pb.polyline); } catch (_) {} }
    pb.polyline = L.polyline(route.slice(0, pb.index + 1), {
      color: '#FF6B35', weight: 3, opacity: 0.8,
    }).addTo(map);

    pb.timer = setInterval(() => {
      if (!pb.playing) { _stopTimer(); return; }

      const idx = pb.index;
      if (idx >= route.length - 1) {
        pb.playing = false;
        _stopTimer();
        document.getElementById('pb-play').textContent = '▶';
        showToast('info', '🎬 Playback finished');
        return;
      }

      pb.marker.setLatLng(route[idx]);
      pb.polyline.addLatLng(route[idx]);
      map.panTo(route[idx], { animate: true, duration: 0.3 });
      pb.index = idx + 1;
      _updateUI();
    }, Math.max(80, 500 / _getSpeed()));
  }

  return {
    /** Toggle play / pause. */
    toggle() {
      pb.playing = !pb.playing;
      const btn  = document.getElementById('pb-play');
      if (btn) btn.textContent = pb.playing ? '⏸' : '▶';
      if (pb.playing) _startTimer();
      else            _stopTimer();
    },

    /** Speed dropdown changed — restart timer if playing. */
    onSpeedChange() {
      if (pb.playing) {
        _stopTimer();
        _startTimer();
      }
    },

    /** Rewind to beginning. */
    rewind() {
      pb.playing = false;
      pb.index   = 0;
      _stopTimer();
      const btn = document.getElementById('pb-play');
      if (btn) btn.textContent = '▶';
      _updateUI();

      if (pb.polyline) {
        try { window._nextrackMap?.removeLayer(pb.polyline); } catch (_) {}
        pb.polyline = null;
      }
      if (pb.marker && pb.route[0]) pb.marker.setLatLng(pb.route[0]);
    },

    /**
     * Seek to a position.
     * @param {number|string} val
     */
    seek(val) {
      const map   = window._nextrackMap;
      const route = pb.route;
      if (!route.length) return;

      pb.index = Math.min(parseInt(val, 10), route.length - 1);

      if (pb.marker)   pb.marker.setLatLng(route[pb.index]);
      if (pb.polyline) pb.polyline.setLatLngs(route.slice(0, pb.index + 1));
      _updateUI();
    },

    /**
     * Load a new route into the playback controller.
     * @param {string} deviceId
     */
    loadRoute(deviceId) {
      const pts = mapLayers.routePts[deviceId];
      if (pts?.length > 1) {
        pb.route = [...pts];
        pb.index = 0;

        const slider = document.getElementById('pb-slider');
        const total  = document.getElementById('pb-total');
        const cur    = document.getElementById('pb-cur');
        if (slider) { slider.max = pb.route.length - 1; slider.value = 0; }
        if (total)  total.textContent  = pb.route.length + ' pts';
        if (cur)    cur.textContent    = '0%';
      }
    },
  };
}
