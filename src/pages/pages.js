/**
 * src/pages/DashboardPage.js
 * Returns the HTML string for the dashboard page (right panel + map container).
 */

export function renderDashboardPage() {
  return `
  <div class="offline-banner" id="offline-banner">⚠️ Device offline — last known position shown.</div>
  <div class="cached-banner"  id="cached-banner">📍 GPS signal lost — showing cached position. IMU data still live.</div>
  <div class="offline-sync-bar" id="offline-sync-bar">🔄 Syncing offline data to server…</div>

  <div class="dash-split">
    <!-- MAP injected by MapView.render() -->
    <div id="map-mount"></div>

    <!-- RIGHT PANEL -->
    <div class="right-panel">

      <!-- Active Device -->
      <div class="panel-sec">
        <div class="sec-head">📡 Active Device</div>
        <div class="dev-status-card" id="active-card">
          <div class="dev-status-hdr">
            <div class="active-device-name" id="active-name">Select a device</div>
            <div class="status-badge offline" id="active-status">OFFLINE</div>
          </div>
          <div class="coord-row"><span>Latitude</span>  <span class="coord-val" id="active-lat">--</span></div>
          <div class="coord-row"><span>Longitude</span> <span class="coord-val" id="active-lng">--</span></div>
          <div class="coord-row"><span>Altitude</span>  <span class="coord-val" id="active-alt">-- m</span></div>
          <div class="coord-row"><span>Heading</span>   <span class="coord-val" id="active-hdg">-- °</span></div>
          <div class="coord-row"><span>HDOP</span>      <span class="coord-val" id="active-hdop">--</span></div>
          <div class="coord-row"><span>IMU Accel</span> <span class="coord-val" id="active-accel">--</span></div>
          <div class="coord-row"><span>Pitch / Roll</span><span class="coord-val" id="active-tilt">--</span></div>
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
      <div class="panel-sec" id="route-section">
        <div class="sec-head">🧭 Route to Destination</div>
        <div class="route-panel">
          <div class="dest-search-wrap">
            <input type="text" class="dest-input" id="dest-input"
              placeholder="Search destination…" autocomplete="off"
              aria-label="Destination search" aria-autocomplete="list" />
            <div class="dest-suggestions" id="dest-suggestions" role="listbox"></div>
          </div>
          <div class="route-meta" id="route-meta" style="display:none">
            <span>📏 <b id="route-dist-val">--</b> km</span>
            <span>⏱ <b id="route-eta-val">--</b> min</span>
            <span id="route-progress-badge" style="display:none">✅ <b id="route-pct-val">0</b>% done</span>
          </div>
          <div class="route-btn-row">
            <button class="route-btn"  id="btn-get-route">▶ Get Route</button>
            <button class="route-btn danger-btn" id="btn-clear-route-panel"
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
      <div class="panel-sec" id="playback-panel">
        <div class="sec-head">🎬 Route Playback</div>
        <div class="playback-wrap">
          <div class="pb-bar">
            <button class="pb-btn" id="pb-rewind" title="Rewind">⏮</button>
            <button class="pb-btn" id="pb-play"   title="Play/Pause">▶</button>
            <input  type="range" class="pb-slider" id="pb-slider" min="0" max="100" value="0" />
            <select class="pb-speed" id="pb-speed-sel">
              <option value="1">1×</option>
              <option value="2">2×</option>
              <option value="5">5×</option>
              <option value="10">10×</option>
            </select>
          </div>
          <div class="pb-info">
            <span id="pb-cur">0%</span>
            <span id="pb-total">-- pts</span>
          </div>
        </div>
      </div>

    </div><!-- /right-panel -->
  </div><!-- /dash-split -->
  `;
}

/**
 * src/pages/AnalyticsPage.js
 */
export function renderAnalyticsPage() {
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

/**
 * src/pages/AlertsPage.js
 */
export function renderAlertsPage() {
  return `
  <div class="alerts-pg">
    <div class="alert-filters">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="offline">⚫ Offline</button>
      <button class="filter-btn" data-filter="geofence">🔵 Geofence</button>
      <button class="filter-btn" data-filter="speed">🟠 Overspeed</button>
      <button class="filter-btn" data-filter="sync">🟢 Sync</button>
    </div>
    <div class="alert-list" id="alert-list">
      <div class="empty-state">
        <div class="icon">✅</div>
        <p>No alerts yet. System monitoring active.</p>
      </div>
    </div>
  </div>`;
}

/**
 * src/pages/SettingsPage.js
 */
export function renderSettingsPage() {
  return `
  <div class="settings-pg">

    <!-- Per-Device Geofence -->
    <div class="settings-sec">
      <div class="settings-sec-hdr">📐 Per-Device Geofence</div>
      <div id="gf-device-rows" style="padding:12px 16px 0">
        <p style="font-size:12px;color:var(--t3);padding-bottom:12px">
          Each device can have its own geofence.
          Click <b>📐</b> next to a device or edit coordinates below.
        </p>
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
        <input type="number" class="settings-input" id="s-offline-t" value="30" min="5" max="300"/>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Overspeed Threshold (km/h)</div>
          <div class="settings-desc">Alert when speed exceeds this value</div>
        </div>
        <input type="number" class="settings-input" id="s-speed-t" value="120" min="10" max="300"/>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Geofence Alert Cooldown (s)</div>
          <div class="settings-desc">Minimum seconds between geofence alerts</div>
        </div>
        <input type="number" class="settings-input" id="s-gf-cooldown" value="60" min="10" max="600"/>
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
          <div class="settings-desc">Max records stored offline per device</div>
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
          <div class="settings-desc">NexTrack Platform</div>
        </div>
        <span style="font-family:var(--font-mono);font-size:12px;color:var(--t3)">v5.0.0</span>
      </div>
    </div>

    <div style="text-align:center">
      <button class="btn-save" id="btn-save-settings">💾 Save Settings</button>
    </div>
  </div>`;
}
