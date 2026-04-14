/**
 * VECTOR — Topbar UI Module  (src/ui/topbar.js)
 */

// ─── Constants ────────────────────────────────────────────────────────────────
const LOGOUT_BTN_ID = 'topbar-logout-btn';

const PAGE_META = {
  dashboard: ['Live Map',     'Vehicle Embedded Communication Tracking Optimization & Reporting System'],
  analytics: ['Analytics',    'Performance metrics & advanced insights'],
  alerts:    ['Alert Center', 'Unified incident monitoring & response'],
  settings:  ['Settings',     'VECTOR platform configuration'],
};

// ─── Connection / Title / Pill helpers (called from main.js) ─────────────────
export function setConnectionStatus(online) {
  const dot = document.getElementById('fb-dot');
  const txt = document.getElementById('fb-status');
  if (dot) dot.className   = online ? 'dot' : 'dot offline-dot';
  if (txt) txt.textContent = online ? 'Connected' : 'Offline';
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

// ─── Init ─────────────────────────────────────────────────────────────────────
/**
 * @param {Object}   [options]
 * @param {Function} [options.onLogout] - async callback fired when user clicks Sign Out
 */
export function initTopbar(options = {}) {
  const { onLogout } = options;

  // Theme button
  document.getElementById('btn-theme')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vector:toggleTheme'));
  });

  // Logout is handled by the sidebar Admin Profile section.
  // Topbar logout button intentionally disabled to avoid duplicate logout UI.
  // (onLogout callback kept in signature for backward compatibility)
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT BUTTON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates and appends the logout button to the topbar.
 * Skips injection if the button already exists (idempotent).
 *
 * @param {Function} onLogout
 */
function injectLogoutButton(onLogout) {
  // Don't inject twice
  if (document.getElementById(LOGOUT_BTN_ID)) return;

  // Target the topbar action area — update selector to match your markup
  // Common selectors: '#topbar-actions', '.topbar-right', '.topbar__actions'
  const actionsContainer =
    document.getElementById('topbar-actions') ||
    document.querySelector('.topbar-right') ||
    document.querySelector('.topbar__actions') ||
    document.querySelector('.topbar-actions');

  if (!actionsContainer) {
    console.warn('[VECTOR] Topbar: could not find actions container. Logout button not injected.');
    return;
  }

  const btn = createLogoutButton();

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.classList.add('loading');
    try {
      await onLogout();
    } catch (err) {
      console.error('[VECTOR] Logout error:', err);
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  });

  actionsContainer.appendChild(btn);
  injectLogoutStyles();
}

/**
 * Builds the logout button DOM element.
 * Styled to match existing VECTOR topbar icon-buttons.
 */
function createLogoutButton() {
  const btn = document.createElement('button');
  btn.id = LOGOUT_BTN_ID;
  btn.className = 'topbar-btn topbar-logout-btn';
  btn.type = 'button';
  btn.title = 'Sign Out';
  btn.setAttribute('aria-label', 'Sign Out');

  btn.innerHTML = `
    <span class="topbar-logout-icon" aria-hidden="true">
      ${LOGOUT_ICON_SVG}
    </span>
    <span class="topbar-logout-label">Sign Out</span>
    <span class="topbar-logout-spinner" aria-hidden="true"></span>
  `;

  return btn;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — injected once into <head> so no extra CSS file is needed
// ─────────────────────────────────────────────────────────────────────────────

let _stylesInjected = false;

function injectLogoutStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    /* ── VECTOR Topbar Logout Button ───────────────────────────────────── */
    .topbar-logout-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      height: 34px;
      padding: 0 0.875rem;
      border: 1px solid #1E2D45;
      border-radius: 8px;
      background: transparent;
      color: #7A8FAD;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition:
        color 0.2s ease,
        border-color 0.2s ease,
        background 0.2s ease;
      position: relative;
      white-space: nowrap;
    }

    .topbar-logout-btn:hover:not(:disabled) {
      color: #FF3B5C;
      border-color: rgba(255, 59, 92, 0.4);
      background: rgba(255, 59, 92, 0.07);
    }

    .topbar-logout-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .topbar-logout-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }

    .topbar-logout-icon svg {
      width: 15px;
      height: 15px;
    }

    /* Spinner (shown while logout is in progress) */
    .topbar-logout-spinner {
      display: none;
      width: 13px;
      height: 13px;
      border: 2px solid rgba(255, 59, 92, 0.25);
      border-top-color: #FF3B5C;
      border-radius: 50%;
      animation: topbarSpinAnim 0.6s linear infinite;
    }

    .topbar-logout-btn.loading .topbar-logout-icon,
    .topbar-logout-btn.loading .topbar-logout-label {
      opacity: 0;
    }

    .topbar-logout-btn.loading .topbar-logout-spinner {
      display: block;
      position: absolute;
    }

    @keyframes topbarSpinAnim {
      to { transform: rotate(360deg); }
    }

    /* On very small screens, hide the text label */
    @media (max-width: 480px) {
      .topbar-logout-label {
        display: none;
      }
      .topbar-logout-btn {
        padding: 0 0.6rem;
      }
    }
  `;

  document.head.appendChild(style);
}

// ─── SVG Icon ─────────────────────────────────────────────────────────────────
const LOGOUT_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
  <polyline points="16 17 21 12 16 7"/>
  <line x1="21" y1="12" x2="9" y2="12"/>
</svg>`;
