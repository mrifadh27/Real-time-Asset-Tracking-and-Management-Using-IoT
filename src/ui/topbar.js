/**
 * src/ui/topbar.js
 * Topbar connection status, title, offline pill.
 */

const PAGE_META = {
  dashboard: ['Live Map',     'Vehicle Embedded Communication Tracking Optimization & Reporting System'],
  analytics: ['Analytics',    'Performance metrics & advanced insights'],
  alerts:    ['Alert Center', 'Unified incident monitoring & response'],
  settings:  ['Settings',     'VECTOR platform configuration'],
};

export function setConnectionStatus(online) {
  const dot = document.getElementById('fb-dot');
  const txt = document.getElementById('fb-status');
  if (dot) dot.className    = online ? 'dot' : 'dot offline-dot';
  if (txt) txt.textContent  = online ? 'Connected' : 'Offline';
}

export function setPageTitle(page) {
  const [title, sub] = PAGE_META[page] || ['', ''];
  const t = document.getElementById('tb-title');
  const s = document.getElementById('tb-sub');
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
}

export function updateOfflinePill(count) {
  const pill  = document.getElementById('offline-store-pill');
  const badge = document.getElementById('offline-store-count');
  if (pill)  pill.classList.toggle('show', count > 0);
  if (badge) badge.textContent = count;
}
