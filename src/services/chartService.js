/**
 * src/services/chartService.js
 * Manages all Chart.js instances for analytics and mini-charts.
 */

import { state } from '../utils/state.js';

/** @type {Chart} */
let speedChart      = null;
/** @type {Chart} */
let activityChart   = null;
/** @type {Chart} */
let deviceDistChart = null;
/** @type {Chart} */
let miniSpeedChart  = null;

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function textCol()  { return isDark() ? '#7A8FAD' : '#4A6080'; }
function gridCol()  { return isDark() ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'; }

const baseOptions = (extra = {}) => ({
  responsive:          true,
  maintainAspectRatio: false,
  animation:           { duration: 300 },
  plugins:             { legend: { display: false } },
  ...extra,
});

const axes = (yLabel = '') => ({
  x: { grid: { color: gridCol() }, ticks: { color: textCol(), maxTicksLimit: 8 } },
  y: {
    grid:  { color: gridCol() },
    ticks: { color: textCol() },
    min:   0,
    title: { display: !!yLabel, text: yLabel, color: textCol() },
  },
});

/** Initialise all charts. Call once on DOMContentLoaded. */
export function initCharts() {
  speedChart = new Chart(document.getElementById('speed-chart'), {
    type: 'line',
    data: {
      labels: [],
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
    options: { ...baseOptions(), scales: axes('km/h') },
  });

  activityChart = new Chart(document.getElementById('activity-chart'), {
    type: 'bar',
    data: {
      labels: Array.from({ length: 12 }, (_, i) => `${-(11 - i)}m`),
      datasets: [{
        data:            Array(12).fill(0),
        backgroundColor: 'rgba(0,229,255,0.35)',
        borderColor:     'rgba(0,229,255,0.7)',
        borderWidth:     1,
        borderRadius:    4,
      }],
    },
    options: { ...baseOptions(), scales: axes() },
  });

  deviceDistChart = new Chart(document.getElementById('device-dist-chart'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        data:            [],
        backgroundColor: [
          'rgba(0,229,255,0.5)', 'rgba(255,107,53,0.5)',
          'rgba(0,217,126,0.5)', 'rgba(255,184,0,0.5)',
          'rgba(255,59,92,0.5)',
        ],
        borderRadius: 6,
      }],
    },
    options: { ...baseOptions(), scales: axes('km') },
  });

  miniSpeedChart = new Chart(document.getElementById('mini-speed-chart'), {
    type: 'line',
    data: {
      labels: [],
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
      ...baseOptions(),
      scales: { x: { display: false }, y: { display: false, min: 0 } },
    },
  });
}

/** Update the full analytics charts. */
export function updateAnalyticsCharts() {
  const devs   = Object.values(state.devices);
  const histId = state.selectedId || Object.keys(state.history)[0];

  // Speed over time
  if (histId && state.history[histId]) {
    const h = state.history[histId];
    speedChart.data.labels           = h.map((_, i) => i);
    speedChart.data.datasets[0].data = h.map(x => x.speed.toFixed(1));
    speedChart.update('none');
  }

  // Distance per device
  deviceDistChart.data.labels           = devs.map(d => d.name.replace('Device ', 'Dev '));
  deviceDistChart.data.datasets[0].data = devs.map(d => d.totalDist || 0);
  deviceDistChart.update('none');
}

/** Update the activity (updates-per-minute) bar chart. */
export function updateActivityChart() {
  const buckets = Array(12).fill(0);
  const now     = Date.now();

  Object.values(state.history).forEach(hist => {
    hist.forEach(h => {
      const minAgo = Math.floor((now - h.ts) / 60_000);
      if (minAgo >= 0 && minAgo < 12) buckets[11 - minAgo]++;
    });
  });

  activityChart.data.datasets[0].data = buckets;
  activityChart.update('none');
}

/** Update the mini speed sparkline in the device panel. */
export function updateMiniSpeedChart() {
  const h = state.history[state.selectedId];
  if (!h) return;

  miniSpeedChart.data.labels           = h.map((_, i) => i);
  miniSpeedChart.data.datasets[0].data = h.map(x => x.speed.toFixed(1));
  miniSpeedChart.update('none');
}
