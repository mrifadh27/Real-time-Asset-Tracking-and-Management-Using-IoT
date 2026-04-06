/**
 * src/components/Topbar.js
 * Renders the top navigation bar.
 */

export const Topbar = {
  /**
   * @param {{ onToggleTheme: Function }} callbacks
   * @returns {HTMLElement}
   */
  render({ onToggleTheme }) {
    const bar = document.createElement('div');
    bar.className = 'topbar';
    bar.innerHTML = `
      <div>
        <div class="tb-title" id="tb-title">Live Map</div>
        <div class="tb-sub"   id="tb-sub">Real-time asset tracking</div>
      </div>
      <div class="tb-space"></div>
      <div class="offline-store-pill" id="offline-store-pill">
        💾 <span id="offline-store-count">0</span> queued
      </div>
      <div class="status-pill">
        <div class="dot" id="fb-dot"></div>
        <span id="fb-status">Connecting…</span>
      </div>
      <button class="theme-btn" id="theme-btn">🌓 Theme</button>
    `;

    bar.querySelector('#theme-btn').addEventListener('click', onToggleTheme);
    return bar;
  },

  /**
   * Update the Firebase connection indicator.
   * @param {boolean} online
   */
  setConnectionStatus(online) {
    const dot    = document.getElementById('fb-dot');
    const status = document.getElementById('fb-status');
    if (dot)    dot.className = online ? 'dot' : 'dot offline-dot';
    if (status) status.textContent = online ? 'Connected' : 'Offline';
  },

  /**
   * Update page title and subtitle.
   * @param {string} title
   * @param {string} sub
   */
  setTitle(title, sub) {
    const t = document.getElementById('tb-title');
    const s = document.getElementById('tb-sub');
    if (t) t.textContent = title;
    if (s) s.textContent = sub;
  },

  /**
   * Update the offline queue pill.
   * @param {number} count
   */
  updateOfflinePill(count) {
    const pill  = document.getElementById('offline-store-pill');
    const badge = document.getElementById('offline-store-count');
    if (pill)  pill.classList.toggle('show', count > 0);
    if (badge) badge.textContent = count;
  },
};
