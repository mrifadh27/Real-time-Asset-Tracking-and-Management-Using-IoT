/**
 * src/components/Charts.js
 * Manages all Chart.js instances: speed, activity, device-distance, mini-speed.
 */

import { state } from '../utils/state.js';

/** @type {{ speed: Chart, activity: Chart, deviceDist: Chart, miniSpeed: Chart }} */
const charts = {};

export const Charts = {
  /** Initialise all charts. Must be called after canvas elements are in the DOM. */
  init() {
    const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
    const textCol = isDark ? '#7A8FAD' : '#4A6080';
    const gridCol = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';

    const commonOpts = (extra = {}) => ({
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 300 },
      plugins:             { legend: { display: false } },
      ...extra,
    });

    const axes = (yLabel = '') => ({
      x: {
        grid:  { color: gridCol },
        ticks: { color: textCol, maxTicksLimit: 8 },
      },
      y: {
        grid:  { color: gridCol },
        ticks: { color: textCol },
        min:   0,
        title: { display: !!yLabel, text: yLabel, color: textCol },
      },
    });

    charts.speed = new Chart(document.getElementById('speed-chart'), {
      type: 'line',
      data: {
        labels:   [],
        datasets: [{
          label:           'Speed km/h',
          data:            [],
          borderColor:     '#00E5FF',
          backgroundColor: 'rgba(0,229,255,0.08)',
          borderWidth:     2,
          fill:            true,
          tension:         0.4,
          pointRadius:     2,
          pointBackgroundColor: '#00E5FF',
        }],
      },
      options: { ...commonOpts(), scales: axes('km/h') },
    });

    charts.activity = new Chart(document.getElementById('activity-chart'), {
      type: 'bar',
      data: {
        labels:   Array.from({ length: 12 }, (_, i) => `${-(11 - i)}m`),
        datasets: [{
          data:            Array(12).fill(0),
          backgroundColor: 'rgba(0,229,255,0.35)',
          borderColor:     'rgba(0,229,255,0.7)',
          borderWidth:     1,
          borderRadius:    4,
        }],
      },
      options: { ...commonOpts(), scales: axes() },
    });

    charts.deviceDist = new Chart(document.getElementById('device-dist-chart'), {
      type: 'bar',
      data: {
        labels:   [],
        datasets: [{
          data:            [],
          backgroundColor: [
            'rgba(0,229,255,0.5)', 'rgba(255,107,53,0.5)',
            'rgba(0,217,126,0.5)', 'rgba(255,184,0,0.5)', 'rgba(255,59,92,0.5)',
          ],
          borderRadius: 6,
        }],
      },
      options: { ...commonOpts(), scales: axes('km') },
    });

    charts.miniSpeed = new Chart(document.getElementById('mini-speed-chart'), {
      type: 'line',
      data: {
        labels:   [],
        datasets: [{
          data:            [],
          borderColor:     '#00E5FF',
          backgroundColor: 'rgba(0,229,255,0.1)',
          borderWidth:     1.5,
          fill:            true,
          tension:         0.4,
          pointRadius:     0,
        }],
      },
      options: {
        ...commonOpts(),
        scales: { x: { display: false }, y: { display: false, min: 0 } },
      },
    });
  },

  /** Update the speed & device-distance analytics charts. */
  updateAnalytics() {
    const devs   = Object.values(state.devices);
    const histId = state.selectedId ?? Object.keys(state.history)[0];

    if (histId && state.history[histId]) {
      const h = state.history[histId];
      charts.speed.data.labels           = h.map((_, i) => i);
      charts.speed.data.datasets[0].data = h.map(x => x.speed.toFixed(1));
      charts.speed.update('none');
    }

    charts.deviceDist.data.labels           = devs.map(d => d.name.replace('Device ', 'Dev '));
    charts.deviceDist.data.datasets[0].data = devs.map(d => d.totalDist ?? 0);
    charts.deviceDist.update('none');
  },

  /** Update the activity (updates-per-minute) chart. */
  updateActivity() {
    const buckets = Array(12).fill(0);
    const now     = Date.now();

    Object.values(state.history).forEach(hist => {
      hist.forEach(h => {
        const minAgo = Math.floor((now - h.ts) / 60_000);
        if (minAgo >= 0 && minAgo < 12) buckets[11 - minAgo]++;
      });
    });

    charts.activity.data.datasets[0].data = buckets;
    charts.activity.update('none');
  },

  /**
   * Update the mini speed chart in the right panel.
   * @param {string} deviceId
   */
  updateMiniSpeed(deviceId) {
    const h = state.history[deviceId];
    if (!h) return;
    charts.miniSpeed.data.labels           = h.map((_, i) => i);
    charts.miniSpeed.data.datasets[0].data = h.map(x => x.speed.toFixed(1));
    charts.miniSpeed.update('none');
  },
};
