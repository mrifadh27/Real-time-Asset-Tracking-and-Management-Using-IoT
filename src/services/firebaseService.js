/**
 * src/services/firebaseService.js
 * Initialises Firebase and exposes the Realtime Database reference.
 * All Firebase interaction is centralised here.
 */

/** @type {firebase.database.Database} */
let db = null;

const FB_CONFIG = {
  apiKey:      'AIzaSyAZiSKitF5KYCam6Lzmdc4pPlczLUQmQ_A',
  authDomain:  'realtime-asset-tracking-e00df.firebaseapp.com',
  databaseURL: 'https://realtime-asset-tracking-e00df-default-rtdb.asia-southeast1.firebasedatabase.app/',
  projectId:   'realtime-asset-tracking-e00df',
};

/**
 * Initialise Firebase (idempotent — safe to call multiple times).
 * @returns {firebase.database.Database}
 */
export function initFirebase() {
  if (db) return db;

  if (!firebase.apps?.length) {
    firebase.initializeApp(FB_CONFIG);
  }

  db = firebase.database();
  return db;
}

/**
 * Get the database reference (must call initFirebase first).
 * @returns {firebase.database.Database}
 */
export function getDb() {
  if (!db) throw new Error('Firebase not initialised. Call initFirebase() first.');
  return db;
}

/**
 * Write a record to Firebase (wraps push for simpler call sites).
 * @param {string} path
 * @param {Object} data
 * @returns {Promise<void>}
 */
export async function pushRecord(path, data) {
  return getDb().ref(path).push(data);
}

/**
 * Batch-update a path.
 * @param {string} path
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function batchUpdate(path, updates) {
  return getDb().ref(path).update(updates);
}

/**
 * Subscribe to a real-time path.
 * @param {string} path
 * @param {Function} onValue
 * @param {Function} onError
 * @returns {Function} unsubscribe
 */
export function subscribe(path, onValue, onError) {
  const ref = getDb().ref(path);
  ref.on('value', onValue, onError);
  return () => ref.off('value', onValue);
}
