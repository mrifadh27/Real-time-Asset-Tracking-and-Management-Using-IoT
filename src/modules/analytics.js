/**
 * src/modules/analytics.js
 * All Chart.js charts: speed, activity, device-distance, mini-speed.
 */

import { S } from '../utils/state.js';
import { $ }  from '../utils/helpers.js';

const charts = {};

/* ────────────────────────────────────────
   INIT
──────────────────────────────────────── */
export function initCharts() {
  const dark    = document.documentElement.getAttribute('data-theme') === 'dark';
  const textCol = dark ? '#7A8FAD' : '#4A6080';
  const gridCol = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const Chart   = window.Chart;

  const base = (extra = {}) => ({
    responsive: true, maintainAspectRatio: false,
    animation:  { duration: 300 },
    plugins:    { legend: { display: false } },
    ...extra,
  });

  const axes = (yLabel = '') => ({
    x: { grid:{ color:gridCol }, ticks:{ color:textCol, maxTicksLimit:8 } },
    y: { grid:{ color:gridCol }, ticks:{ color:textCol }, min:0,
         title:{ display:!!yLabel, text:yLabel, color:textCol } },
  });

  charts.speed = new Chart($('speed-chart'), {
    type: 'line',
    data: { labels:[], datasets:[{
      label:'Speed km/h', data:[],
      borderColor:'#00E5FF', backgroundColor:'rgba(0,229,255,0.08)',
      borderWidth:2, fill:true, tension:0.4,
      pointRadius:2, pointBackgroundColor:'#00E5FF',
    }]},
    options: { ...base(), scales:axes('km/h') },
  });

  charts.activity = new Chart($('activity-chart'), {
    type: 'bar',
    data: {
      labels: Array.from({ length:12 }, (_, i) => `${-(11-i)}m`),
      datasets: [{
        data: Array(12).fill(0),
        backgroundColor:'rgba(0,229,255,0.35)',
        borderColor:'rgba(0,229,255,0.7)',
        borderWidth:1, borderRadius:4,
      }],
    },
    options: { ...base(), scales:axes() },
  });

  charts.deviceDist = new Chart($('device-dist-chart'), {
    type: 'bar',
    data: { labels:[], datasets:[{
      data:[],
      backgroundColor:[
        'rgba(0,229,255,0.5)','rgba(255,107,53,0.5)',
        'rgba(0,217,126,0.5)','rgba(255,184,0,0.5)','rgba(255,59,92,0.5)',
      ],
      borderRadius:6,
    }]},
    options: { ...base(), scales:axes('km') },
  });

  charts.miniSpeed = new Chart($('mini-speed-chart'), {
    type: 'line',
    data: { labels:[], datasets:[{
      data:[],
      borderColor:'#00E5FF', backgroundColor:'rgba(0,229,255,0.1)',
      borderWidth:1.5, fill:true, tension:0.4, pointRadius:0,
    }]},
    options: { ...base(), scales:{ x:{ display:false }, y:{ display:false, min:0 } } },
  });
}

/* ────────────────────────────────────────
   UPDATE ANALYTICS (full page)
──────────────────────────────────────── */
export function updateAnalytics() {
  const devs   = Object.values(S.devices);
  const histId = S.selectedId || Object.keys(S.history)[0];

  if (histId && S.history[histId] && charts.speed) {
    const h = S.history[histId];
    charts.speed.data.labels           = h.map((_, i) => i);
    charts.speed.data.datasets[0].data = h.map(x => x.speed.toFixed(1));
    charts.speed.update('none');
  }

  if (charts.deviceDist) {
    charts.deviceDist.data.labels           = devs.map(d => d.name.replace('Device ','Dev '));
    charts.deviceDist.data.datasets[0].data = devs.map(d => d.totalDist || 0);
    charts.deviceDist.update('none');
  }

  const totalDist = devs.reduce((s, d) => s + (d.totalDist || 0), 0);
  const maxSpd    = Math.max(...Object.values(S.maxSpeed).map(Number).filter(n => !isNaN(n)), 0);

  const e = id => document.getElementById(id);
  if (e('stat-distance')) e('stat-distance').textContent = totalDist.toFixed(2) + ' km';
  if (e('stat-maxspeed')) e('stat-maxspeed').textContent = maxSpd.toFixed(1);
  if (e('stat-alerts'))   e('stat-alerts').textContent   = S.totalAlerts || S.alerts.length;
  if (e('stat-devices'))  e('stat-devices').textContent  = devs.filter(d => d.status === 'online').length;
}

/* ────────────────────────────────────────
   ACTIVITY CHART (updates-per-minute)
──────────────────────────────────────── */
export function updateActivityChart() {
  if (!charts.activity) return;
  const buckets = Array(12).fill(0);
  const now     = Date.now();
  Object.values(S.history).forEach(hist => {
    hist.forEach(h => {
      const minAgo = Math.floor((now - h.ts) / 60_000);
      if (minAgo >= 0 && minAgo < 12) buckets[11 - minAgo]++;
    });
  });
  charts.activity.data.datasets[0].data = buckets;
  charts.activity.update('none');
}

/* ────────────────────────────────────────
   MINI SPEED CHART (right panel)
──────────────────────────────────────── */
export function updateMiniSpeed(deviceId) {
  if (!charts.miniSpeed) return;
  const h = S.history[deviceId];
  if (!h) return;
  charts.miniSpeed.data.labels           = h.map((_, i) => i);
  charts.miniSpeed.data.datasets[0].data = h.map(x => x.speed.toFixed(1));
  charts.miniSpeed.update('none');
}
