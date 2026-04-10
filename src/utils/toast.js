/**
 * src/utils/toast.js
 * Toast notification system.
 */

export function showToast(type, message, duration = 4500) {
  const container = document.getElementById('toasts');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);

  const dismiss = () => {
    el.style.opacity   = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = '.3s ease';
    setTimeout(() => el.remove(), 320);
  };

  const t = setTimeout(dismiss, duration);
  el.addEventListener('click', () => { clearTimeout(t); dismiss(); });
}
