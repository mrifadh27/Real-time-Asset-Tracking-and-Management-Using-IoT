/**
 * src/ui/pages.js
 * HTML templates for Dashboard, Analytics, Alerts, and Settings pages.
 * Returns strings — injected into the DOM by main.js during layout build.
 */

/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */
export function dashboardHTML() {
  return `
  <div class="offline-banner" id="offline-banner">⚠️ Device offline — last known position shown.</div>
  <div class="cached-banner"  id="cached-banner">📍 GPS signal lost — showing cached position. IMU data still live.</div>
  <div class="offline-sync-bar" id="offline-sync-bar">🔄 Syncing offline data to server…</div>

  <div class="dash-split">

    <!-- MAP COLUMN -->
    <div class="map-wrap">
      <div id="map"></div>

      <!-- Map control buttons (top-left) -->
      <div class="map-ctrls">
        <button class="map-btn" id="btn-fit-all">🔍 Fit All</button>
        <button class="map-btn" id="geofence-btn">📐 Set Geofence</button>
        <button class="map-btn" id="btn-clear-route"
          style="display:none;color:var(--danger)">✕ Clear Route</button>
      </div>

      <!-- Professional map search (top-right) -->
      <div class="map-search-wrap">
        <input
          type="text"
          id="map-search-input"
          class="map-search-input"
          placeholder="🔍 Search any location…"
          autocomplete="off"
          spellcheck="false"
          aria-label="Search location"
          aria-autocomplete="list"
          aria-expanded="false"
        />
        <button class="map-search-clear" id="map-search-clear" aria-label="Clear">✕</button>
        <div class="map-search-results" id="map-search-results" role="listbox"></div>
      </div>

      <!-- Geofence info box (bottom-left) -->
      <div class="geofence-info" id="geofence-info"></div>
      <!-- Draw-mode hint (bottom-right) -->
      <div class="draw-hint" id="draw-hint"></div>
    </div>

    <!-- RIGHT PANEL -->
    <div class="right-panel">

      <!-- Active Device -->
      <div class="panel-sec">
        <div class="sec-head">📡 Active Device</div>
        <div class="dev-status-card">
          <div class="dev-status-hdr">
            <div class="active-device-name" id="active-name">Select a device</div>
            <div class="status-badge offline" id="active-status">OFFLINE</div>
          </div>
          <div class="coord-row"><span>Latitude</span>   <span class="coord-val" id="active-lat">--</span></div>
          <div class="coord-row"><span>Longitude</span>  <span class="coord-val" id="active-lng">--</span></div>
          <div class="coord-row"><span>Altitude</span>   <span class="coord-val" id="active-alt">-- m</span></div>
          <div class="coord-row"><span>Heading</span>    <span class="coord-val" id="active-hdg">-- °</span></div>
          <div class="coord-row"><span>HDOP</span>       <span class="coord-val" id="active-hdop">--</span></div>
          <div class="coord-row"><span>IMU Accel</span>  <span class="coord-val" id="active-accel">--</span></div>
          <div class="coord-row"><span>Pitch / Roll</span><span class="coord-val" id="active-tilt">--</span></div>
          <!-- Geofence status row -->
          <div class="gf-status-row">
            <span>Geofence</span>
            <span class="gf-indicator not-set" id="active-gf-indicator">— Not configured</span>
          </div>
        </div>
      </div>

      <!-- Live Metrics -->
      <div class="panel-sec">
        <div class="sec-head">⚡ Live Metrics</div>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="m-label">Speed</div>
            <div class="m-val" id="m-speed">0<span class="unit">km/h</span></div>
            <div class="m-change neutral" id="m-speed-ch">--</div>
          </div>
          <div class="metric-card">
            <div class="m-label">Distance</div>
            <div class="m-val" id="m-dist">0<span class="unit">km</span></div>
            <div class="m-change neutral">Session</div>
          </div>
          <div class="metric-card">
            <div class="m-label">Trip Time</div>
            <div class="m-val" id="m-time">0<span class="unit">min</span></div>
            <div class="m-change neutral">Since start</div>
          </div>
          <div class="metric-card">
            <div class="m-label">Satellites</div>
            <div class="m-val" id="m-sats">0</div>
            <div class="m-change neutral" id="m-gps-mode">--</div>
          </div>
        </div>
      </div>

      <!-- Route to Destination -->
      <div class="panel-sec">
        <div class="sec-head">🧭 Route to Destination</div>
        <div class="route-panel">
          <div class="dest-search-wrap">
            <input type="text" class="dest-input" id="dest-input"
              placeholder="Search destination…" autocomplete="off"
              aria-label="Destination search" />
            <div class="dest-suggestions" id="dest-suggestions" role="listbox"></div>
          </div>
          <div class="route-meta" id="route-meta" style="display:none">
            <span>📏 <b id="route-dist-val">--</b> km</span>
            <span>⏱ <b id="route-eta-val">--</b> min</span>
            <span id="route-progress-badge" style="display:none">
              ✅ <b id="route-pct-val">0</b>% done
            </span>
          </div>
          <div class="route-btn-row">
            <button class="route-btn"  id="btn-get-route">▶ Get Route</button>
            <button class="route-btn danger-btn" id="clear-route-btn"
              style="display:none">✕ Clear</button>
          </div>
        </div>
      </div>

      <!-- Speed Timeline -->
      <div class="panel-sec">
        <div class="sec-head">📈 Speed Timeline</div>
        <div class="mini-chart-wrap"><canvas id="mini-speed-chart"></canvas></div>
      </div>

      <!-- Route Playback -->
      <div class="panel-sec">
        <div class="sec-head">🎬 Route Playback</div>
        <div class="playback-wrap">
          <div class="pb-bar">
            <button class="pb-btn" id="pb-rewind" title="Rewind">⏮</button>
            <button class="pb-btn" id="pb-play-btn" title="Play / Pause">▶</button>
            <input type="range" class="pb-slider" id="pb-slider"
              min="0" max="100" value="0" />
            <select class="pb-speed" id="pb-speed-sel">
              <option value="1">1×</option>
              <option value="2">2×</option>
              <option value="5">5×</option>
              <option value="10">10×</option>
            </select>
            <button class="pb-btn" id="pb-clear-btn" title="Hide Playback Arrow">✕</button>
          </div>
          <div class="pb-info">
            <span id="pb-cur">0%</span>
            <span id="pb-total">-- pts</span>
          </div>
          <div class="pb-no-data" id="pb-no-data">
            No route data yet — device must move to record a path.
          </div>
        </div>
      </div>

    </div><!-- /right-panel -->
  </div><!-- /dash-split -->
  `;
}

