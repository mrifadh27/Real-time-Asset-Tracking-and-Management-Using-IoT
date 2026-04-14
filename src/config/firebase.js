/**
 * VECTOR — Firebase Configuration
 * Uses the Firebase compat SDK loaded via CDN in index.html.
 */

// ─── CDN Global Bridge ────────────────────────────────────────────────────────
// Firebase is loaded via <script> CDN tags in index.html as window.firebase.
// Declaring it here prevents Vite/esbuild "not declared" errors.
/* global firebase */
const firebase = window.firebase; // eslint-disable-line no-undef

// ─── Firebase Config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// ─── Initialize ───────────────────────────────────────────────────────────────
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ─── Service Exports ──────────────────────────────────────────────────────────
export const db   = firebase.database();
export const auth = firebase.auth();
export { firebase };

// ─── Database Helpers (used by modules) ──────────────────────────────────────

/**
 * batchUpdate — write multiple key/value pairs atomically.
 * Used by devices.js for offline queue sync.
 * @param {string} path - e.g. '/offline_data'
 * @param {Object} data - flat { key: value } object
 */
export function batchUpdate(path, data) {
  return db.ref(path).update(data);
}

/**
 * pushRecord — push a new record to a list path (auto-generates key).
 * Used by alerts.js to write alerts to /alerts.
 * @param {string} path - e.g. '/alerts'
 * @param {Object} data - the record object
 */
export function pushRecord(path, data) {
  return db.ref(path).push(data);
}
