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
  apiKey:            "AIzaSyAZiSKitF5KYCam6Lzmdc4pPlczlUQmQ_A",
  authDomain:        "realtime-asset-tracking-e00df.firebaseapp.com",
  databaseURL:       "https://realtime-asset-tracking-e00df-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "realtime-asset-tracking-e00df",
  storageBucket:     "realtime-asset-tracking-e00df.firebasestorage.app",
  messagingSenderId: "31947578320",
  appId:             "1:31947578320:web:79d7290b0934ded454b7d5",
  measurementId:     "G-MG7YJTME6B"
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
