/**
 * src/ui/sidebar.js
 * Sidebar: nav, device list, and Admin Profile + Logout footer.
 */

import { S }          from '../utils/state.js';
import { emit, EV }   from '../utils/events.js';
import { showToast }  from '../utils/toast.js';
import { signOut }    from '../auth/auth.js';

// ─── Device List ──────────────────────────────────────────────────────────────
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
    <div class="dev-item${S.selectedId === d.id ? ' selected' : ''}" data-id="${d.id}">
      <div class="dev-dot ${d.status}"></div>
      <div class="dev-info">
        <div class="dev-name">${d.name}</div>
        <div class="dev-sub">${d.speed} km/h · ${d.status}</div>
      </div>
      <button class="dev-gf-btn" data-gf="${d.id}" title="Set geofence">📐</button>
    </div>`).join('');

  el.querySelectorAll('.dev-item').forEach(item => {
    item.addEventListener('click', () =>
      document.dispatchEvent(new CustomEvent('vector:selectDevice', { detail: { id: item.dataset.id } }))
    );
  });
  el.querySelectorAll('.dev-gf-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('vector:selectDevice', { detail: { id: btn.dataset.gf } }));
      setTimeout(() =>
        document.dispatchEvent(new CustomEvent('vector:startGeofenceDraw', { detail: { id: btn.dataset.gf } }))
      , 50);
    });
  });
}

// ─── Sync Time ────────────────────────────────────────────────────────────────
export function setSyncTime() {
  const el = document.getElementById('last-sync');
  if (el) el.textContent = '⏱ ' + new Date().toLocaleTimeString();
}

// ─── Active Nav Page ──────────────────────────────────────────────────────────
export function setActivePage(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`nav-${page}`)?.classList.add('active');
}

// ─── Initials Helper ──────────────────────────────────────────────────────────
function getInitials(email) {
  if (!email) return 'AD';
  const local = email.split('@')[0];           // e.g. "mrifadh27"
  const letters = local.replace(/[^a-zA-Z]/g, ''); // strip numbers
  if (letters.length >= 2) {
    return (letters[0] + letters[1]).toUpperCase();
  }
  return letters.slice(0, 2).toUpperCase() || 'AD';
}

// ─── Admin Profile Init ───────────────────────────────────────────────────────
/**
 * Populates the sidebar footer with the logged-in user's info.
 * Call this from main.js right after authentication is confirmed.
 * @param {Object} user - Firebase Auth currentUser object
 */
export function initAdminProfile(user) {
  const email    = user?.email    || 'admin@vector.app';
  const initials = getInitials(email);

  const avatarEl   = document.getElementById('sb-avatar-initials');
  const emailEl    = document.getElementById('sb-user-email');

  if (avatarEl)  avatarEl.textContent  = initials;
  if (emailEl)   emailEl.textContent   = email;

  // Wire up Sign Out button
  const signOutBtn = document.getElementById('sb-signout-btn');
  if (signOutBtn && !signOutBtn.dataset.wired) {
    signOutBtn.dataset.wired = '1';
    signOutBtn.addEventListener('click', _handleSignOut);
  }
}

// ─── Connection Status Pill ───────────────────────────────────────────────────
/**
 * Updates the 🟢/🔴 Online/Offline pill in the profile section.
 * Call this from main.js when Firebase .info/connected changes.
 * @param {boolean} online
 */
export function updateConnectionStatus(online) {
  const dot  = document.getElementById('sb-status-dot');
  const text = document.getElementById('sb-status-text');
  if (!dot || !text) return;

  if (online) {
    dot.style.background  = '#00D97E';
    dot.style.boxShadow   = '0 0 6px rgba(0,217,126,0.5)';
    text.textContent      = 'Online';
    text.style.color      = '#00D97E';
  } else {
    dot.style.background  = '#FF3B5C';
    dot.style.boxShadow   = '0 0 6px rgba(255,59,92,0.4)';
    text.textContent      = 'Offline';
    text.style.color      = '#FF3B5C';
  }
}

// ─── Sign Out Handler ─────────────────────────────────────────────────────────
async function _handleSignOut() {
  const btn      = document.getElementById('sb-signout-btn');
  const btnText  = document.getElementById('sb-signout-text');
  const spinner  = document.getElementById('sb-signout-spinner');

  if (!btn) return;

  // Loading state
  btn.disabled          = true;
  if (btnText)  btnText.textContent   = 'Signing out…';
  if (spinner)  spinner.hidden        = false;

  try {
    await signOut();
    // onAuthStateChanged fires → onSignedOut() in main.js → showLoginPage()
  } catch (err) {
    console.error('[VECTOR] Sign out failed:', err);
    showToast('error', 'Logout failed — try again');
    // Reset button
    btn.disabled          = false;
    if (btnText)  btnText.textContent   = 'Sign Out';
    if (spinner)  spinner.hidden        = true;
  }
}
