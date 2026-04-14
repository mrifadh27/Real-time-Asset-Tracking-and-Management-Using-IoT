/**
 * VECTOR — Auth Module
 * Handles Firebase Email/Password authentication, session persistence,
 * login UI logic, and rate-limiting (max 5 attempts, 30s lockout).
 *
 * FIXES (BUG 1 — Login Validation):
 *  ✅ Real-time field-level validation on email and password inputs
 *  ✅ Inline per-field error messages (red text under each field)
 *  ✅ Submit button disabled until both fields pass validation
 *  ✅ Password minimum 6 characters enforced before Firebase call
 *  ✅ Lockout countdown display ("Try again in 28s…") updating every second
 *  ✅ Whitespace trimmed from email before submit (already done, kept)
 *  ✅ Double-submit prevented (button disabled while in-flight, already done, kept)
 *  ✅ Specific per-error-code messages (already done, kept)
 */

/* global firebase */
const firebase = window.firebase;

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 30_000; // 30 seconds

// ─── State ────────────────────────────────────────────────────────────────────
let _attemptCount      = 0;
let _lockoutTimer      = null;
let _lockoutEnd        = 0;
let _onLoginSuccess    = null;
let _onLogout          = null;
let _countdownInterval = null;

// ─── DOM Helpers ──────────────────────────────────────────────────────────────
const el = (id) => document.getElementById(id);

// ─── Auth Reference ───────────────────────────────────────────────────────────
function getAuth() {
  return firebase.auth();
}

// ─── Session Persistence ──────────────────────────────────────────────────────
export async function initAuthPersistence() {
  await getAuth().setPersistence('local');
}

