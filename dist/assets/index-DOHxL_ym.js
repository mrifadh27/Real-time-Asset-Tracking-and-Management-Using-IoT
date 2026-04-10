(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const o of a)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&n(l)}).observe(document,{childList:!0,subtree:!0});function s(a){const o={};return a.integrity&&(o.integrity=a.integrity),a.referrerPolicy&&(o.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?o.credentials="include":a.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(a){if(a.ep)return;a.ep=!0;const o=s(a);fetch(a.href,o)}})();function Pe(){return`
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
  `}function Ne(){return`
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
  </div>`}function Re(){const e=[{key:"all",label:"All"},{key:"offline",label:"Offline / Online"},{key:"geofence",label:"Geofence"},{key:"speed",label:"Speed"},{key:"crash",label:"Crash"},{key:"sync",label:"Sync"}],t={offline:"⚫",geofence:"🔵",speed:"🟠",crash:"🔴",sync:"🟢"};return`
  <div class="alerts-pg">
    <div class="alert-filters" id="alert-filters">${e.map(n=>`
    <button class="filter-btn${n.key==="all"?" active":""}" data-filter="${n.key}">
      ${t[n.key]?t[n.key]+" ":""}${n.label}
      <span class="filter-count" id="fc-${n.key}">0</span>
    </button>`).join("")}</div>
    <div class="alert-list" id="alert-list">
      <div class="empty-state">
        <div class="icon">✅</div>
        <p>No alerts yet. System monitoring active.</p>
      </div>
    </div>
  </div>`}function Ge(){return`
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
  </div>`}function ze(){return`
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
  `}const He={apiKey:"AIzaSyAZiSKitF5KYCam6Lzmdc4pPlczLUQmQ_A",authDomain:"realtime-asset-tracking-e00df.firebaseapp.com",databaseURL:"https://realtime-asset-tracking-e00df-default-rtdb.asia-southeast1.firebasedatabase.app/",projectId:"realtime-asset-tracking-e00df"};var ye;(ye=window.firebase.apps)!=null&&ye.length||window.firebase.initializeApp(He);const H=window.firebase.database();function fe(e,t,s){const n=H.ref(e);return n.on("value",t,s||console.error),()=>n.off("value",t)}function je(e,t){return H.ref(e).push(t).catch(s=>console.warn("[FB push]",s))}function Ue(e,t){return H.ref(e).update(t).catch(s=>console.warn("[FB batch]",s))}const i={devices:{},selectedId:null,history:{},prevStatus:{},offlineAlertSent:{},onlineAlertSent:{},lastStatusTransition:{},geofenceExitTracker:{},overspeedTracker:{},crashTracker:{},localAlerts:[],firebaseAlerts:[],alerts:[],alertFilter:"all",alertUnread:0,totalAlerts:0,geofences:{},settings:{offlineTimeout:90,speedThreshold:120,crashThreshold:2,gfCooldown:60,showTrail:!0,offlineEnabled:!0,autoSync:!0,offlineBuffer:200},playback:{playing:!1,index:0,route:[],marker:null,polyline:null,timer:null},navRoute:{destLat:null,destLng:null,destName:"",line:null,lineFull:null,destMarker:null,fullCoords:[],totalDist:0},offlineQueue:{},offlineTimers:{},isOffline:!1,tripStart:{},maxSpeed:{},firstDeviceSeen:!1},h={markers:{},trails:{},routePts:{}},W={};function O(e,t){(W[e]=W[e]||[]).push(t)}function T(e,t){(W[e]||[]).forEach(s=>s(t))}const x={DEVICES_UPDATED:"devices:updated",DEVICE_SELECTED:"device:selected",ALERT_FIRED:"alert:fired",CONNECTION_CHANGE:"connection:changed",SETTINGS_SAVED:"settings:saved"},E=e=>{const t=parseFloat(e);return!isFinite(t)||isNaN(t)?0:t},be=e=>{const t=parseInt(e,10);return isFinite(t)?t:0},ve=e=>e===!0||e==="true",N=(e,t)=>{const s=parseFloat(e),n=parseFloat(t);return!(!isFinite(s)||!isFinite(n)||isNaN(s)||isNaN(n)||s<-90||s>90||n<-180||n>180||s===0&&n===0)};function X(e,t,s,n){if(!N(e,t)||!N(s,n))return 0;const a=6371,o=(s-e)*Math.PI/180,l=(n-t)*Math.PI/180,r=Math.sin(o/2)**2+Math.cos(e*Math.PI/180)*Math.cos(s*Math.PI/180)*Math.sin(l/2)**2,c=a*2*Math.atan2(Math.sqrt(r),Math.sqrt(1-r));return isFinite(c)?c:0}const D=(e,t,s,n)=>X(e,t,s,n)*1e3;function Ve(e){return e?new Date(e).toLocaleTimeString("en-US",{hour12:!1}):"--"}function qe(e){if(!e)return"";const t=Date.now()-e;return t<6e4?"Just now":t<36e5?`${Math.round(t/6e4)} min ago`:Ve(e)}function Qe(e,t){let s;return(...n)=>{clearTimeout(s),s=setTimeout(()=>e(...n),t)}}const P=e=>document.getElementById(e);function m(e,t,s=4500){const n=document.getElementById("toasts");if(!n)return;const a=document.createElement("div");a.className=`toast ${e}`,a.textContent=t,n.appendChild(a);const o=()=>{a.style.opacity="0",a.style.transform="translateX(20px)",a.style.transition=".3s ease",setTimeout(()=>a.remove(),320)},l=setTimeout(o,s);a.addEventListener("click",()=>{clearTimeout(l),o()})}const J={offline:{icon:"⚫",level:"info",label:"Went Offline",group:"offline",resolved:!1},online:{icon:"🟢",level:"success",label:"Back Online",group:"offline",resolved:!0},geofence:{icon:"🔵",level:"warning",label:"Left Geofence",group:"geofence",resolved:!1},geofence_enter:{icon:"🔵",level:"success",label:"Returned to Zone",group:"geofence",resolved:!0},speed:{icon:"🟠",level:"warning",label:"Overspeed",group:"speed",resolved:!1},speed_normal:{icon:"🟠",level:"success",label:"Speed Normalised",group:"speed",resolved:!0},crash:{icon:"🔴",level:"danger",label:"Crash Detected",group:"crash",resolved:!1},crash_clear:{icon:"🔴",level:"info",label:"Impact Cleared",group:"crash",resolved:!0},sync:{icon:"🟢",level:"success",label:"Data Synced",group:"sync",resolved:!0}},Z={all:null,offline:["offline","online"],geofence:["geofence","geofence_enter"],speed:["speed","speed_normal"],crash:["crash","crash_clear"],sync:["sync"]},ee=new Set(["theft","accident"]),Ke={offline:6e4,online:6e4,geofence:null,geofence_enter:1e4,speed:3e4,speed_normal:3e4,crash:1e4,crash_clear:1e4,sync:5e3},q={};function k(e,t,s,n){var v,u,p;if(ee.has(t))return;if(!J[t]){console.warn("[alerts] unknown type:",t);return}const a=`${e}_${t}`,o=Date.now(),l=t==="geofence"?i.settings.gfCooldown*1e3:Ke[t]??3e4;if(q[a]&&o-q[a]<l)return;q[a]=o;const r=n||((v=i.devices[e])==null?void 0:v.name)||e,c=J[t],f={id:`local_${o}_${Math.random().toString(36).slice(2,8)}`,deviceId:e,deviceName:r,type:t,group:c.group,resolved:c.resolved,message:s,lat:((u=i.devices[e])==null?void 0:u.lat)??null,lng:((p=i.devices[e])==null?void 0:p.lng)??null,timestamp:o,read:!1};i.localAlerts.unshift(f),i.localAlerts.length>300&&i.localAlerts.pop(),je("/alerts",{deviceId:e,deviceName:r,type:t,group:c.group,resolved:c.resolved,message:s,lat:f.lat,lng:f.lng,timestamp:o,read:!1}),i.totalAlerts++,i.alertUnread++,te(),T(x.ALERT_FIRED,{alert:f}),m(c.level,`${c.icon} ${s}`)}function We(e){const t=[];e.forEach(s=>{const n=s.val();n&&!ee.has(n.type)&&t.unshift({id:s.key,...n})}),i.firebaseAlerts=t,te()}function te(){const e=[...i.firebaseAlerts,...i.localAlerts],t=new Set;i.alerts=e.filter(s=>{if(!(s!=null&&s.type)||ee.has(s.type))return!1;const n=`${s.deviceId}_${s.type}_${Math.floor((s.timestamp||0)/2e3)}`;return t.has(n)?!1:(t.add(n),!0)}).sort((s,n)=>(n.timestamp||0)-(s.timestamp||0)),T(x.ALERT_FIRED,{})}function Je(e){const t=Z[e];return t?i.alerts.filter(s=>t.includes(s.type)):i.alerts}function Ye(){const e={};return Object.entries(Z).forEach(([t,s])=>{if(!s){e[t]=i.alerts.length;return}e[t]=i.alerts.filter(n=>s.includes(n.type)).length}),e}function R(){const e=document.getElementById("alert-list");if(!e)return;const t=Je(i.alertFilter);if(!t.length){e.innerHTML=`<div class="empty-state">
      <div class="icon">✅</div>
      <p>No ${i.alertFilter==="all"?"":i.alertFilter+" "}alerts yet.</p>
    </div>`;return}e.innerHTML=t.map(s=>{const n=J[s.type]||{icon:"⚠️",group:"offline",resolved:!1},a=n.resolved?'<span class="alert-resolved-tag">✓ resolved</span>':"",o=s.lat&&parseFloat(s.lat)!==0?`<span>📍 ${parseFloat(s.lat).toFixed(4)}, ${parseFloat(s.lng).toFixed(4)}</span>`:"";return`
    <div class="alert-item type-${s.type}${n.resolved?" resolved":""}">
      <div class="alert-icon grp-${n.group}">${n.icon}</div>
      <div class="alert-body">
        <div class="alert-title">${s.message||"Alert"}</div>
        <div class="alert-meta">
          <span>📟 ${s.deviceName||s.deviceId||"Unknown"}</span>
          <span>🕒 ${qe(s.timestamp)}</span>
          ${o}
          ${a}
        </div>
      </div>
      <span class="alert-badge badge-${s.type}">${n.label}</span>
    </div>`}).join("")}function se(){const e=Ye();Object.entries(Z).forEach(([t])=>{const s=document.querySelector(`.filter-btn[data-filter="${t}"]`),n=s==null?void 0:s.querySelector(".filter-count");if(!n)return;const a=e[t]||0;n.textContent=a,n.classList.toggle("visible",a>0&&t!=="all")})}function Ee(){const e=document.getElementById("alert-badge");e&&(e.style.display=i.alertUnread>0?"inline":"none",e.textContent=i.alertUnread>9?"9+":i.alertUnread)}let S=null;function Xe(e){S=e}function $(e){return i.geofences[e]||(i.geofences[e]={lat:7.2906,lng:80.6337,radius:500,active:!0,isSet:!1,circle:null}),i.geofences[e]}function ne(e){if(!S)return;const t=$(e);if(!t.isSet||!t.active){if(t.circle){try{S.removeLayer(t.circle)}catch{}t.circle=null}return}if(t.circle){try{t.circle.setLatLng([t.lat,t.lng]),t.circle.setRadius(t.radius)}catch{}return}t.circle=window.L.circle([t.lat,t.lng],{radius:t.radius,color:"#00E5FF",weight:2,opacity:.7,fillColor:"#00E5FF",fillOpacity:.08,dashArray:"6 4",pane:"geofencesPane",interactive:!1}).addTo(S)}function xe(){Object.keys(i.geofences).forEach(e=>{const t=$(e);t.isSet&&t.active&&ne(e)})}function Ze(e,t,s,n){var v;const a=$(e);if(!a.isSet||!a.active||!n||!N(t,s))return;const o=D(t,s,a.lat,a.lng),l=o<=a.radius,r=i.geofenceExitTracker[e]===!0,c=i.geofenceExitTracker[e]===!1,f=((v=i.devices[e])==null?void 0:v.name)||e;if(l)r||i.geofenceExitTracker[e]===void 0?(i.geofenceExitTracker[e]=!1,k(e,"geofence_enter",`${f} returned to the geofence zone`)):i.geofenceExitTracker[e]=!1;else if(c||i.geofenceExitTracker[e]===void 0){i.geofenceExitTracker[e]=!0;const u=Math.round(o);k(e,"geofence",`${f} left the geofence zone (${u}m away)`)}}function we(e){const t=$(e),s=i.devices[e];return!t.isSet||!t.active||!s||!s.gpsValid||s.lat===0?"not-set":D(s.lat,s.lng,t.lat,t.lng)<=t.radius?"inside":"outside"}let Q=!1,B=null;function G(e){var n;Q=!Q,B=e||i.selectedId;const t=document.getElementById("geofence-btn"),s=document.getElementById("draw-hint");if(Q){if(t==null||t.classList.add("active"),s){s.style.display="block";const a=B?((n=i.devices[B])==null?void 0:n.name)||B:"a device";s.textContent=`📌 Click the map to set the geofence centre for ${a}`}S==null||S.on("click",pe)}else t==null||t.classList.remove("active"),s&&(s.style.display="none"),S==null||S.off("click",pe)}function pe(e){var a;const t=B||i.selectedId;if(!t){m("warning","⚠️ Select a device first"),G();return}const s=$(t);s.lat=e.latlng.lat,s.lng=e.latlng.lng,s.isSet=!0;const n=document.getElementById(`gf-rad-${t}`);n&&(s.radius=parseInt(n.value,10)||500),i.geofenceExitTracker[t]=!1,ne(t),Le(t),j(),G(),m("success",`📐 Geofence set for ${((a=i.devices[t])==null?void 0:a.name)||t}! Alerts now active.`)}function Le(e){var n;const t=$(e),s=document.getElementById("geofence-info");s&&(s.style.display="block",s.innerHTML=`
    📐 <b>${((n=i.devices[e])==null?void 0:n.name)||e}</b><br>
    Radius: ${t.radius} m<br>
    ${t.lat.toFixed(5)}, ${t.lng.toFixed(5)}<br>
    <span style="color:var(--success);font-size:10px">✓ Active — alerts enabled</span>`)}function et(){let e=0;Object.keys(i.geofences).forEach(t=>{const s=document.getElementById(`gf-lat-${t}`),n=document.getElementById(`gf-lng-${t}`),a=document.getElementById(`gf-rad-${t}`),o=document.getElementById(`gf-act-${t}`),l=$(t);s&&(l.lat=parseFloat(s.value)||l.lat),n&&(l.lng=parseFloat(n.value)||l.lng),a&&(l.radius=parseInt(a.value,10)||l.radius),o&&(l.active=o.classList.contains("on")),l.isSet=!0,i.geofenceExitTracker[t]=!1,ne(t),e++}),j(),m("success",`✅ Geofences saved for ${e} device(s)! Alerts now active.`)}function j(){const e=document.getElementById("gf-table-body");if(!e)return;const t=Object.keys(i.devices);if(!t.length){e.innerHTML=`<tr>
      <td colspan="5" style="text-align:center;color:var(--t3);font-size:12px;padding:16px">
        No devices detected yet</td></tr>`;return}e.innerHTML=t.map(s=>{var l;const n=$(s),a=((l=i.devices[s])==null?void 0:l.name)||s,o=n.isSet?'<span class="gf-set-badge is-set">✓ SET</span>':'<span class="gf-set-badge not-set">NOT SET</span>';return`<tr>
      <td><span class="gf-badge">${a}</span>${o}</td>
      <td><input class="gf-input-sm" id="gf-lat-${s}" type="number"
            value="${n.lat.toFixed(5)}" step="0.00001"/></td>
      <td><input class="gf-input-sm" id="gf-lng-${s}" type="number"
            value="${n.lng.toFixed(5)}" step="0.00001"/></td>
      <td><input class="gf-input-sm" id="gf-rad-${s}" type="number"
            value="${n.radius}" min="50" max="50000" style="width:80px"/></td>
      <td><div class="toggle${n.active?" on":""}" id="gf-act-${s}"
              onclick="this.classList.toggle('on')"></div></td>
    </tr>`}).join("")}const Ie="vector_search_history",ge=10;function tt(){const e=localStorage.getItem(Ie);return e?JSON.parse(e):[]}function Se(e,t,s){if(!e||!t||!s)return;let n=tt();n=n.filter(a=>!(a.lat===t&&a.lng===s)),n.unshift({name:e,lat:t,lng:s,ts:Date.now()}),n.length>ge&&(n=n.slice(0,ge)),localStorage.setItem(Ie,JSON.stringify(n))}async function Te(e,t=null,s=null,n=12){if(!e||e.trim().length<2)return[];try{const a=new URL("https://nominatim.openstreetmap.org/search");a.searchParams.set("q",e),a.searchParams.set("format","json"),a.searchParams.set("limit",n),a.searchParams.set("addressdetails","1"),a.searchParams.set("extratags","1"),a.searchParams.set("namedetails","1");const o=await fetch(a.toString(),{headers:{"Accept-Language":"en"}});if(!o.ok)throw new Error(`HTTP ${o.status}`);return(await o.json()).map(r=>({name:r.name||r.display_name.split(",")[0],fullName:r.display_name,lat:parseFloat(r.lat),lng:parseFloat(r.lon),type:st(r),icon:nt(r),category:r.category,address:it(r),distance:t&&s?X(t,s,r.lat,r.lon):null,importance:parseFloat(r.importance||0),boundingbox:r.boundingbox})).sort((r,c)=>{const f=(r.type==="address"?100:r.type==="place"?50:10)-(c.type==="address"?100:c.type==="place"?50:10);return f!==0?f:r.distance!==null&&c.distance!==null?r.distance-c.distance:c.importance-r.importance})}catch(a){return console.error("[search] Error:",a),[]}}function st(e){var s,n;const t=((s=e.category)==null?void 0:s.toLowerCase())||"";return(n=e.type)!=null&&n.toLowerCase(),t==="place"?"place":t==="address"||t==="building"?"address":t==="amenity"?"place":t==="shop"?"business":t==="leisure"||t==="tourism"?"landmark":"location"}function nt(e){var n,a;const t=((n=e.category)==null?void 0:n.toLowerCase())||"",s=((a=e.type)==null?void 0:a.toLowerCase())||"";return t==="building"||t==="address"||s==="house"||s==="apartment"?"🏠":t==="shop"?s==="supermarket"?"🛒":s==="bar"||s==="pub"?"🍺":s==="restaurant"?"🍔":"🏪":t==="amenity"?s==="restaurant"||s==="cafe"||s==="fast_food"?"🍽️":s==="hospital"||s==="pharmacy"?"🏥":s==="parking"||s==="parking_space"?"🅿️":s==="fuel"?"⛽":s==="bank"||s==="atm"?"🏦":s==="library"?"📚":s==="school"||s==="university"?"🎓":s==="police"?"🚔":s==="fire_station"?"🚒":"📍":t==="tourism"||t==="leisure"?s==="hotel"||s==="guest_house"?"🏨":s==="attraction"?"🎯":s==="museum"?"🖼️":s==="monument"?"🏛️":s==="park"?"🌳":"📸":t==="place"?s==="city"||s==="town"?"🏙️":s==="village"?"🏘️":s==="county"||s==="region"?"🗺️":"📍":"📍"}function it(e){if(typeof e=="object"&&e.address){const t=e.address,s=[];return t.road&&s.push(t.road),(t.town||t.city)&&s.push(t.town||t.city),t.state&&s.push(t.state),s.slice(0,2).join(", ")||e.display_name.split(",").slice(1,3).join(",").trim()}return typeof e=="string"?e:""}let g;const at={online:"#00D97E",offline:"#FF3B5C",idle:"#FFB800"};function ot(){const e=[7.2906,80.6337];return g=window.L.map("map",{center:e,zoom:13,zoomControl:!1}),g.createPane("geofencesPane"),g.getPane("geofencesPane").style.zIndex=350,g.createPane("markersPane"),g.getPane("markersPane").style.zIndex=450,window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap contributors",maxZoom:19}).addTo(g),window.L.control.zoom({position:"bottomright"}).addTo(g),window._vectorMap=g,lt(),ct(),g}function lt(){var e,t,s;(e=document.getElementById("btn-fit-all"))==null||e.addEventListener("click",ut),(t=document.getElementById("geofence-btn"))==null||t.addEventListener("click",()=>G()),(s=document.getElementById("btn-clear-route"))==null||s.addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("vector:clearRoute"))})}function ct(){const e=document.getElementById("map-search-input"),t=document.getElementById("map-search-results"),s=document.getElementById("map-search-clear");if(!e)return;let n=null;const a=Qe(async o=>{if(o.length<2){_(t);return}t.innerHTML='<div class="map-search-loading"><span class="spinner"></span> Searching…</div>',t.classList.add("visible");try{const l=g.getCenter(),r=await Te(o,l.lat,l.lng,12);if(!r.length){t.innerHTML='<div class="map-search-empty">No results found</div>';return}t.innerHTML=r.map((c,f)=>{const v=c.distance?`<span class="map-search-dist">${c.distance.toFixed(1)} km</span>`:"";return`<div class="map-search-item"
          data-lat="${c.lat}" data-lng="${c.lng}"
          data-name="${c.name.replace(/"/g,"&quot;")}">
          <div style="display:flex; align-items:center; gap:10px; width:100%;">
            <span style="font-size:18px; flex-shrink:0">${c.icon}</span>
            <div style="flex:1; min-width:0; overflow:hidden;">
              <strong>${c.name}</strong>
              <small>${c.address}</small>
            </div>
            ${v}
          </div>
        </div>`}).join(""),t.querySelectorAll(".map-search-item").forEach(c=>{c.addEventListener("click",()=>{const f=parseFloat(c.dataset.lat),v=parseFloat(c.dataset.lng),u=c.dataset.name;e.value=u,s==null||s.classList.add("visible"),_(t),Se(u,f,v),n&&(g.removeLayer(n),n=null),n=window.L.marker([f,v],{icon:window.L.divIcon({className:"",iconSize:[36,36],iconAnchor:[18,36],html:`<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center">
                <div style="width:28px;height:28px;border-radius:50%;
                  background:rgba(0,229,255,.15);border:2px solid #00E5FF;
                  display:flex;align-items:center;justify-content:center;font-size:15px">📌</div>
              </div>`})}).addTo(g).bindPopup(`<b>${u}</b><br><small>${f.toFixed(5)}, ${v.toFixed(5)}</small>`).openPopup(),g.flyTo([f,v],15,{animate:!0,duration:1.2})})})}catch(l){console.error("[map-search] Error:",l),t.innerHTML='<div class="map-search-empty">Search error — check connection</div>'}},300);e.addEventListener("input",o=>{const l=o.target.value.trim();s==null||s.classList.toggle("visible",l.length>0),a(l)}),e.addEventListener("keydown",o=>{o.key==="Escape"&&(_(t),e.blur())}),s==null||s.addEventListener("click",()=>{e.value="",s.classList.remove("visible"),_(t),n&&(g.removeLayer(n),n=null)}),document.addEventListener("click",o=>{o.target.closest(".map-search-wrap")||_(t)})}function _(e){e&&(e.classList.remove("visible"),e.setAttribute("aria-expanded","false"))}function rt(){Object.entries(i.devices).forEach(([e,t])=>{var s;if(!(t.lat===0&&t.lng===0)&&(h.markers[e]?(h.markers[e].setLatLng([t.lat,t.lng]),h.markers[e].setIcon(me(t))):(h.markers[e]=window.L.marker([t.lat,t.lng],{icon:me(t),pane:"markersPane"}).addTo(g),h.markers[e].bindPopup(()=>vt(e)),h.markers[e].on("click",()=>{document.dispatchEvent(new CustomEvent("vector:selectDevice",{detail:{id:e}}))})),i.settings.showTrail&&(((s=h.routePts[e])==null?void 0:s.length)??0)>1)){if(h.trails[e])try{g.removeLayer(h.trails[e])}catch{}h.trails[e]=window.L.polyline(h.routePts[e],{color:"#FF6B35",weight:2,opacity:.45,dashArray:"4 4"}).addTo(g)}})}function dt(){Object.values(h.trails).forEach(e=>{try{g.removeLayer(e)}catch{}}),Object.keys(h.trails).forEach(e=>delete h.trails[e])}function ut(){const e=Object.values(i.devices).filter(t=>t.lat!==0&&t.lng!==0).map(t=>[t.lat,t.lng]);if(!e.length){m("warning","⚠️ No device positions available");return}if(e.length===1){g.setView(e[0],15);return}g.fitBounds(window.L.latLngBounds(e),{padding:[40,40]})}function ft(e){const t=i.devices[e];t&&t.lat!==0&&t.lng!==0&&g.setView([t.lat,t.lng],15)}function me(e){const t=at[e.status]||"#7A8FAD",s=e.heading&&e.speed>2?`<div style="position:absolute;top:-2px;left:50%;transform:translateX(-50%) rotate(${e.heading}deg);font-size:10px">▲</div>`:"",n=(e.name||e.id).substring(0,8);return window.L.divIcon({className:"",iconSize:[44,44],iconAnchor:[22,44],html:`<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
      ${s}
      <div style="width:36px;height:36px;border-radius:50%;background:${t}22;border:2px solid ${t};
        display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 12px ${t}66">🚛</div>
      <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);background:${t};
        color:#000;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap;
        font-family:'DM Mono',monospace">${n}</div>
    </div>`})}function vt(e){const t=i.devices[e];if(!t)return"No data";const s=we(e),n=s==="inside"?"✅ Inside zone":s==="outside"?"⚠️ Outside zone":"— Not configured",a=t.gpsCached?"📍 Cached":t.gpsValid?"🛰️ GPS lock":"📴 No GPS";return`<div style="font-family:'DM Sans',sans-serif;min-width:190px">
    <b style="font-size:14px">${t.name}</b>
    <div style="margin-top:6px;font-size:12px;line-height:2;color:#555">
      Speed: <b>${t.speed} km/h</b><br>
      Lat: ${t.lat.toFixed(6)} &nbsp; Lng: ${t.lng.toFixed(6)}<br>
      Heading: ${t.heading.toFixed(1)}° &nbsp; Sats: ${t.satellites}<br>
      Geofence: ${n}<br>
      GPS: ${a} &nbsp;
      Status: <b style="color:${t.status==="online"?"#00D97E":"#FF3B5C"}">${t.status.toUpperCase()}</b>
    </div>
    <button onclick="document.dispatchEvent(new CustomEvent('vector:selectDevice',{detail:{id:'${e}'}}));
                     setTimeout(()=>document.dispatchEvent(new CustomEvent('vector:startGeofenceDraw',{detail:{id:'${e}'}})),50)"
      style="margin-top:6px;padding:4px 10px;background:#00E5FF22;border:1px solid #00E5FF;
        border-radius:4px;color:#00E5FF;font-size:11px;cursor:pointer;width:100%">
      📐 Set Geofence</button>
  </div>`}function pt({coords:e,oLat:t,oLng:s,dLat:n,dLng:a,distKm:o,etaMin:l,destName:r,navRoute:c}){c.lineFull=window.L.polyline(e,{color:"#00E5FF",weight:4,opacity:.45,dashArray:"8 6"}).addTo(g),c.line=window.L.polyline([[t,s]],{color:"#00D97E",weight:5,opacity:.9}).addTo(g),c.destMarker=window.L.marker([n,a],{icon:window.L.divIcon({className:"",iconSize:[38,38],iconAnchor:[19,38],html:`<div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center">
        <div style="width:30px;height:30px;border-radius:50%;background:rgba(255,107,53,.2);
          border:2px solid #FF6B35;display:flex;align-items:center;justify-content:center;
          font-size:16px;box-shadow:0 0 12px rgba(255,107,53,.5)">🏁</div>
      </div>`})}).addTo(g).bindPopup(`<b>Destination</b><br>${r}<br>${o} km · ~${l} min`),g.fitBounds(window.L.latLngBounds([[t,s],[n,a]]),{padding:[50,50]})}function gt(e){if(e)try{g.removeLayer(e)}catch{}}const mt=5e3;function ht(e,t,s){var ue;const n=E(t.lat),a=E(t.lng),o=E(t.altitude),l=E(t.hdop)||99.9,r=be(t.satellites),c=E(t.heading),f=E(t.accel),v=E(t.pitch),u=E(t.roll),p=ve(t.gpsValid),C=ve(t.gpsCached);if(!N(n,a)){console.warn(`[GPS] Invalid coordinates for ${e}: lat=${n}, lng=${a}`);return}const b=i.devices[e],V=i.prevStatus[e]||"online",De=i.lastStatusTransition[e]||0;let w=E(t.speed);if(w<=0&&b&&b.lat!==0&&n!==0){const A=(s-(b._lastUpdate||s-1e3))/1e3;A>0&&A<60&&(w=Math.min(D(b.lat,b.lng,n,a)/A*3.6,300))}w=parseFloat(w.toFixed(1));let oe=0;if(b&&b.lat!==0&&n!==0&&p){const A=X(b.lat,b.lng,n,a);A<.5&&(oe=A)}const Me=parseFloat((((b==null?void 0:b.totalDist)||0)+oe).toFixed(3));i.tripStart[e]||(i.tripStart[e]=s),(!i.maxSpeed[e]||w>i.maxSpeed[e])&&(i.maxSpeed[e]=w);const L=t.name||`Device ${e}`,Oe={id:e,name:L,status:"online",lat:n,lng:a,altitude:o,hdop:l,satellites:r,heading:String(c).includes("NaN")?0:Math.max(0,Math.min(360,c)),accel:f,pitch:v,roll:u,speed:w,totalDist:Me,gpsValid:p,gpsCached:C,vehicleState:t.vehicleState||"parked",_lastUpdate:s};i.devices[e]=Oe,V==="offline"&&s-De>mt&&(i.onlineAlertSent[e]||(bt(e),k(e,"online",`${L} is back online`,L),i.onlineAlertSent[e]=!0,i.offlineAlertSent[e]=!1,i.lastStatusTransition[e]=s)),clearTimeout(i.offlineTimers[e]),i.offlineTimers[e]=null,i.prevStatus[e]="online",h.routePts[e]||(h.routePts[e]=[]),n!==0&&a!==0&&p&&(h.routePts[e].push([n,a]),h.routePts[e].length>500&&h.routePts[e].shift()),i.history[e]||(i.history[e]=[]),i.history[e].push({speed:w,accel:f,ts:s}),i.history[e].length>20&&i.history[e].shift();const le=i.overspeedTracker[e]===!0,ce=w>i.settings.speedThreshold&&w>5;ce&&!le?(i.overspeedTracker[e]=!0,k(e,"speed",`Overspeed: ${w.toFixed(1)} km/h on ${L}`,L)):!ce&&le&&(i.overspeedTracker[e]=!1,k(e,"speed_normal",`Speed normalised: ${w.toFixed(1)} km/h on ${L}`,L));const re=i.crashTracker[e]===!0,de=f>0&&f>i.settings.crashThreshold;de&&!re?(i.crashTracker[e]=!0,k(e,"crash",`Hard impact! ${f.toFixed(2)}g on ${L}`,L)):!de&&re&&(i.crashTracker[e]=!1,k(e,"crash_clear",`Impact cleared on ${L}`,L)),Ze(e,n,a,p),i.geofences[e]||(i.geofences[e]={lat:n||7.2906,lng:a||80.6337,radius:500,active:!0,isSet:!1,circle:null}),!p&&i.settings.offlineEnabled&&Et(e,t,s),yt(e),!i.firstDeviceSeen&&n!==0&&a!==0&&(i.firstDeviceSeen=!0,(ue=window._vectorMap)==null||ue.setView([n,a],15),i.selectedId=e)}function yt(e){const t=i.devices[e];if(!t||t.status==="offline")return;clearTimeout(i.offlineTimers[e]);const s=(i.settings.offlineTimeout||90)*1e3;i.offlineTimers[e]=setTimeout(()=>{const n=i.devices[e];!n||n.status==="offline"||i.offlineAlertSent[e]||(n.status="offline",i.prevStatus[e]="offline",i.offlineAlertSent[e]=!0,i.onlineAlertSent[e]=!1,i.lastStatusTransition[e]=Date.now(),T(x.DEVICES_UPDATED),k(e,"offline",`${n.name} went offline`))},s)}function bt(e){const t=i.devices[e];if(!t||!t.name)return;let s=!1;const n=i.localAlerts.length;i.localAlerts=i.localAlerts.filter(o=>!(o.deviceId===e&&o.type==="offline")),s=i.localAlerts.length<n;const a=i.alerts.length;i.alerts=i.alerts.filter(o=>!(o.deviceId===e&&o.type==="offline")),s=s||i.alerts.length<a,s&&T(x.ALERT_FIRED)}function Et(e,t,s){if(!i.settings.offlineEnabled)return;i.offlineQueue[e]||(i.offlineQueue[e]=[]),i.offlineQueue[e].push({lat:E(t.lat),lng:E(t.lng),speed:E(t.speed),accel:E(t.accel),satellites:be(t.satellites),altitude:E(t.altitude),ts:s,offline:!0});const n=i.settings.offlineBuffer||200;i.offlineQueue[e].length>n&&i.offlineQueue[e].shift()}function ie(){return Object.values(i.offlineQueue).reduce((e,t)=>e+t.length,0)}async function xt(){var s,n,a;const e=ie();if(e===0||!i.settings.autoSync)return;(s=document.getElementById("offline-sync-bar"))==null||s.classList.add("show"),m("info",`🔄 Syncing ${e} offline records…`);const t=[];Object.entries(i.offlineQueue).forEach(([o,l])=>{if(!l.length)return;const r={};l.forEach((c,f)=>{r[`offline_${o}_${c.ts}_${f}`]={...c,deviceId:o}}),t.push(Ue("/offline_data",r).then(()=>{i.offlineQueue[o]=[],wt()}))});try{await Promise.all(t),(n=document.getElementById("offline-sync-bar"))==null||n.classList.remove("show");const o=Object.keys(i.devices)[0]||"sys";k(o,"sync",`Synced ${e} offline records to server`),m("success",`✅ Offline sync complete! ${e} records uploaded.`)}catch{(a=document.getElementById("offline-sync-bar"))==null||a.classList.remove("show"),m("danger","❌ Offline sync failed. Will retry on reconnect.")}}function wt(){const e=ie(),t=document.getElementById("offline-store-pill"),s=document.getElementById("offline-store-count"),n=document.getElementById("offline-queue-count");t&&t.classList.toggle("show",e>0),s&&(s.textContent=e),n&&(n.textContent=`${e} records`)}const y={};function Lt(){const e=document.documentElement.getAttribute("data-theme")==="dark",t=e?"#7A8FAD":"#4A6080",s=e?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)",n=window.Chart,a=(l={})=>({responsive:!0,maintainAspectRatio:!1,animation:{duration:300},plugins:{legend:{display:!1}},...l}),o=(l="")=>({x:{grid:{color:s},ticks:{color:t,maxTicksLimit:8}},y:{grid:{color:s},ticks:{color:t},min:0,title:{display:!!l,text:l,color:t}}});y.speed=new n(P("speed-chart"),{type:"line",data:{labels:[],datasets:[{label:"Speed km/h",data:[],borderColor:"#00E5FF",backgroundColor:"rgba(0,229,255,0.08)",borderWidth:2,fill:!0,tension:.4,pointRadius:2,pointBackgroundColor:"#00E5FF"}]},options:{...a(),scales:o("km/h")}}),y.activity=new n(P("activity-chart"),{type:"bar",data:{labels:Array.from({length:12},(l,r)=>`${-(11-r)}m`),datasets:[{data:Array(12).fill(0),backgroundColor:"rgba(0,229,255,0.35)",borderColor:"rgba(0,229,255,0.7)",borderWidth:1,borderRadius:4}]},options:{...a(),scales:o()}}),y.deviceDist=new n(P("device-dist-chart"),{type:"bar",data:{labels:[],datasets:[{data:[],backgroundColor:["rgba(0,229,255,0.5)","rgba(255,107,53,0.5)","rgba(0,217,126,0.5)","rgba(255,184,0,0.5)","rgba(255,59,92,0.5)"],borderRadius:6}]},options:{...a(),scales:o("km")}}),y.miniSpeed=new n(P("mini-speed-chart"),{type:"line",data:{labels:[],datasets:[{data:[],borderColor:"#00E5FF",backgroundColor:"rgba(0,229,255,0.1)",borderWidth:1.5,fill:!0,tension:.4,pointRadius:0}]},options:{...a(),scales:{x:{display:!1},y:{display:!1,min:0}}}})}function ae(){const e=Object.values(i.devices),t=i.selectedId||Object.keys(i.history)[0];if(t&&i.history[t]&&y.speed){const o=i.history[t];y.speed.data.labels=o.map((l,r)=>r),y.speed.data.datasets[0].data=o.map(l=>l.speed.toFixed(1)),y.speed.update("none")}y.deviceDist&&(y.deviceDist.data.labels=e.map(o=>o.name.replace("Device ","Dev ")),y.deviceDist.data.datasets[0].data=e.map(o=>o.totalDist||0),y.deviceDist.update("none"));const s=e.reduce((o,l)=>o+(l.totalDist||0),0),n=Math.max(...Object.values(i.maxSpeed).map(Number).filter(o=>!isNaN(o)),0),a=o=>document.getElementById(o);a("stat-distance")&&(a("stat-distance").textContent=s.toFixed(2)+" km"),a("stat-maxspeed")&&(a("stat-maxspeed").textContent=n.toFixed(1)),a("stat-alerts")&&(a("stat-alerts").textContent=i.totalAlerts||i.alerts.length),a("stat-devices")&&(a("stat-devices").textContent=e.filter(o=>o.status==="online").length)}function Y(){if(!y.activity)return;const e=Array(12).fill(0),t=Date.now();Object.values(i.history).forEach(s=>{s.forEach(n=>{const a=Math.floor((t-n.ts)/6e4);a>=0&&a<12&&e[11-a]++})}),y.activity.data.datasets[0].data=e,y.activity.update("none")}function It(e){if(!y.miniSpeed)return;const t=i.history[e];t&&(y.miniSpeed.data.labels=t.map((s,n)=>n),y.miniSpeed.data.datasets[0].data=t.map(s=>s.speed.toFixed(1)),y.miniSpeed.update("none"))}const d=i.playback;function St(e){const t=h.routePts[e],s=t&&t.length>1;d.route=s?[...t]:[],d.index=0,M()}function Tt(){if(!d.route||d.route.length<2){m("warning","⚠️ Not enough route data. Device needs to move first.");return}d.playing=!d.playing,U(d.playing?"⏸":"▶"),d.playing?$e():F()}function kt(){d.playing&&(F(),$e())}function $t(){var e;if(d.playing=!1,d.index=0,F(),U("▶"),M(),d.polyline){try{(e=window._vectorMap)==null||e.removeLayer(d.polyline)}catch{}d.polyline=null}d.marker&&d.route[0]&&d.marker.setLatLng(d.route[0])}function ke(){d.playing=!1,d.index=0,F(),U("▶");const e=window._vectorMap;if(d.marker){try{e==null||e.removeLayer(d.marker)}catch{}d.marker=null}if(d.polyline){try{e==null||e.removeLayer(d.polyline)}catch{}d.polyline=null}M()}function Ct(e){var s,n;if(!d.route.length)return;d.index=Math.min(parseInt(e,10),d.route.length-1);const t=d.route[d.index];t&&((s=d.marker)==null||s.setLatLng(t),(n=d.polyline)==null||n.setLatLngs(d.route.slice(0,d.index+1))),M()}function $e(){var l;const e=window._vectorMap,t=d.route,s=parseInt(((l=document.getElementById("pb-speed-sel"))==null?void 0:l.value)||"1",10);if(!(t!=null&&t.length)||!e)return;d.index>=t.length&&(d.index=0);const n=t[d.index]||t[0],a=window.L.divIcon({className:"",iconSize:[36,36],iconAnchor:[18,18],html:`<div style="width:36px;height:36px;border-radius:50%;
      background:rgba(0,229,255,.15);border:2px solid #00E5FF;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;box-shadow:0 0 16px rgba(0,229,255,.4)">▶</div>`});if(d.marker?(d.marker.setLatLng(n),d.marker.setIcon(a)):d.marker=window.L.marker(n,{icon:a,zIndexOffset:1e3}).addTo(e),d.polyline)try{e.removeLayer(d.polyline)}catch{}const o=t.slice(0,Math.max(1,d.index+1));o&&o.length>0&&(d.polyline=window.L.polyline(o,{color:"#FF6B35",weight:3,opacity:.8}).addTo(e)),F(),d.timer=setInterval(()=>{if(!d.playing){F();return}const r=d.index;if(r>=t.length-1){d.playing=!1,F(),U("▶"),m("info","🎬 Playback complete!"),setTimeout(()=>ke(),2e3);return}const c=t[r];if(c&&d.marker&&d.polyline)try{d.marker.setLatLng(c),d.polyline.addLatLng(c),e.panTo(c,{animate:!0,duration:.3})}catch(f){console.warn("[playback] movement error:",f)}d.index=r+1,M()},Math.max(80,500/s))}function F(){clearInterval(d.timer),d.timer=null}function U(e){const t=document.getElementById("pb-play-btn");t&&(t.textContent=e)}function M(){const e=d.route,t=e.length>1,s=document.getElementById("pb-slider"),n=document.getElementById("pb-total"),a=document.getElementById("pb-cur"),o=document.getElementById("pb-no-data");s&&(s.max=t?e.length-1:100,s.value=d.index),n&&(n.textContent=t?`${e.length} pts`:"-- pts"),o&&(o.style.display=t?"none":"block");const l=t?(d.index/Math.max(e.length-1,1)*100).toFixed(0)+"%":"0%";a&&(a.textContent=l)}let he=null;function At(e){const t=document.getElementById("dest-suggestions");if(!t)return;const s=e.trim();if(s.length<2){t.classList.remove("visible");return}t.innerHTML='<div class="dest-sug-status"><span class="spinner"></span> Searching…</div>',t.classList.add("visible"),clearTimeout(he),he=setTimeout(()=>_t(s),300)}function Ft(e){var t;e.key==="Escape"&&((t=document.getElementById("dest-suggestions"))==null||t.classList.remove("visible"))}async function _t(e){const t=document.getElementById("dest-suggestions");if(t)try{const s=i.devices[i.selectedId],n=(s==null?void 0:s.lat)||null,a=(s==null?void 0:s.lng)||null,o=await Te(e,n,a,10);if(!o.length){t.innerHTML='<div class="dest-sug-status">No results found</div>';return}t.innerHTML=o.map((l,r)=>{const c=l.distance?`<span class="dest-dist">${l.distance.toFixed(1)} km</span>`:"";return`<div class="dest-sug-item"
        data-lat="${l.lat}" data-lng="${l.lng}"
        data-name="${l.name.replace(/"/g,"&quot;")}">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:16px">${l.icon}</span>
          <div style="flex:1; min-width:0;">
            <b>${l.name}</b>
            <small>${l.address}</small>
          </div>
          ${c}
        </div>
      </div>`}).join(""),t.querySelectorAll(".dest-sug-item").forEach(l=>{l.addEventListener("click",()=>{Bt(parseFloat(l.dataset.lat),parseFloat(l.dataset.lng),l.dataset.name)})})}catch(s){console.error("[dest-search] Error:",s),t.innerHTML='<div class="dest-sug-status">Search error — check connection</div>'}}function Bt(e,t,s){var a;const n=document.getElementById("dest-input");n&&(n.value=s),(a=document.getElementById("dest-suggestions"))==null||a.classList.remove("visible"),i.navRoute.destLat=e,i.navRoute.destLng=t,i.navRoute.destName=s,Se(s,e,t),m("info",`📍 Destination set: ${s}`)}async function Dt(){var a,o,l,r;if(!i.selectedId){m("warning","⚠️ Select a device first");return}if(!i.navRoute.destLat){m("warning","⚠️ Search and select a destination first");return}const e=i.devices[i.selectedId];if(!e){m("warning","⚠️ Device not found");return}if(e.lat===0||e.lng===0){m("warning","⚠️ Device has no GPS position yet");return}const t=parseFloat(i.navRoute.destLat),s=parseFloat(i.navRoute.destLng);if(!isFinite(t)||!isFinite(s)){m("warning","⚠️ Invalid destination coordinates");return}m("info","🗺️ Fetching route…"),z();const n=i.navRoute;try{const c=`https://router.project-osrm.org/route/v1/driving/${e.lng},${e.lat};${s},${t}?overview=full&geometries=geojson`;console.log("[route] fetching from OSRM:",c);const f=await fetch(c);if(!f.ok)throw new Error(`HTTP ${f.status}: ${f.statusText}`);const v=await f.json();if(v.code!=="Ok")throw console.error("[route] OSRM error code:",v.code,v.message),new Error(`OSRM Error: ${v.code}`+(v.message?` - ${v.message}`:""));if(!v.routes||v.routes.length===0)throw new Error("No route found between these points");const u=v.routes[0].geometry.coordinates.map(([b,V])=>[V,b]),p=(v.routes[0].distance/1e3).toFixed(1),C=Math.round(v.routes[0].duration/60);n.fullCoords=u,n.totalDist=parseFloat(p),pt({coords:u,distKm:p,etaMin:C,oLat:e.lat,oLng:e.lng,dLat:t,dLng:s,destName:n.destName,navRoute:n}),(a=document.getElementById("route-meta"))==null||a.style.setProperty("display","flex"),document.getElementById("route-dist-val")&&(document.getElementById("route-dist-val").textContent=p),document.getElementById("route-eta-val")&&(document.getElementById("route-eta-val").textContent=C),(o=document.getElementById("route-progress-badge"))==null||o.style.setProperty("display","inline"),(l=document.getElementById("clear-route-btn"))==null||l.style.setProperty("display","flex"),(r=document.getElementById("btn-clear-route"))==null||r.style.setProperty("display","flex"),m("success",`✅ Route: ${p} km · ~${C} min`)}catch(c){console.error("[route] fetch error:",c),m("danger",`❌ ${c.message||"Could not fetch route. Check connection."}`)}}function Mt(e,t){const s=i.navRoute;if(!s.fullCoords.length||!s.line)return;let n=1/0,a=0;s.fullCoords.forEach(([c,f],v)=>{const u=D(e,t,c,f);u<n&&(n=u,a=v)});const o=s.fullCoords.slice(0,a+1);try{s.line.setLatLngs(o.length?o:[[e,t]])}catch(c){console.warn("[route] setLatLngs failed:",c);return}const l=Math.round(a/Math.max(s.fullCoords.length-1,1)*100),r=document.getElementById("route-pct-val");r&&(r.textContent=l),D(e,t,s.destLat,s.destLng)<50&&(m("success",`🏁 Arrived at ${s.destName}!`),z())}function z(){var s,n,a,o;const e=i.navRoute;["line","lineFull","destMarker"].forEach(l=>{e[l]&&(gt(e[l]),e[l]=null)}),e.destLat=null,e.destLng=null,e.fullCoords=[],e.destName="";const t=document.getElementById("dest-input");t&&(t.value=""),(s=document.getElementById("route-meta"))==null||s.style.setProperty("display","none"),(n=document.getElementById("clear-route-btn"))==null||n.style.setProperty("display","none"),(a=document.getElementById("btn-clear-route"))==null||a.style.setProperty("display","none"),(o=document.getElementById("route-progress-badge"))==null||o.style.setProperty("display","none")}function Ce(){const e=document.getElementById("device-list"),t=Object.values(i.devices);if(e){if(!t.length){e.innerHTML=`<div class="empty-state" style="padding:24px 12px">
      <div class="icon" style="font-size:24px">📡</div>
      <p style="font-size:11px;text-align:center">Waiting for devices…</p>
    </div>`;return}e.innerHTML=t.map(s=>`
    <div class="dev-item${i.selectedId===s.id?" selected":""}"
         data-id="${s.id}">
      <div class="dev-dot ${s.status}"></div>
      <div class="dev-info">
        <div class="dev-name">${s.name}</div>
        <div class="dev-sub">${s.speed} km/h · ${s.status}</div>
      </div>
      <button class="dev-gf-btn" data-gf="${s.id}" title="Set geofence">📐</button>
    </div>`).join(""),e.querySelectorAll(".dev-item").forEach(s=>{s.addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("vector:selectDevice",{detail:{id:s.dataset.id}}))})}),e.querySelectorAll(".dev-gf-btn").forEach(s=>{s.addEventListener("click",n=>{n.stopPropagation(),document.dispatchEvent(new CustomEvent("vector:selectDevice",{detail:{id:s.dataset.gf}})),setTimeout(()=>{document.dispatchEvent(new CustomEvent("vector:startGeofenceDraw",{detail:{id:s.dataset.gf}}))},50)})})}}function Ot(){const e=document.getElementById("last-sync");e&&(e.textContent="⏱ "+new Date().toLocaleTimeString())}function Pt(e){var t;document.querySelectorAll(".nav-item").forEach(s=>s.classList.remove("active")),(t=document.getElementById(`nav-${e}`))==null||t.classList.add("active")}const Nt={dashboard:["Live Map","Vehicle Embedded Communication Tracking Optimization & Reporting System"],analytics:["Analytics","Performance metrics & advanced insights"],alerts:["Alert Center","Unified incident monitoring & response"],settings:["Settings","VECTOR platform configuration"]};function Rt(e){const t=document.getElementById("fb-dot"),s=document.getElementById("fb-status");t&&(t.className=e?"dot":"dot offline-dot"),s&&(s.textContent=e?"Connected":"Offline")}function Gt(e){const[t,s]=Nt[e]||["",""],n=document.getElementById("tb-title"),a=document.getElementById("tb-sub");n&&(n.textContent=t),a&&(a.textContent=s)}function zt(e){const t=document.getElementById("offline-store-pill"),s=document.getElementById("offline-store-count");t&&t.classList.toggle("show",e>0),s&&(s.textContent=e)}function Ae(){var f,v;const e=i.devices[i.selectedId];if(!e)return;I("active-name",e.name),I("active-lat",e.lat.toFixed(6)),I("active-lng",e.lng.toFixed(6)),I("active-alt",e.altitude.toFixed(1)+" m"),I("active-hdg",e.heading.toFixed(1)+" °"),I("active-hdop",e.hdop.toFixed(2)),I("active-accel",e.accel.toFixed(3)+" g"),I("active-tilt",`${e.pitch.toFixed(1)}° / ${e.roll.toFixed(1)}°`);const t=document.getElementById("active-accel");t&&(t.style.color=e.accel>i.settings.crashThreshold?"var(--danger)":"");const s=document.getElementById("active-status");s&&(s.className=`status-badge ${e.status}`,s.textContent=e.status.toUpperCase());const n=we(e.id),a=document.getElementById("active-gf-indicator");a&&(a.className=`gf-indicator ${n}`,a.textContent=n==="inside"?"✓ Inside zone":n==="outside"?"⚠ Outside zone":"— Not configured"),K("m-speed",`${e.speed}<span class="unit">km/h</span>`),K("m-dist",`${e.totalDist.toFixed(2)}<span class="unit">km</span>`);const o=Math.round((Date.now()-(i.tripStart[e.id]||Date.now()))/6e4);K("m-time",`${o}<span class="unit">min</span>`),I("m-sats",e.satellites);let l="📴 No GPS";e.gpsValid?l="🛰️ GPS lock":e.gpsCached&&(l="📍 Cached pos"),I("m-gps-mode",l);const r=e.speed>i.settings.speedThreshold,c=document.getElementById("m-speed-ch");c&&(c.textContent=r?"⚠️ Overspeed!":e.speed>0?`✅ Normal · ${e.vehicleState}`:`Parked · ${e.vehicleState}`,c.className=`m-change ${r?"down":e.speed>0?"up":"neutral"}`),(f=document.getElementById("offline-banner"))==null||f.classList.toggle("show",e.status==="offline"),(v=document.getElementById("cached-banner"))==null||v.classList.toggle("show",e.gpsCached&&e.status!=="offline"),It(e.id)}const I=(e,t)=>{const s=document.getElementById(e);s&&(s.textContent=t)},K=(e,t)=>{const s=document.getElementById(e);s&&(s.innerHTML=t)},Fe="vector_settings_v1";function Ht(){try{const e=JSON.parse(localStorage.getItem(Fe)||"{}");Object.assign(i.settings,e)}catch{}}function jt(){var s,n,a,o,l;const e=r=>document.getElementById(r),t=r=>{var c;return((c=e(r))==null?void 0:c.classList.contains("on"))??!1};i.settings.offlineTimeout=parseInt((s=e("s-offline-t"))==null?void 0:s.value,10)||90,i.settings.speedThreshold=parseInt((n=e("s-speed-t"))==null?void 0:n.value,10)||120,i.settings.crashThreshold=parseFloat((a=e("s-crash-t"))==null?void 0:a.value)||2,i.settings.gfCooldown=parseInt((o=e("s-gf-cooldown"))==null?void 0:o.value,10)||60,i.settings.offlineBuffer=parseInt((l=e("s-offline-buf"))==null?void 0:l.value,10)||200,i.settings.offlineEnabled=t("s-offline-toggle"),i.settings.autoSync=t("s-autosync-toggle"),i.settings.showTrail=t("s-trail-toggle");try{localStorage.setItem(Fe,JSON.stringify(i.settings))}catch{}T(x.SETTINGS_SAVED),m("success","✅ Settings saved and applied!")}function _e(){const e=i.settings,t=(n,a)=>{const o=document.getElementById(n);o&&(o.value=a)},s=(n,a)=>{var o;return(o=document.getElementById(n))==null?void 0:o.classList.toggle("on",!!a)};t("s-offline-t",e.offlineTimeout),t("s-speed-t",e.speedThreshold),t("s-crash-t",e.crashThreshold),t("s-gf-cooldown",e.gfCooldown),t("s-offline-buf",e.offlineBuffer),s("s-offline-toggle",e.offlineEnabled),s("s-autosync-toggle",e.autoSync),s("s-trail-toggle",e.showTrail),s("s-theme-toggle",document.documentElement.getAttribute("data-theme")==="dark")}function Ut(){var s;const e=document.documentElement,t=e.getAttribute("data-theme")==="dark"?"light":"dark";e.setAttribute("data-theme",t),(s=document.getElementById("s-theme-toggle"))==null||s.classList.toggle("on",t==="dark")}function Vt(e){i.settings.showTrail=e,e||dt()}window.addEventListener("DOMContentLoaded",()=>{var e;Ht(),qt(),Qt(),Kt(),Wt(),Jt(),(e=document.getElementById("loading-screen"))==null||e.remove()});function qt(){const e=document.getElementById("app");e.innerHTML=ze(),document.getElementById("page-dashboard").innerHTML=Pe(),document.getElementById("page-analytics").innerHTML=Ne(),document.getElementById("page-alerts").innerHTML=Re(),document.getElementById("page-settings").innerHTML=Ge()}function Qt(){const e=ot();Xe(e),Lt(),_e()}function Kt(){var e,t,s,n,a,o,l,r,c,f,v;document.querySelectorAll(".nav-item[data-page]").forEach(u=>{u.addEventListener("click",()=>Xt(u.dataset.page))}),(e=document.getElementById("btn-theme"))==null||e.addEventListener("click",()=>Ut()),document.addEventListener("click",u=>{const p=u.target;p.id==="s-theme-toggle"&&(p.classList.toggle("on"),document.documentElement.setAttribute("data-theme",p.classList.contains("on")?"dark":"light")),p.id==="s-trail-toggle"&&(p.classList.toggle("on"),Vt(p.classList.contains("on"))),(p.id==="s-offline-toggle"||p.id==="s-autosync-toggle")&&p.classList.toggle("on"),p.id==="btn-save-settings"&&jt(),p.id==="btn-save-geofences"&&et()}),(t=document.getElementById("btn-get-route"))==null||t.addEventListener("click",Dt),(s=document.getElementById("clear-route-btn"))==null||s.addEventListener("click",z),document.addEventListener("vector:clearRoute",z),(n=document.getElementById("dest-input"))==null||n.addEventListener("input",u=>At(u.target.value)),(a=document.getElementById("dest-input"))==null||a.addEventListener("keydown",Ft),document.addEventListener("click",u=>{var p;u.target.closest(".dest-search-wrap")||(p=document.getElementById("dest-suggestions"))==null||p.classList.remove("visible")}),(o=document.getElementById("pb-play-btn"))==null||o.addEventListener("click",Tt),(l=document.getElementById("pb-rewind"))==null||l.addEventListener("click",$t),(r=document.getElementById("pb-slider"))==null||r.addEventListener("input",u=>Ct(u.target.value)),(c=document.getElementById("pb-speed-sel"))==null||c.addEventListener("change",kt),(f=document.getElementById("pb-clear-btn"))==null||f.addEventListener("click",ke),(v=document.getElementById("alert-filters"))==null||v.addEventListener("click",u=>{const p=u.target.closest(".filter-btn");p&&(document.querySelectorAll(".filter-btn").forEach(C=>C.classList.remove("active")),p.classList.add("active"),i.alertFilter=p.dataset.filter,R())}),document.addEventListener("vector:selectDevice",u=>{Yt(u.detail.id)}),document.addEventListener("vector:startGeofenceDraw",u=>{G(u.detail.id)}),O(x.ALERT_FIRED,()=>{var u;Ee(),se(),(u=document.getElementById("page-alerts"))!=null&&u.classList.contains("active")&&R()}),O(x.DEVICES_UPDATED,()=>{if(Ce(),rt(),xe(),Zt(),Be(),i.selectedId){Ae();const u=i.devices[i.selectedId];u&&i.navRoute.destLat&&Mt(u.lat,u.lng)}}),O(x.CONNECTION_CHANGE,({online:u})=>{Rt(u)}),O(x.SETTINGS_SAVED,()=>{var u;(u=document.getElementById("page-settings"))!=null&&u.classList.contains("active")&&j()})}function Wt(){fe("/assets",e=>{const t=e.val()||{},s=Date.now();Object.entries(t).forEach(([n,a])=>ht(n,a,s)),Ot(),T(x.DEVICES_UPDATED),T(x.CONNECTION_CHANGE,{online:!0})},e=>{console.error("[FB] assets error:",e),T(x.CONNECTION_CHANGE,{online:!1})}),fe("/alerts",e=>{var t;We(e),se(),(t=document.getElementById("page-alerts"))!=null&&t.classList.contains("active")&&R()},e=>{console.warn("[FB] alerts read failed — using local only:",e.code),te()}),H.ref(".info/connected").on("value",e=>{const t=e.val()===!0;T(x.CONNECTION_CHANGE,{online:t}),t&&i.isOffline?(i.isOffline=!1,xt()):t||(i.isOffline=!0)})}function Jt(){setInterval(Y,3e4),setInterval(()=>{var e;(e=document.getElementById("page-analytics"))!=null&&e.classList.contains("active")&&(ae(),Y())},5e3),setInterval(()=>{var e;i.selectedId&&!i.playback.playing&&((e=window._nextrackRouteRef)==null||e[i.selectedId])},2e3)}function Yt(e){var s,n,a;i.selectedId=e,Ce(),Ae(),ft(e),St(e);const t=i.devices[e];(s=document.getElementById("offline-banner"))==null||s.classList.toggle("show",(t==null?void 0:t.status)==="offline"),(n=document.getElementById("cached-banner"))==null||n.classList.toggle("show",(t==null?void 0:t.gpsCached)===!0&&(t==null?void 0:t.status)!=="offline"),xe(),(a=i.geofences[e])!=null&&a.isSet&&Le(e),T(x.DEVICE_SELECTED,{id:e})}function Xt(e){var t;document.querySelectorAll(".page").forEach(s=>s.classList.remove("active")),(t=document.getElementById(`page-${e}`))==null||t.classList.add("active"),Pt(e),Gt(e),e==="analytics"&&(ae(),Y()),e==="alerts"&&(i.alertUnread=0,Ee(),se(),R()),e==="settings"&&(j(),_e(),Be())}function Zt(){var e;(e=document.getElementById("page-analytics"))!=null&&e.classList.contains("active")&&ae()}function Be(){const e=ie();zt(e);const t=document.getElementById("offline-queue-count");t&&(t.textContent=`${e} records`)}
