/**
 * src/utils/toast.js
 * Lightweight toast notification system.
 */

const DURATION = 4000;

/**
 * Show a toast notification.
 * @param {'info'|'success'|'warning'|'danger'} type
 * @param {string} message
 */
export function showToast(type, message) {
  const container = document.getElementById('toasts');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
  el.textContent = message;

  container.appendChild(el);

  const dismiss = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = '.3s ease';
    setTimeout(() => el.remove(), 300);
  };

  // Auto-dismiss
  const timeout = setTimeout(dismiss, DURATION);

  // Click to dismiss early
  el.addEventListener('click', () => {
    clearTimeout(timeout);
    dismiss();
  });
}