// ─── Auth State Observer ─────────────────────────────────────────────────────
export function watchAuthState(onLogin, onLogoutCb) {
  _onLoginSuccess = onLogin;
  _onLogout       = onLogoutCb;

  return new Promise((resolve) => {
    let resolved = false;
    getAuth().onAuthStateChanged((user) => {
      if (!resolved) { resolved = true; resolve(user); }
      if (user) { _onLoginSuccess && _onLoginSuccess(user); }
      else      { _onLogout       && _onLogout(); }
    });
  });
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  if (_lockoutEnd && Date.now() < _lockoutEnd) {
    const remaining = Math.ceil((_lockoutEnd - Date.now()) / 1000);
    throw new AuthError(`Too many failed attempts. Try again in ${remaining}s.`, 'LOCKED');
  }

  try {
    const cred = await getAuth().signInWithEmailAndPassword(email, password);
    _attemptCount = 0;
    _lockoutEnd   = 0;
    return cred.user;
  } catch (err) {
    _attemptCount++;
    if (_attemptCount >= MAX_ATTEMPTS) {
      _lockoutEnd = Date.now() + LOCKOUT_MS;
      clearTimeout(_lockoutTimer);
      _lockoutTimer = setTimeout(() => { _attemptCount = 0; _lockoutEnd = 0; }, LOCKOUT_MS);
      throw new AuthError('Too many failed attempts. Locked out for 30 seconds.', 'LOCKED');
    }
    throw new AuthError(friendlyMessage(err.code), err.code);
  }
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut() {
  await getAuth().signOut();
}

// ─── Current User ─────────────────────────────────────────────────────────────
export function getCurrentUser() {
  return getAuth().currentUser;
}

// ─── Error Class ──────────────────────────────────────────────────────────────
class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// ─── Friendly Error Messages ──────────────────────────────────────────────────
function friendlyMessage(code) {
  switch (code) {
    case 'auth/user-not-found':      return 'No account found with this email.';
    case 'auth/wrong-password':      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':  return 'Invalid email or password.';
    case 'auth/invalid-email':       return 'Please enter a valid email address.';
    case 'auth/user-disabled':       return 'This account has been disabled.';
    case 'auth/network-request-failed': return 'Network error — check your connection.';
    case 'auth/too-many-requests':   return 'Too many attempts. Please wait a moment.';
    default:                         return 'Login failed. Please try again.';
  }
}

// ─── Email Validator ──────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Login UI Controller ──────────────────────────────────────────────────────
export function initLoginUI(onSuccess) {
  const form       = el('login-form');
  const emailInput = el('login-email');
  const passInput  = el('login-password');
  const toggleBtn  = el('toggle-password');
  const submitBtn  = el('login-submit');
  const errorBox   = el('login-error');
  const errorText  = el('login-error-text');
  const spinner    = el('login-spinner');
  const btnText    = el('login-btn-text');

  if (!form) return; // login page not in DOM

  // ── Inject inline field-error containers ──────────────────────────────────
  // These go just below each .login-input-wrap so errors appear under the field.
  const emailWrap = emailInput?.closest('.login-field');
  const passWrap  = passInput?.closest('.login-field');

  let emailErrEl = document.getElementById('email-field-error');
  if (!emailErrEl && emailWrap) {
    emailErrEl = document.createElement('div');
    emailErrEl.id        = 'email-field-error';
    emailErrEl.className = 'login-field-error';
    emailWrap.appendChild(emailErrEl);
  }

  let passErrEl = document.getElementById('pass-field-error');
  if (!passErrEl && passWrap) {
    passErrEl = document.createElement('div');
    passErrEl.id        = 'pass-field-error';
    passErrEl.className = 'login-field-error';
    passWrap.appendChild(passErrEl);
  }

  // Inject minimal CSS for field errors (once)
  if (!document.getElementById('login-field-error-styles')) {
    const style = document.createElement('style');
    style.id = 'login-field-error-styles';
    style.textContent = `
      .login-field-error {
        min-height: 0;
        max-height: 0;
        overflow: hidden;
        font-size: 11.5px;
        color: #FF3B5C;
        margin-top: 4px;
        padding: 0 2px;
        transition: max-height 0.2s ease, margin-top 0.2s ease;
        line-height: 1.4;
      }
      .login-field-error.visible {
        max-height: 40px;
        margin-top: 6px;
      }
      .login-input.invalid {
        border-color: #FF3B5C !important;
        box-shadow: 0 0 0 2px rgba(255,59,92,0.15) !important;
      }
      .login-input.valid {
        border-color: #00D97E !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Real-time validation ──────────────────────────────────────────────────

  function validateEmail() {
    const val = emailInput.value.trim();
    if (!val) {
      _setFieldError(emailInput, emailErrEl, 'Email is required.');
      return false;
    }
    if (!isValidEmail(val)) {
      _setFieldError(emailInput, emailErrEl, 'Please enter a valid email address.');
      return false;
    }
    _clearFieldError(emailInput, emailErrEl);
    return true;
  }

  function validatePassword() {
    const val = passInput.value;
    if (!val) {
      _setFieldError(passInput, passErrEl, 'Password is required.');
      return false;
    }
    if (val.length < 6) {
      _setFieldError(passInput, passErrEl, 'Password must be at least 6 characters.');
      return false;
    }
    _clearFieldError(passInput, passErrEl);
    return true;
  }

  function _updateSubmitState() {
    // Disable submit if locked out OR if either field is invalid
    const locked = _lockoutEnd && Date.now() < _lockoutEnd;
    if (locked) { submitBtn.disabled = true; return; }
    const emailOk = emailInput.value.trim() && isValidEmail(emailInput.value.trim());
    const passOk  = passInput.value && passInput.value.length >= 6;
    submitBtn.disabled = !(emailOk && passOk);
  }

  // Initial state — disable submit until valid
  submitBtn.disabled = true;

  emailInput.addEventListener('input', () => {
    if (emailInput.value.trim().length > 0) validateEmail();
    else _clearFieldError(emailInput, emailErrEl);
    _updateSubmitState();
  });
  emailInput.addEventListener('blur', () => {
    if (emailInput.value.trim()) validateEmail();
    _updateSubmitState();
  });

  passInput.addEventListener('input', () => {
    if (passInput.value.length > 0) validatePassword();
    else _clearFieldError(passInput, passErrEl);
    _updateSubmitState();
  });
  passInput.addEventListener('blur', () => {
    if (passInput.value) validatePassword();
    _updateSubmitState();
  });

  // ── Password visibility toggle ─────────────────────────────────────────────
  toggleBtn?.addEventListener('click', () => {
    const isText   = passInput.type === 'text';
    passInput.type = isText ? 'password' : 'text';
    toggleBtn.innerHTML = isText ? EYE_ICON : EYE_OFF_ICON;
    toggleBtn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
  });

  // ── Form submission ────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    // Check lockout first
    if (_lockoutEnd && Date.now() < _lockoutEnd) {
      const remaining = Math.ceil((_lockoutEnd - Date.now()) / 1000);
      showError(`Too many failed attempts. Try again in ${remaining}s…`);
      _startCountdown(submitBtn, errorBox, errorText);
      return;
    }

    const emailOk = validateEmail();
    const passOk  = validatePassword();
    if (!emailOk || !passOk) return;

    const email    = emailInput.value.trim();
    const password = passInput.value;

    setLoading(true);
    try {
      const user = await signIn(email, password);
      clearInterval(_countdownInterval);
      _countdownInterval = null;
      onSuccess && onSuccess(user);
    } catch (err) {
      if (err.code === 'LOCKED') {
        _startCountdown(submitBtn, errorBox, errorText);
      } else {
        showError(err.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
      _updateSubmitState();
    }
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  function setLoading(loading) {
    submitBtn.disabled      = loading;
    if (spinner) spinner.hidden = !loading;
    if (btnText) btnText.textContent = loading ? 'Signing in…' : 'Sign In';
    submitBtn.classList.toggle('loading', loading);
  }

  function showError(msg) {
    if (errorText) errorText.textContent = msg;
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.classList.add('shake');
      setTimeout(() => errorBox.classList.remove('shake'), 500);
    }
  }

  function clearError() {
    if (errorBox)  errorBox.hidden = true;
    if (errorText) errorText.textContent = '';
  }
}

// ─── Countdown Timer (lockout UI) ─────────────────────────────────────────────
function _startCountdown(submitBtn, errorBox, errorText) {
  clearInterval(_countdownInterval);
  _countdownInterval = null;

  function tick() {
    if (!_lockoutEnd) { clearInterval(_countdownInterval); return; }
    const remaining = Math.ceil((_lockoutEnd - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(_countdownInterval);
      _countdownInterval = null;
      if (errorBox)  errorBox.hidden = true;
      if (errorText) errorText.textContent = '';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
      return;
    }
    if (errorText) errorText.textContent = `Too many failed attempts. Try again in ${remaining}s…`;
    if (errorBox)  errorBox.hidden = false;
    if (submitBtn) submitBtn.disabled = true;
  }

  tick();
  _countdownInterval = setInterval(tick, 1000);
}

// ─── Field Error Helpers ───────────────────────────────────────────────────────
function _setFieldError(inputEl, errorEl, msg) {
  if (!inputEl || !errorEl) return;
  inputEl.classList.add('invalid');
  inputEl.classList.remove('valid');
  errorEl.textContent = msg;
  errorEl.classList.add('visible');
}

function _clearFieldError(inputEl, errorEl) {
  if (!inputEl || !errorEl) return;
  inputEl.classList.remove('invalid');
  inputEl.classList.add('valid');
  errorEl.textContent = '';
  errorEl.classList.remove('visible');
}

// ─── Login / Dashboard Visibility ─────────────────────────────────────────────
export function showLoginPage() {
  const loginPage = el('login-page');
  const appPage   = el('app');
  if (loginPage) loginPage.hidden = false;
  if (appPage)   appPage.hidden   = true;
}

export function showDashboard() {
  const loginPage = el('login-page');
  const appPage   = el('app');
  if (loginPage) loginPage.hidden = true;
  if (appPage)   appPage.hidden   = false;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const EYE_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`;

const EYE_OFF_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
           a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4
           c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07
           a3 3 0 1 1-4.24-4.24"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
</svg>`;
