/**
 * src/ui/sidebar.js
 * Renders and updates the sidebar: nav + device list.
 */

import { S }    from '../utils/state.js';
import { emit, EV } from '../utils/events.js';

export function updateDeviceList() {
  const el   = document.getElementById('device-list');
  const devs = Object.values(S.devices);
  if (!el) return;

  if (!devs.length) {
    el.innerHTML = `<div class="empty-state" style="padding:24px 12px">
      <div class="icon" style="font-size:24px">📡</div>
      <p style="font-size:11px;text-align:center">Waiting for devices…</p>
    </div>`;
    return;
  }

  el.innerHTML = devs.map(d => `
    <div class="dev-item${S.selectedId === d.id ? ' selected' : ''}"
         data-id="${d.id}">
      <div class="dev-dot ${d.status}"></div>
      <div class="dev-info">
        <div class="dev-name">${d.name}</div>
        <div class="dev-sub">${d.speed} km/h · ${d.status}</div>
      </div>
      <button class="dev-gf-btn" data-gf="${d.id}" title="Set geofence">📐</button>
    </div>`).join('');

  /* Events */
  el.querySelectorAll('.dev-item').forEach(item => {
    item.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('vector:selectDevice', { detail:{ id: item.dataset.id } }));
    });
  });
  el.querySelectorAll('.dev-gf-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('vector:selectDevice', { detail:{ id: btn.dataset.gf } }));
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('vector:startGeofenceDraw', { detail:{ id: btn.dataset.gf } }));
      }, 50);
    });
  });
}

export function setSyncTime() {
  const el = document.getElementById('last-sync');
  if (el) el.textContent = '⏱ ' + new Date().toLocaleTimeString();
}

export function setActivePage(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`nav-${page}`)?.classList.add('active');
}
