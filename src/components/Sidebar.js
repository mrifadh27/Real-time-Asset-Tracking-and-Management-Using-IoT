/**
 * src/components/Sidebar.js
 * Renders the left sidebar: branding, navigation, device list, footer.
 */

import { state } from '../utils/state.js';

/** @type {Function|null} Callback when a nav item is clicked */
let _onNavigate = null;
/** @type {Function|null} Callback when a device is selected */
let _onDeviceSelect = null;
/** @type {Function|null} Callback when geofence button is clicked */
let _onGeofenceSet = null;

export const Sidebar = {
  /**
   * Render the sidebar into #app.
   * @param {{ onNavigate: Function, onDeviceSelect: Function, onGeofenceSet: Function }} callbacks
   * @returns {HTMLElement}
   */
  render({ onNavigate, onDeviceSelect, onGeofenceSet }) {
    _onNavigate     = onNavigate;
    _onDeviceSelect = onDeviceSelect;
    _onGeofenceSet  = onGeofenceSet;

    const aside = document.createElement('aside');
    aside.className = 'sidebar';
    aside.innerHTML = `
      <!-- Logo -->
      <div class="logo">
        <div class="logo-mark">📍</div>
        <div>
          <div class="brand">Nex<span>Track</span></div>
          <div class="brand-ver">v5.0 · PRODUCTION</div>
        </div>
      </div>

      <!-- Navigation -->
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

      <!-- Device List -->
      <div class="sec-label">Devices</div>
      <div class="device-list" id="device-list">
        <div class="empty-state" style="padding:24px 12px">
          <div class="icon" style="font-size:24px">📡</div>
          <p style="font-size:11px;text-align:center">Waiting for devices…</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="user-row">
          <div class="avatar">N</div>
          <div class="user-email" id="last-sync">⏱ --:--:--</div>
        </div>
      </div>
    `;

    // Nav click delegation
    aside.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page) _onNavigate?.(page, item);
      });
    });

    return aside;
  },

  /**
   * Refresh the device list in the sidebar.
   */
  updateDeviceList() {
    const el   = document.getElementById('device-list');
    if (!el) return;
    const devs = Object.values(state.devices);

    if (!devs.length) {
      el.innerHTML = `
        <div class="empty-state" style="padding:24px 12px">
          <div class="icon" style="font-size:24px">📡</div>
          <p style="font-size:11px;text-align:center">Waiting for devices…</p>
        </div>`;
      return;
    }

    el.innerHTML = devs.map(d => `
      <div class="dev-item${state.selectedId === d.id ? ' selected' : ''}"
           data-device-id="${d.id}">
        <div class="dev-dot ${d.status}"></div>
        <div class="dev-info">
          <div class="dev-name">${d.name}</div>
          <div class="dev-sub">${d.speed} km/h · ${d.status}</div>
        </div>
        <button class="dev-gf-btn" data-gf-id="${d.id}" title="Set geofence">📐</button>
      </div>`).join('');

    // Events
    el.querySelectorAll('.dev-item').forEach(item => {
      item.addEventListener('click', () => _onDeviceSelect?.(item.dataset.deviceId));
    });
    el.querySelectorAll('.dev-gf-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        _onDeviceSelect?.(btn.dataset.gfId);
        _onGeofenceSet?.(btn.dataset.gfId);
      });
    });

    // Update stat
    const online = devs.filter(d => d.status === 'online').length;
    const statEl = document.getElementById('stat-devices');
    if (statEl) statEl.textContent = online;
  },

  /**
   * Update the alert badge count.
   */
  updateAlertBadge() {
    const badge = document.getElementById('alert-badge');
    if (!badge) return;
    const count = state.alertUnread;
    badge.style.display = count > 0 ? 'inline' : 'none';
    badge.textContent   = count > 9 ? '9+' : count;
  },

  /**
   * Set the last-sync timestamp.
   */
  updateSyncTime() {
    const el = document.getElementById('last-sync');
    if (el) el.textContent = '⏱ ' + new Date().toLocaleTimeString();
  },

  /**
   * Highlight the active nav item.
   * @param {string} page
   */
  setActivePage(page) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${page}`)?.classList.add('active');
  },
};
