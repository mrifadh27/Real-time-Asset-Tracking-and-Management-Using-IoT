/**
 * VECTOR — Firebase Configuration
 * Uses the Firebase compat SDK loaded via CDN in index.html.
 */

// ─── CDN Global Bridge ────────────────────────────────────────────────────────
// Firebase is loaded via <script> CDN tags in index.html as window.firebase.
// Declaring it here prevents Vite/esbuild "not declared" errors.
/* global firebase */
const firebase = window.firebase; // eslint-disable-line no-undef

// src/config/firebase.js  — REPLACE THIS ENTIRE BLOCK
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.REGION.firebasedatabase.app",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
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