/* ══════════════════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════════════════ */
export function analyticsHTML() {
  return `
  <div class="analytics-pg">
    <div class="stats-row">
      <div class="stat-card accent">
        <div class="stat-icon">📍</div>
        <div class="stat-number" id="stat-devices">0</div>
        <div class="stat-label">Active Devices</div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">🛣️</div>
        <div class="stat-number" id="stat-distance">0 km</div>
        <div class="stat-label">Total Distance Today</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon">⚡</div>
        <div class="stat-number" id="stat-maxspeed">0</div>
        <div class="stat-label">Max Speed (km/h)</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-icon">🔔</div>
        <div class="stat-number" id="stat-alerts">0</div>
        <div class="stat-label">Alerts Today</div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-hdr">
        <div>
          <div class="chart-title">Speed Over Time</div>
          <div class="chart-sub">km/h — last 20 readings</div>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="speed-chart"></canvas></div>
    </div>

    <div class="chart-card">
      <div class="chart-hdr">
        <div>
          <div class="chart-title">Movement Activity</div>
          <div class="chart-sub">Updates per minute (last 12 min)</div>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="activity-chart"></canvas></div>
    </div>

    <div class="chart-card full">
      <div class="chart-hdr">
        <div>
          <div class="chart-title">Distance Per Device</div>
          <div class="chart-sub">Total km traveled this session</div>
        </div>
      </div>
      <div class="chart-wrap"><canvas id="device-dist-chart"></canvas></div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════
   ALERTS
══════════════════════════════════════════════════════════ */
export function alertsHTML() {
  /* Each button has data-filter and a .filter-count badge */
  const filters = [
    { key:'all',      label:'All' },
    { key:'offline',  label:'Offline / Online' },
    { key:'geofence', label:'Geofence' },
    { key:'speed',    label:'Speed' },
    { key:'crash',    label:'Crash' },
    { key:'sync',     label:'Sync' },
  ];

  const icons = {
    offline:'⚫', geofence:'🔵', speed:'🟠', crash:'🔴', sync:'🟢',
  };

  const btns = filters.map(f => `
    <button class="filter-btn${f.key === 'all' ? ' active' : ''}" data-filter="${f.key}">
      ${icons[f.key] ? icons[f.key] + ' ' : ''}${f.label}
      <span class="filter-count" id="fc-${f.key}">0</span>
    </button>`).join('');

  return `
  <div class="alerts-pg">
    <div class="alert-toolbar">
      <div class="alert-filters" id="alert-filters">${btns}</div>
      <div class="alert-actions">
        <button class="alert-action-btn" id="btn-mark-read" title="Mark all as read">✓ Mark Read</button>
        <button class="alert-action-btn danger" id="btn-clear-alerts" title="Clear all alerts">🗑 Clear All</button>
      </div>
    </div>
    <div class="alert-list" id="alert-list">
      <div class="empty-state">
        <div class="icon">✅</div>
        <p>No alerts yet. System monitoring active.</p>
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════════════ */
export function settingsHTML() {
  return `
  <div class="settings-pg">

    <!-- Per-Device Geofence -->
    <div class="settings-sec">
      <div class="settings-sec-hdr">📐 Per-Device Geofence</div>
      <div class="gf-note">
        ⚠️ Geofence alerts only fire after you draw on the map or click
        <b>Save Geofences</b>. The badge shows each device's configuration status.
      </div>
      <div style="padding:12px 16px 0">
        <table class="gf-device-table">
          <thead>
            <tr>
              <th>Device</th><th>Lat</th><th>Lng</th><th>Radius (m)</th><th>Active</th>
            </tr>
          </thead>
          <tbody id="gf-table-body">
            <tr>
              <td colspan="5"
                style="text-align:center;color:var(--t3);font-size:12px;padding:16px">
                No devices detected yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="padding:12px 16px 16px">
        <button class="btn-save" id="btn-save-geofences"
          style="font-size:13px;padding:9px 24px">💾 Save Geofences</button>
      </div>
    </div>

    <!-- Alert Thresholds -->
    <div class="settings-sec">
      <div class="settings-sec-hdr">🚨 Alert Thresholds</div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Offline Timeout (s)</div>
          <div class="settings-desc">Seconds before marking device offline</div>
        </div>
        <input type="number" class="settings-input" id="s-offline-t"
          value="30" min="5" max="300"/>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Overspeed Threshold (km/h)</div>
          <div class="settings-desc">Alert when speed exceeds this value</div>
        </div>
        <input type="number" class="settings-input" id="s-speed-t"
          value="120" min="10" max="300"/>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Crash Threshold (g-force)</div>
          <div class="settings-desc">MPU6050 impact detection sensitivity</div>
        </div>
        <input type="number" class="settings-input" id="s-crash-t"
          value="2.0" min="0.5" max="10" step="0.1"/>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Geofence Alert Cooldown (s)</div>
          <div class="settings-desc">Minimum seconds between geofence alerts</div>
        </div>
        <input type="number" class="settings-input" id="s-gf-cooldown"
          value="60" min="10" max="600"/>
      </div>
    </div>

    <!-- Offline Mode -->
    <div class="settings-sec">
      <div class="settings-sec-hdr">📴 Offline Mode</div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Offline Mode</div>
          <div class="settings-desc">Auto-buffer when GPS signal is lost</div>
        </div>
        <div class="toggle on" id="s-offline-toggle"></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Queued Offline Records</div>
          <div class="settings-desc">Data buffered since last connection</div>
        </div>
        <span style="font-family:var(--font-mono);font-size:13px;color:var(--warning)"
              id="offline-queue-count">0 records</span>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Auto-Sync on Reconnect</div>
          <div class="settings-desc">Push offline data when connection restores</div>
        </div>
        <div class="toggle on" id="s-autosync-toggle"></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Max Offline Buffer</div>
          <div class="settings-desc">Max records stored per device</div>
        </div>
        <input type="number" class="settings-input" id="s-offline-buf"
          value="200" min="50" max="1000"/>
      </div>
    </div>

    <!-- Display -->
    <div class="settings-sec">
      <div class="settings-sec-hdr">📊 Display</div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Dark Mode</div>
          <div class="settings-desc">Toggle between light and dark theme</div>
        </div>
        <div class="toggle on" id="s-theme-toggle"></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Show Route Trail</div>
          <div class="settings-desc">Draw movement trail on map</div>
        </div>
        <div class="toggle on" id="s-trail-toggle"></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">App Version</div>
          <div class="settings-desc">VECTOR — Real-Time Intelligent Asset Tracking</div>
        </div>
        <span style="font-family:var(--font-mono);font-size:12px;color:var(--t3)">v1.0.0</span>
      </div>
    </div>

    <div style="text-align:center">
      <button class="btn-save" id="btn-save-settings">💾 Save Settings</button>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════
   FULL APP SHELL  (injected into #app by main.js)
══════════════════════════════════════════════════════════ */
export function appShellHTML() {
  return `
  <div class="layout">

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <div class="logo">
        <img src="/assets/vector-logo-icon.png" alt="VECTOR" class="logo-mark" />
        <div>
          <div class="brand">VECTOR</div>
          <div class="brand-ver">S y s t e m</div>
        </div>
      </div>

      <div class="sec-label">Navigation</div>
      <div class="nav-item active" id="nav-dashboard" data-page="dashboard">
        <span class="nav-icon">🗺️</span> Live Map
      </div>
      <div class="nav-item" id="nav-analytics" data-page="analytics">
        <span class="nav-icon">📊</span> Analytics
      </div>
      <div class="nav-item" id="nav-alerts" data-page="alerts">
        <span class="nav-icon">🔔</span> Alerts
        <span class="nav-badge" id="alert-badge" style="display:none">0</span>
      </div>
      <div class="nav-item" id="nav-settings" data-page="settings">
        <span class="nav-icon">⚙️</span> Settings
      </div>

      <div class="sec-label">Devices</div>
      <div class="device-list" id="device-list">
        <div class="empty-state" style="padding:24px 12px">
          <div class="icon" style="font-size:24px">📡</div>
          <p style="font-size:11px;text-align:center">Waiting for devices…</p>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="user-row">
          <img src="/assets/avatar-img-icon.png" alt="VECTOR" class="avatar-img" />
          <div class="user-email" id="last-sync">⏱ --:--:--</div>
        </div>
      </div>
    </aside>

    <!-- MAIN -->
    <div class="main">

      <!-- TOPBAR -->
      <div class="topbar">
        <div>
          <div class="tb-title" id="tb-title">Live Map</div>
          <div class="tb-sub"   id="tb-sub">Vehicle Embedded Communication Tracking Optimization & Reporting System</div>
        </div>
        <div class="tb-space"></div>
        <div class="offline-store-pill" id="offline-store-pill">
          💾 <span id="offline-store-count">0</span> queued
        </div>
        <div class="status-pill">
          <div class="dot" id="fb-dot"></div>
          <span id="fb-status">Connecting…</span>
        </div>
        <button class="theme-btn" id="btn-theme">🌓 Theme</button>
      </div>

      <!-- PAGES -->
      <section class="page active" id="page-dashboard"></section>
      <section class="page"        id="page-analytics"></section>
      <section class="page"        id="page-alerts"></section>
      <section class="page"        id="page-settings"></section>

    </div><!-- /main -->
  </div><!-- /layout -->
  `;
}
